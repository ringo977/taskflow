/**
 * Personal iCal calendar feed.
 *
 * The user gets a secret URL (token-authenticated) they can subscribe to from
 * Google/Outlook Calendar. The token lives on profiles.calendar_token and is
 * created/rotated via SECURITY DEFINER RPCs (migration 048).
 */
import { supabase } from '../supabase'

/** Get-or-create the current user's calendar token. */
export async function ensureCalendarToken() {
  const { data, error } = await supabase.rpc('ensure_calendar_token')
  if (error) throw error
  return data
}

/** Rotate the token (revokes the previous URL). */
export async function rotateCalendarToken() {
  const { data, error } = await supabase.rpc('rotate_calendar_token')
  if (error) throw error
  return data
}

/** Build the public feed URL for a token. */
export function calendarFeedUrl(token) {
  const base = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  return `${base}/functions/v1/calendar-feed?token=${token}`
}
