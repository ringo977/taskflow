export function renderMentions(text) {
  if (!text) return text
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return <span key={i} style={{ color: 'var(--c-brand)', fontWeight: 500, cursor: 'pointer' }}>{part}</span>
    }
    return part
  })
}

export default function MentionPopup({ query, users, onSelect, onClose }) {
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6)

  if (filtered.length === 0) return null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: '100%', marginBottom: 4,
        background: 'var(--bg1)', border: '1px solid var(--bd2)', borderRadius: 'var(--r1)',
        boxShadow: 'var(--shadow-md)', zIndex: 20, maxHeight: 180, overflow: 'auto',
      }}>
        {filtered.map(u => (
          <div key={u.id ?? u.name} onClick={() => onSelect(u.name)} className="row-interactive"
            style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: u.color ?? 'var(--c-brand)', color: '#fff', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {u.name.slice(0, 1).toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: 'var(--tx1)' }}>{u.name}</span>
            {u.role && <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{u.role}</span>}
          </div>
        ))}
      </div>
    </>
  )
}
