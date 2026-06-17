/**
 * Supabase Edge Function — iCal feed for TaskFlow.
 *
 * Serves a read-only .ics calendar of the user's deadlines (assigned tasks +
 * their orgs' milestones) so they can subscribe from Google/Outlook Calendar.
 *
 * Auth model: calendar clients fetch anonymously, so the secret is the `token`
 * query param (a per-user uuid stored on profiles.calendar_token). The function
 * resolves it server-side via the SECURITY DEFINER RPC get_calendar_feed(),
 * called with the service-role key.
 *
 * Deploy (public endpoint — calendar clients send no JWT):
 *   supabase functions deploy calendar-feed --no-verify-jwt
 *
 * URL: {SUPABASE_URL}/functions/v1/calendar-feed?token=<uuid>
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Escape a string for an iCal text value (RFC 5545 §3.3.11). */
function escapeText(s: string): string {
  return (s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** "2026-06-15" → "20260615" */
function toICalDate(d: string): string {
  return d.slice(0, 10).replace(/-/g, '')
}

/** All-day DTEND is exclusive → next day. */
function nextDay(d: string): string {
  const dt = new Date(d + 'T00:00:00Z')
  dt.setUTCDate(dt.getUTCDate() + 1)
  return dt.toISOString().slice(0, 10).replace(/-/g, '')
}

function icsResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="taskflow.ics"',
      'Cache-Control': 'max-age=900',
    },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const params = new URL(req.url).searchParams
  const token = params.get('token') ?? ''
  const org = params.get('org') || null   // optional: scope the feed to one org
  if (!UUID_RE.test(token)) {
    return new Response('Invalid or missing token', { status: 400 })
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response('Service not configured', { status: 503 })
  }

  // Fetch events via the SECURITY DEFINER RPC (token validated inside the DB).
  let rows: Array<{ uid: string; summary: string; starts: string; kind: string; project_id: string }> = []
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_calendar_feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ p_token: token, p_org: org }),
    })
    if (!res.ok) {
      console.error(`get_calendar_feed failed: ${res.status} ${await res.text()}`)
      return new Response('Upstream error', { status: 502 })
    }
    rows = await res.json()
  } catch (err) {
    console.error('calendar-feed error:', err)
    return new Response('Internal error', { status: 500 })
  }

  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z' // YYYYMMDDTHHMMSSZ
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TaskFlow//Calendar Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:TaskFlow',
    'X-WR-CALDESC:TaskFlow deadlines',
  ]

  for (const r of rows) {
    if (!r?.starts) continue
    const isMs = r.kind === 'ms'
    const prefix = isMs ? '◆ ' : ''
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeText(r.uid)}@taskflow`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${toICalDate(r.starts)}`,
      `DTEND;VALUE=DATE:${nextDay(r.starts)}`,
      `SUMMARY:${escapeText(prefix + (r.summary ?? 'Untitled'))}`,
      `CATEGORIES:${isMs ? 'MILESTONE' : 'TASK'}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  // iCal requires CRLF line endings.
  return icsResponse(lines.join('\r\n') + '\r\n')
})
