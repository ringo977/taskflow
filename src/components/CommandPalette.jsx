import { useState, useEffect, useRef, useMemo } from 'react'
import { useLang } from '@/i18n'

export default function CommandPalette({ tasks, projects, onOpenTask, onOpenProject, onNavigate, onClose }) {
  const t = useLang()
  const [query, setQuery] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const results = useMemo(() => {
    const items = []
    const q = query.toLowerCase().trim()
    if (!q) {
      items.push({ type: 'nav', id: 'home', label: 'Home', icon: '⌂', action: () => onNavigate('home') })
      items.push({ type: 'nav', id: 'mytasks', label: t.myTasks, icon: '✓', action: () => onNavigate('mytasks') })
      items.push({ type: 'nav', id: 'inbox', label: 'Inbox', icon: '✉', action: () => onNavigate('inbox') })
      items.push({ type: 'nav', id: 'people', label: t.people, icon: '👥', action: () => onNavigate('people') })
      for (const p of projects.slice(0, 5)) {
        items.push({ type: 'project', id: p.id, label: p.name, color: p.color, action: () => onOpenProject(p.id) })
      }
      return items
    }

    for (const p of projects) {
      if (p.name.toLowerCase().includes(q)) {
        items.push({ type: 'project', id: p.id, label: p.name, color: p.color, action: () => onOpenProject(p.id) })
      }
    }
    for (const task of tasks) {
      if (items.length >= 12) break
      if (task.title.toLowerCase().includes(q) || task.desc?.toLowerCase().includes(q)) {
        const proj = projects.find(p => p.id === task.pid)
        items.push({ type: 'task', id: task.id, label: task.title, detail: proj?.name, color: proj?.color, done: task.done, action: () => onOpenTask(task.id) })
      }
    }

    const navPages = [
      { id: 'home', label: 'Home' }, { id: 'mytasks', label: t.myTasks },
      { id: 'inbox', label: 'Inbox' }, { id: 'people', label: t.people },
      { id: 'portfolios', label: t.portfolios },
    ]
    for (const np of navPages) {
      if (np.label.toLowerCase().includes(q)) {
        items.push({ type: 'nav', id: np.id, label: np.label, icon: '→', action: () => onNavigate(np.id) })
      }
    }

    return items
  }, [query, tasks, projects])

  useEffect(() => { setIdx(0) }, [query])

  const execute = (item) => { item.action(); onClose() }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[idx]) { e.preventDefault(); execute(results[idx]) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }} />
      <div style={{
        position: 'fixed', top: '18%', left: '50%', transform: 'translateX(-50%)',
        width: 520, maxHeight: '60vh', background: 'var(--bg1)',
        border: '1px solid var(--bd2)', borderRadius: 'var(--r2)',
        boxShadow: 'var(--shadow-lg)', zIndex: 1000, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', animation: 'toast-in 0.15s var(--ease) both',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd3)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5" stroke="var(--tx3)" strokeWidth="1.3"/>
            <path d="M11 11l3.5 3.5" stroke="var(--tx3)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown}
            placeholder={t.searchPlaceholder ?? 'Search tasks, projects…'}
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 15, color: 'var(--tx1)', outline: 'none', padding: 0 }}
          />
          <kbd style={{ fontSize: 11, color: 'var(--tx3)', background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--bd3)' }}>esc</kbd>
        </div>

        <div style={{ overflow: 'auto', maxHeight: 400 }}>
          {results.length === 0 && query && (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
              {t.noResults ?? 'No results'}
            </div>
          )}
          {results.map((item, i) => (
            <div key={`${item.type}-${item.id}`}
              onClick={() => execute(item)}
              onMouseEnter={() => setIdx(i)}
              style={{
                padding: '10px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                background: i === idx ? 'var(--bg2)' : 'transparent',
              }}>
              {item.type === 'project' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />}
              {item.type === 'task' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color ?? 'var(--tx3)', flexShrink: 0 }} />}
              {item.type === 'nav' && <span style={{ fontSize: 14, color: 'var(--tx3)', width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: item.done ? 'var(--tx3)' : 'var(--tx1)', textDecoration: item.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </div>
                {item.detail && <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{item.detail}</div>}
              </div>
              <span style={{ fontSize: 10, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                {item.type === 'task' ? 'task' : item.type === 'project' ? 'project' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
