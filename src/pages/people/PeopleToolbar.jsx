import { SORT_ARROW } from './constants'

export function ViewToggle({ view, setView, t }) {
  const btn = (v, label) => (
    <button
      key={v}
      onClick={() => setView(v)}
      style={{
        fontSize: 12,
        fontWeight: 500,
        padding: '4px 12px',
        border: 'none',
        borderRadius: 'var(--r1)',
        background: view === v ? 'var(--accent)' : 'transparent',
        color: view === v ? '#fff' : 'var(--tx2)',
        cursor: 'pointer',
        transition: 'all .15s',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}>
      {v === 'cards' && (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
          <rect x="9" y="1" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
          <rect x="1" y="9" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
          <rect x="9" y="9" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      )}
      {v === 'list' && (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M4 3h10M4 8h10M4 13h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="1.5" cy="3" r="1" fill="currentColor" />
          <circle cx="1.5" cy="8" r="1" fill="currentColor" />
          <circle cx="1.5" cy="13" r="1" fill="currentColor" />
        </svg>
      )}
      {label}
    </button>
  )
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        background: 'var(--bg2)',
        borderRadius: 'var(--r1)',
        padding: 2,
        border: '1px solid var(--bd3)',
      }}>
      {btn('cards', t.cardView)}
      {btn('list', t.listView)}
    </div>
  )
}

export function ProjectFilter({ projects, selected, setSelected, t }) {
  return (
    <select
      value={selected}
      onChange={e => setSelected(e.target.value)}
      style={{
        fontSize: 12,
        padding: '5px 10px',
        borderRadius: 'var(--r1)',
        border: '1px solid var(--bd3)',
        background: 'var(--bg2)',
        color: 'var(--tx1)',
        cursor: 'pointer',
      }}>
      <option value="">{t.filterByProject}</option>
      {projects.map(p => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}

export function SortHeader({ label, field, sortField, sortDir, onSort, style }) {
  const active = sortField === field
  return (
    <div
      onClick={() => onSort(field)}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 10,
        fontWeight: 600,
        color: active ? 'var(--accent)' : 'var(--tx3)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
        ...style,
      }}>
      {label}
      {active && <span style={{ fontSize: 8, marginTop: 1 }}>{SORT_ARROW[sortDir]}</span>}
    </div>
  )
}
