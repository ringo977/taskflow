import { useState, useEffect } from 'react'
import { logger } from '@/utils/logger'
import { fetchProjectMembers, addProjectMember, removeProjectMember } from '@/lib/db'
import { getInitials } from '@/utils/initials'

const log = logger('ProjectMembersPanel')

export default function ProjectMembersPanel({ projectId, orgUsers, sectionTitleStyle, t, canManage = false }) {
  const [members, setMembers] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchProjectMembers(projectId)
      .then(setMembers)
      .catch(e => log.warn('fetchProjectMembers failed:', e.message))
  }, [projectId, busy])

  const nonMembers = orgUsers.filter(u => !members.some(m => m.user_id === u.id))

  const handleAdd = async (userId, role = 'editor') => {
    setBusy(true)
    try {
      await addProjectMember(projectId, userId, role)
    } catch (e) { log.warn('addProjectMember failed:', e.message) }
    finally { setBusy(false) }
  }

  const handleRemove = async (userId) => {
    setBusy(true)
    try {
      await removeProjectMember(projectId, userId)
    } catch (e) { log.warn('removeProjectMember failed:', e.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={sectionTitleStyle}>{t.projectMembers}</div>
        {canManage && (
          <button onClick={() => setShowAdd(s => !s)}
            style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)40', borderRadius: 'var(--r1)', padding: '2px 7px', cursor: 'pointer' }}>
            {showAdd ? '✕' : '+'}
          </button>
        )}
      </div>

      {showAdd && nonMembers.length > 0 && (
        <div style={{ marginBottom: 10, padding: '8px', background: 'var(--bg2)', borderRadius: 'var(--r1)', maxHeight: 160, overflow: 'auto' }}>
          {nonMembers.map(u => (
            <div key={u.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 'var(--r1)', fontSize: 12, color: 'var(--tx2)' }}>
              <div onClick={() => handleAdd(u.id, 'editor')} className="row-interactive"
                style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer', borderRadius: 'var(--r1)', padding: '2px 4px' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: u.color + '28', color: u.color, fontSize: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getInitials(u.name)}
                </div>
                {u.name}
              </div>
              <select
                defaultValue="editor"
                onClick={e => e.stopPropagation()}
                onChange={e => handleAdd(u.id, e.target.value)}
                style={{ fontSize: 10, padding: '1px 3px', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'var(--bg1)', color: 'var(--tx3)', cursor: 'pointer', width: 62 }}>
                <option value="owner">{t.roleOwner ?? 'Owner'}</option>
                <option value="editor">{t.roleEditor ?? 'Editor'}</option>
                <option value="viewer">{t.roleViewer ?? 'Viewer'}</option>
              </select>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {members.map(m => (
          <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: (m.color ?? '#888') + '28', color: m.color ?? '#888', fontSize: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getInitials(m.user_name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--tx1)' }}>{m.user_name}</div>
            </div>
            <select
              value={m.role ?? 'viewer'}
              onChange={async e => {
                const newRole = e.target.value
                setBusy(true)
                try {
                  await addProjectMember(projectId, m.user_id, newRole)
                } catch (e) { log.warn('updateMemberRole failed:', e.message) }
                finally { setBusy(false) }
              }}
              disabled={!canManage}
              style={{ fontSize: 11, padding: '2px 4px', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'var(--bg2)', color: 'var(--tx2)', cursor: canManage ? 'pointer' : 'not-allowed', opacity: canManage ? 1 : 0.6 }}
            >
              <option value="owner">{t.roleOwner ?? 'Owner'}</option>
              <option value="editor">{t.roleEditor ?? 'Editor'}</option>
              <option value="viewer">{t.roleViewer ?? 'Viewer'}</option>
            </select>
            {canManage && (
              <button onClick={() => handleRemove(m.user_id)}
                style={{ fontSize: 11, color: 'var(--c-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>✕</button>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>
            {t.noProjectMembers ?? 'No members yet'}
          </div>
        )}
      </div>
    </div>
  )
}
