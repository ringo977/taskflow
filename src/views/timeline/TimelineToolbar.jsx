import { useLang } from '@/i18n'
import { msToDs, ZOOM_STEPS } from './timelineUtils'

export default function TimelineToolbar({ zoomIdx, setZoomIdx, taskCount, minMs, maxMs, depCount, onTodayClick }) {
  const t = useLang()
  const zoomLabel = `${ZOOM_STEPS[zoomIdx]}×`

  return (
    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--bd3)', background: 'var(--bg1)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <span style={{ fontSize: 12, color: 'var(--tx3)' }}>Zoom</span>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', overflow: 'hidden' }}>
        <button disabled={zoomIdx === 0} onClick={() => setZoomIdx(i => Math.max(0, i - 1))}
          style={{ padding: '4px 10px', fontSize: 13, border: 'none', borderRight: '1px solid var(--bd3)', background: 'transparent', cursor: zoomIdx === 0 ? 'default' : 'pointer', color: zoomIdx === 0 ? 'var(--tx3)' : 'var(--tx1)', opacity: zoomIdx === 0 ? 0.4 : 1 }}>−</button>
        <span style={{ padding: '4px 10px', fontSize: 12, fontWeight: 500, color: 'var(--tx2)', minWidth: 32, textAlign: 'center', userSelect: 'none' }}>{zoomLabel}</span>
        <button disabled={zoomIdx === ZOOM_STEPS.length - 1} onClick={() => setZoomIdx(i => Math.min(ZOOM_STEPS.length - 1, i + 1))}
          style={{ padding: '4px 10px', fontSize: 13, border: 'none', borderLeft: '1px solid var(--bd3)', background: 'transparent', cursor: zoomIdx === ZOOM_STEPS.length - 1 ? 'default' : 'pointer', color: zoomIdx === ZOOM_STEPS.length - 1 ? 'var(--tx3)' : 'var(--tx1)', opacity: zoomIdx === ZOOM_STEPS.length - 1 ? 0.4 : 1 }}>+</button>
      </div>
      <span style={{ fontSize: 12, color: 'var(--tx3)', marginLeft: 8 }}>
        {taskCount} task · {msToDs(minMs + 7 * 86400000)} → {msToDs(maxMs - 14 * 86400000)}
      </span>
      {depCount > 0 && (
        <span style={{ fontSize: 11, color: 'var(--c-warning)', background: 'color-mix(in srgb, var(--c-warning) 12%, transparent)', padding: '2px 8px', borderRadius: 'var(--r1)' }}>
          {depCount} dep
        </span>
      )}
      <button onClick={onTodayClick}
        style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 12px', color: 'var(--c-brand)', borderColor: 'var(--c-brand)' }}>
        {t.today ?? 'Today'}
      </button>
    </div>
  )
}
