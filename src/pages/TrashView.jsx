import { useState, useEffect } from 'react'
import { logger } from '@/utils/logger'
import { useLang } from '@/i18n'
import { fetchTrash, restoreItem, permanentlyDelete } from '@/lib/db'
import ConfirmModal from '@/components/ConfirmModal'

const log = logger('TrashView')

export default function TrashView({ orgId, onReload }) {
  const t = useLang()
  const [data, setData] = useState({ tasks: [], projects: [], portfolios: [] })
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = () => fetchTrash(orgId).then(setData).catch(e => log.warn('fetchTrash failed:', e.message))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [orgId])

  const handleRestore = async (table, id) => {
    setBusy(true)
    try {
      await restoreItem(table, id)
      await load()
      onReload?.()
    } catch (e) { log.error('restoreItem failed:', e) }
    finally { setBusy(false) }
  }

  const handlePermanent = async (table, id) => {
    setBusy(true)
    try {
      await permanentlyDelete(table, id, orgId)
      await load()
    } catch (e) { log.error('permanentlyDelete failed:', e) }
    finally { setBusy(false); setConfirm(null) }
  }

  const total = data.tasks.length + data.projects.length + data.portfolios.length
  const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const ItemRow = ({ icon, name, deletedAt, onRestore, onDelete }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--bd3)' }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{fmtDate(deletedAt)}</div>
      </div>
      <button onClick={onRestore} disabled={busy}
        style={{ fontSize: 12, padding: '4px 10px', border: '1px solid var(--bd-success)', background: 'var(--bg-success)', color: 'var(--tx-success)', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 500 }}>
        {t.restore ?? 'Restore'}
      </button>
      <button onClick={onDelete} disabled={busy}
        style={{ fontSize: 12, padding: '4px 10px', border: '1px solid color-mix(in srgb, var(--c-danger) 30%, transparent)', background: 'var(--bg-danger)', color: 'var(--tx-danger)', borderRadius: 'var(--r1)', cursor: 'pointer' }}>
        {t.deletePermanently ?? 'Delete forever'}
      </button>
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
      <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--tx1)', marginBottom: 4 }}>
        🗑 {t.trash ?? 'Trash'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--tx3)', marginBottom: 20 }}>
        {total === 0
          ? (t.trashEmpty ?? 'Trash is empty')
          : `${total} ${t.trashItems ?? 'items'}`
        }
      </div>

      {data.portfolios.length > 0 && (
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--bd3)' }}>
            {t.portfolios}
          </div>
          {data.portfolios.map(p => (
            <ItemRow key={p.id} icon="📁" name={p.name} deletedAt={p.deleted_at}
              onRestore={() => handleRestore('portfolios', p.id)}
              onDelete={() => setConfirm({ table: 'portfolios', id: p.id, name: p.name })} />
          ))}
        </div>
      )}

      {data.projects.length > 0 && (
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--bd3)' }}>
            {t.projects}
          </div>
          {data.projects.map(p => (
            <ItemRow key={p.id} icon={<div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />} name={p.name} deletedAt={p.deleted_at}
              onRestore={() => handleRestore('projects', p.id)}
              onDelete={() => setConfirm({ table: 'projects', id: p.id, name: p.name })} />
          ))}
        </div>
      )}

      {data.tasks.length > 0 && (
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--bd3)' }}>
            Tasks
          </div>
          {data.tasks.map(tk => (
            <ItemRow key={tk.id} icon="☑" name={tk.title} deletedAt={tk.deleted_at}
              onRestore={() => handleRestore('tasks', tk.id)}
              onDelete={() => setConfirm({ table: 'tasks', id: tk.id, name: tk.title })} />
          ))}
        </div>
      )}

      {confirm && (
        <ConfirmModal
          message={`${t.deletePermanently ?? 'Permanently delete'} "${confirm.name}"? ${t.cannotUndo ?? 'This cannot be undone.'}`}
          onConfirm={() => handlePermanent(confirm.table, confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
