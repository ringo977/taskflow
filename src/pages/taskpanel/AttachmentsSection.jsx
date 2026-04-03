import { useState, useRef } from 'react'
import { uploadAttachment, deleteAttachment } from '@/lib/db'

export default function AttachmentsSection({ task, orgId, onUpd, sectionTitle, t, readOnly }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const attachments = task.attachments ?? []

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      const newAttachments = await Promise.all(files.map(async f => {
        try {
          const { url, path } = await uploadAttachment(orgId, task.id, f)
          return { id: `att${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: f.name, size: f.size, type: f.type, addedAt: new Date().toISOString().slice(0, 10), url, storagePath: path }
        } catch {
          return { id: `att${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: f.name, size: f.size, type: f.type, addedAt: new Date().toISOString().slice(0, 10), url: URL.createObjectURL(f) }
        }
      }))
      onUpd(task.id, { attachments: [...attachments, ...newAttachments] })
    } finally { setUploading(false) }
    e.target.value = ''
  }

  const removeAtt = async (attId) => {
    const att = attachments.find(a => a.id === attId)
    if (att?.storagePath) {
      try { await deleteAttachment(att.storagePath) } catch {}
    }
    onUpd(task.id, { attachments: attachments.filter(a => a.id !== attId) })
  }

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const iconForType = (type) => {
    if (type?.startsWith('image/')) return '🖼'
    if (type?.includes('pdf')) return '📄'
    if (type?.includes('spreadsheet') || type?.includes('excel') || type?.includes('csv')) return '📊'
    if (type?.includes('document') || type?.includes('word')) return '📝'
    return '📎'
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={sectionTitle}>{t.attachments}{attachments.length > 0 ? ` (${attachments.length})` : ''}</div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading || readOnly}
          style={{ fontSize: 12, padding: '5px 10px', color: readOnly ? 'var(--tx3)' : 'var(--c-brand)', borderColor: readOnly ? 'var(--tx3)' : 'var(--c-brand)', opacity: uploading || readOnly ? 0.5 : 1 }}>
          {uploading ? '…' : `+ ${t.addAttachment}`}
        </button>
        <input ref={fileRef} type="file" multiple onChange={handleFiles} style={{ display: 'none' }} />
      </div>

      {attachments.length === 0 && <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{t.noAttachments}</div>}

      {attachments.map(att => (
        <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--bd3)' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{iconForType(att.type)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
            <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{fmtSize(att.size)}</div>
          </div>
          {att.url && (
            <a href={att.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: 'var(--c-brand)', textDecoration: 'none', flexShrink: 0 }}>↓</a>
          )}
          <button onClick={() => removeAtt(att.id)} style={{ border: 'none', background: 'transparent', color: 'var(--tx3)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
      ))}
    </div>
  )
}
