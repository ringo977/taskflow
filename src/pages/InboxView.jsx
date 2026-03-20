import { useLang } from '@/i18n'
import { useInbox } from '@/context/InboxCtx'
import Avatar from '@/components/Avatar'

const ICONS = {
  task_created:   { icon: '+',  color: 'var(--c-success)' },
  task_completed: { icon: '✓',  color: 'var(--c-success)' },
  task_reopened:  { icon: '↺',  color: 'var(--c-brand)' },
  task_updated:   { icon: '✎',  color: 'var(--c-brand)' },
  comment_added:  { icon: '✉',  color: 'var(--c-purple)' },
  dep_added:      { icon: '⊘',  color: 'var(--c-warning)' },
  dep_resolved:   { icon: '✓',  color: 'var(--c-success)' },
  project_created:{ icon: '◆',  color: 'var(--c-brand)' },
  ai_generated:   { icon: '✦',  color: 'var(--c-success)' },
}

function relativeTime(ts, lang) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return lang === 'it' ? 'ora' : 'just now' // kept inline — relativeTime has no access to t
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function InboxView({ onOpenTask, lang }) {
  const t = useLang()
  const { items, unread, markRead, markAllRead } = useInbox()

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--tx1)', letterSpacing: '-0.01em' }}>Inbox</div>
          {unread > 0 && <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{unread} {t.unreadLabel}</div>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} style={{ fontSize: 12, padding: '5px 12px', color: 'var(--c-brand)', borderColor: 'var(--c-brand)' }}>
            {t.markAllRead}
          </button>
        )}
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--tx3)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 14 }}>{t.noNotifications}</div>
        </div>
      )}

      {items.map(item => {
        const cfg = ICONS[item.type] ?? { icon: '•', color: 'var(--tx3)' }
        return (
          <div key={item.id}
            onClick={() => { markRead(item.id); if (item.taskId && onOpenTask) onOpenTask(item.taskId) }}
            className="row-interactive"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 14px', borderRadius: 'var(--r1)', cursor: item.taskId ? 'pointer' : 'default',
              borderBottom: '1px solid var(--bd3)',
              background: item.read ? 'transparent' : 'color-mix(in srgb, var(--c-brand) 4%, transparent)',
            }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: `color-mix(in srgb, ${cfg.color} 14%, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: cfg.color, fontWeight: 600,
            }}>
              {cfg.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--tx1)', lineHeight: 1.5 }}>
                {item.actor && <strong>{item.actor}</strong>}{item.actor ? ' ' : ''}{item.message}
              </div>
              {item.detail && <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail}</div>}
            </div>
            <span style={{ fontSize: 11, color: 'var(--tx3)', flexShrink: 0, marginTop: 2 }}>
              {relativeTime(item.timestamp, lang)}
            </span>
            {!item.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-brand)', flexShrink: 0, marginTop: 6 }} />}
          </div>
        )
      })}
    </div>
  )
}
