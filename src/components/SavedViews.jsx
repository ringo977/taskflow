import { useState, useEffect, useRef } from 'react'
import { useLang } from '@/i18n'
import { storage } from '@/utils/storage'
import { EMPTY_FILTERS } from '@/constants'

/**
 * Saved views: per-project named snapshots of {view, groupBy, filters}.
 * Persisted in localStorage (per user/device) so a member can jump back to
 * "My WP3 deadlines", "Partner X tasks", etc. with one click.
 */
const keyFor = (pid) => `savedViews:${pid || 'global'}`

export default function SavedViews({ projectId, view, setView, groupBy, onGroupByChange, filters, setFilters }) {
  const t = useLang()
  const [views, setViews] = useState(() => storage.get(keyFor(projectId), []))
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const ref = useRef(null)

  useEffect(() => { setViews(storage.get(keyFor(projectId), [])) }, [projectId])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc) }
  }, [open])

  const persist = (next) => { setViews(next); storage.set(keyFor(projectId), next) }

  const save = () => {
    const n = name.trim()
    if (!n) return
    const v = { id: `v${Date.now()}`, name: n, view, groupBy, filters }
    persist([...views.filter(x => x.name !== n), v])
    setName('')
  }

  const apply = (v) => {
    setView?.(v.view)
    onGroupByChange?.(v.groupBy ?? 'section')
    setFilters?.(v.filters ?? EMPTY_FILTERS)
    setOpen(false)
  }

  const del = (id) => persist(views.filter(x => x.id !== id))

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open}
        style={{ fontSize: 13, padding: '7px 10px' }}>
        ★ {t.savedViews ?? 'Views'}{views.length ? ` (${views.length})` : ''}
      </button>
      {open && (
        <div role="menu" style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50,
          background: 'var(--bg1)', border: '1px solid var(--bd2)', borderRadius: 'var(--r2)',
          boxShadow: 'var(--shadow-lg)', minWidth: 240, padding: 8,
        }}>
          {views.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--tx3)', padding: '6px 8px' }}>{t.noSavedViews ?? 'No saved views yet'}</div>
          )}
          {views.map(v => (
            <div key={v.id} className="row-interactive"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 'var(--r1)' }}>
              <button onClick={() => apply(v)}
                style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--tx1)', fontSize: 13, cursor: 'pointer', padding: '2px 0' }}>
                {v.name}
              </button>
              <button onClick={() => del(v.id)} aria-label={t.deleteView ?? 'Delete view'}
                style={{ background: 'transparent', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, borderTop: '1px solid var(--bd3)', paddingTop: 8 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t.saveViewPlaceholder ?? 'Save current as…'}
              onKeyDown={e => e.key === 'Enter' && save()}
              style={{ flex: 1, fontSize: 12, padding: '5px 7px', borderRadius: 'var(--r1)' }} />
            <button onClick={save} disabled={!name.trim()} style={{ fontSize: 12, padding: '5px 9px', opacity: name.trim() ? 1 : 0.5 }}>
              {t.saveView ?? 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
