import { useState, useEffect, useRef, useMemo } from 'react'
import { useLang } from '@/i18n'
import Avatar from '@/components/Avatar'

/**
 * TimeTracker — per-task time tracking with start/stop timer and manual entry.
 * Time entries are stored in task.timeEntries JSONB array.
 *
 * Entry shape: { id, who, start, end, duration, note }
 *   - duration is in minutes
 *   - start/end are ISO date strings (for reference / display)
 */
export default function TimeTracker({ task, currentUser, onUpd, sectionTitle }) {
  const t = useLang()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entries = task.timeEntries ?? []
  const [running, setRunning] = useState(null)   // { startedAt: timestamp }
  const [elapsed, setElapsed] = useState(0)       // seconds
  const [showManual, setShowManual] = useState(false)
  const [manualH, setManualH] = useState('')
  const [manualM, setManualM] = useState('')
  const [manualNote, setManualNote] = useState('')
  const tickRef = useRef(null)

  // Tick the timer every second while running
  useEffect(() => {
    if (running) {
      tickRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - running.startedAt) / 1000))
      }, 1000)
    } else {
      clearInterval(tickRef.current)
    }
    return () => clearInterval(tickRef.current)
  }, [running])

  const startTimer = () => {
    setRunning({ startedAt: Date.now() })
    setElapsed(0)
  }

  const stopTimer = () => {
    if (!running) return
    const durationMin = Math.max(1, Math.round(elapsed / 60))
    const entry = {
      id: `te_${Date.now()}`,
      who: currentUser?.name ?? 'User',
      start: new Date(running.startedAt).toISOString(),
      end: new Date().toISOString(),
      duration: durationMin,
      note: '',
    }
    onUpd(task.id, { timeEntries: [...entries, entry] })
    setRunning(null)
    setElapsed(0)
  }

  const addManual = () => {
    const h = parseInt(manualH) || 0
    const m = parseInt(manualM) || 0
    const total = h * 60 + m
    if (total <= 0) return
    const entry = {
      id: `te_${Date.now()}`,
      who: currentUser?.name ?? 'User',
      start: new Date().toISOString(),
      end: new Date().toISOString(),
      duration: total,
      note: manualNote.trim(),
    }
    onUpd(task.id, { timeEntries: [...entries, entry] })
    setManualH(''); setManualM(''); setManualNote('')
    setShowManual(false)
  }

  const removeEntry = (id) => {
    onUpd(task.id, { timeEntries: entries.filter(e => e.id !== id) })
  }

  // Format helpers
  const fmtDuration = (mins) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const fmtTimer = (secs) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    const pad = n => String(n).padStart(2, '0')
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  }

  const totalMins = useMemo(() => entries.reduce((sum, e) => sum + (e.duration ?? 0), 0), [entries])

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={sectionTitle}>
          {t.timeTracking ?? 'Time tracking'}
          {totalMins > 0 && <span style={{ fontWeight: 400, marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>— {fmtDuration(totalMins)}</span>}
        </div>
      </div>

      {/* Timer controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {running ? (
          <>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-danger)', fontVariantNumeric: 'tabular-nums', minWidth: 60 }}>
              {fmtTimer(elapsed)}
            </span>
            <button onClick={stopTimer}
              style={{ fontSize: 12, padding: '4px 12px', background: 'var(--c-danger)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 500 }}>
              ■ {t.stopTimer ?? 'Stop'}
            </button>
          </>
        ) : (
          <>
            <button onClick={startTimer}
              style={{ fontSize: 12, padding: '4px 12px', background: 'var(--c-success)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 500 }}>
              ▶ {t.startTimer ?? 'Start'}
            </button>
            <button onClick={() => setShowManual(!showManual)}
              style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)40', borderRadius: 'var(--r1)', padding: '3px 8px', cursor: 'pointer' }}>
              + {t.addManual ?? 'Manual'}
            </button>
          </>
        )}
      </div>

      {/* Manual entry form */}
      {showManual && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <input type="number" min="0" max="999" value={manualH} onChange={e => setManualH(e.target.value)}
            placeholder="0" style={{ width: 44, fontSize: 12, padding: '4px 6px', textAlign: 'center' }} />
          <span style={{ fontSize: 11, color: 'var(--tx3)' }}>h</span>
          <input type="number" min="0" max="59" value={manualM} onChange={e => setManualM(e.target.value)}
            placeholder="0" style={{ width: 44, fontSize: 12, padding: '4px 6px', textAlign: 'center' }} />
          <span style={{ fontSize: 11, color: 'var(--tx3)' }}>m</span>
          <input value={manualNote} onChange={e => setManualNote(e.target.value)}
            placeholder={t.timeNote ?? 'Note (optional)'} style={{ flex: 1, fontSize: 12, padding: '4px 6px', minWidth: 80 }} />
          <button onClick={addManual}
            style={{ fontSize: 12, padding: '4px 10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer' }}>
            {t.add ?? 'Add'}
          </button>
        </div>
      )}

      {/* Entries list */}
      {entries.length > 0 && (
        <div style={{ maxHeight: 140, overflow: 'auto' }}>
          {[...entries].reverse().map(entry => (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--bd3)', fontSize: 12 }}>
              <Avatar name={entry.who} size={16} />
              <span style={{ fontWeight: 500, color: 'var(--tx2)', minWidth: 42 }}>{fmtDuration(entry.duration)}</span>
              {entry.note && <span style={{ color: 'var(--tx3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.note}</span>}
              {!entry.note && <span style={{ flex: 1 }} />}
              <span style={{ color: 'var(--tx3)', fontSize: 11, flexShrink: 0 }}>
                {new Date(entry.start).toLocaleDateString()}
              </span>
              <button onClick={() => removeEntry(entry.id)}
                style={{ border: 'none', background: 'transparent', color: 'var(--tx3)', cursor: 'pointer', fontSize: 13, padding: '1px 3px', lineHeight: 1 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && !running && !showManual && (
        <div style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>
          {t.noTimeEntries ?? 'No time logged yet.'}
        </div>
      )}
    </div>
  )
}
