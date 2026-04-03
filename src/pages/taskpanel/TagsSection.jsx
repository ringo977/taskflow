import { useState } from 'react'

const TAG_COLORS = ['#378ADD','#D85A30','#1D9E75','#7F77DD','#EF9F27','#639922','#D4537E','#2AA198','#CB4B16','#6C71C4']

export default function TagsSection({ task, allTasks, onUpd, sectionTitle, t }) {
  const [input, setInput] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const tags = task.tags ?? []

  const allKnownTags = [...new Map(
    allTasks.flatMap(tk => tk.tags ?? []).map(tg => [tg.name, tg])
  ).values()]

  const suggestions = allKnownTags.filter(tg =>
    !tags.some(x => x.name === tg.name) &&
    (!input || tg.name.toLowerCase().includes(input.toLowerCase()))
  ).slice(0, 8)

  const addTag = (tg) => {
    if (tags.some(x => x.name === tg.name)) return
    onUpd(task.id, { tags: [...tags, tg] })
    setInput('')
    setShowPicker(false)
  }

  const createTag = () => {
    const name = input.trim()
    if (!name || tags.some(x => x.name === name)) return
    const existing = allKnownTags.find(tg => tg.name.toLowerCase() === name.toLowerCase())
    if (existing) { addTag(existing); return }
    const color = TAG_COLORS[allKnownTags.length % TAG_COLORS.length]
    addTag({ name, color })
  }

  const removeTag = (name) => {
    onUpd(task.id, { tags: tags.filter(tg => tg.name !== name) })
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...sectionTitle, marginBottom: 8 }}>{t.tags ?? 'Tags'}</div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        {tags.map(tg => (
          <span key={tg.name} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, padding: '2px 8px', borderRadius: 'var(--r1)',
            background: (tg.color ?? 'var(--tx3)') + '20', color: tg.color ?? 'var(--tx3)', fontWeight: 500,
          }}>
            {tg.name}
            <span onClick={() => removeTag(tg.name)} style={{ cursor: 'pointer', fontSize: 13, lineHeight: 1, opacity: 0.6 }}>✕</span>
          </span>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setShowPicker(true) }}
          onFocus={() => setShowPicker(true)}
          placeholder={t.addTag ?? 'Add tag…'}
          style={{ width: '100%', fontSize: 13 }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createTag() } }}
        />
        {showPicker && (input || suggestions.length > 0) && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'var(--bg1)', border: '1px solid var(--bd2)', borderRadius: 'var(--r1)', boxShadow: 'var(--shadow-md)', zIndex: 10, maxHeight: 200, overflow: 'auto' }}>
            {suggestions.map(tg => (
              <div key={tg.name} onClick={() => addTag(tg)} className="row-interactive"
                style={{ padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: tg.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--tx1)' }}>{tg.name}</span>
              </div>
            ))}
            {input.trim() && !allKnownTags.some(tg => tg.name.toLowerCase() === input.trim().toLowerCase()) && (
              <div onClick={createTag} className="row-interactive"
                style={{ padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, borderTop: suggestions.length ? '1px solid var(--bd3)' : 'none' }}>
                <span style={{ fontSize: 14, color: 'var(--c-success)', fontWeight: 500 }}>+</span>
                <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{t.createTag ?? 'Create'} "<strong>{input.trim()}</strong>"</span>
              </div>
            )}
          </div>
        )}
        {showPicker && <div onClick={() => { setShowPicker(false); setInput('') }} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />}
      </div>
    </div>
  )
}
