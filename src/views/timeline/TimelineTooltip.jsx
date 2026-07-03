import { useLang } from '@/i18n'
import { fmtDate } from '@/utils/format'
import Avatar from '@/components/Avatar'
import { daysBetween } from './timelineUtils'

export default function TimelineTooltip({ hoverTask, hoverPos, lang, onUpd }) {
  const t = useLang()
  return (
    <div style={{
      position: 'fixed', left: Math.min(hoverPos.x + 12, window.innerWidth - 260), top: hoverPos.y + 16,
      background: 'var(--bg1)', border: '1px solid var(--bd3)', borderRadius: 'var(--r2)',
      padding: '10px 14px', fontSize: 12, zIndex: 100, pointerEvents: 'none',
      boxShadow: 'var(--shadow-md)', maxWidth: 250, animation: 'fadeIn 0.15s ease both',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--tx1)', marginBottom: 4, lineHeight: 1.4 }}>{hoverTask.title}</div>
      <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4 }}>
        {fmtDate(hoverTask.startDate ?? hoverTask.due, lang)} → {fmtDate(hoverTask.due, lang)}
        {hoverTask.startDate && hoverTask.due && (
          <span style={{ marginLeft: 6, color: 'var(--tx2)' }}>({daysBetween(hoverTask.startDate, hoverTask.due) + 1}d)</span>
        )}
      </div>
      {hoverTask.who?.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          {(Array.isArray(hoverTask.who) ? hoverTask.who : [hoverTask.who]).map(name => (
            <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Avatar name={name} size={14} />
              <span style={{ fontSize: 11, color: 'var(--tx2)' }}>{name}</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--tx3)' }}>
        {hoverTask.pri && <span style={{ textTransform: 'capitalize' }}>{hoverTask.pri}</span>}
        {hoverTask.subs?.length > 0 && <span>{hoverTask.subs.filter(s => s.done).length}/{hoverTask.subs.length} sub</span>}
        {hoverTask.deps?.length > 0 && <span>{hoverTask.deps.length} dep</span>}
      </div>
      {onUpd && <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 6, fontStyle: 'italic' }}>{t.dragToMove ?? 'Drag to move · edges to resize'}</div>}
    </div>
  )
}
