import { useState, useEffect } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers, useRefreshOrgUsers } from '@/context/OrgUsersCtx'
import { isOverdue } from '@/utils/filters'
import { addOrgMember, removeOrgMember, updateOrgMemberRole, fetchMyMemberships, fetchPendingJoinRequests, approveJoinRequest, rejectJoinRequest } from '@/lib/db'
import { getInitials } from '@/utils/initials'

const ROLES = ['admin', 'manager', 'member', 'guest']
const ROLE_COLORS = { admin: 'var(--c-danger)', manager: 'var(--c-warning)', member: 'var(--accent)', guest: 'var(--tx3)' }
const isUUID = id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

function RoleBadge({ role }) {
  return (
    <span style={{ fontSize: 11, color: ROLE_COLORS[role] ?? 'var(--tx3)', background: (ROLE_COLORS[role] ?? 'var(--tx3)') + '18', padding: '2px 7px', borderRadius: 'var(--r1)', fontWeight: 500, textTransform: 'capitalize' }}>
      {role}
    </span>
  )
}

export default function PeopleView({ tasks, projects, currentUser, activeOrgId }) {
  const t = useLang()
  const USERS = useOrgUsers()
  const refreshUsers = useRefreshOrgUsers()
  const [showAdmin, setShowAdmin] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const currentMember = USERS.find(u => u.id === currentUser?.id)
  const [dbRole, setDbRole] = useState(null)

  useEffect(() => {
    if (!activeOrgId) return
    setDbRole(null)
    fetchMyMemberships()
      .then(rows => {
        const m = rows.find(r => r.org_id === activeOrgId)
        if (m) setDbRole(m.role)
      })
      .catch(() => {})
  }, [activeOrgId])

  const isAdmin = currentMember?.role === 'admin' || dbRole === 'admin'
  const [pendingReqs, setPendingReqs] = useState([])

  useEffect(() => {
    if (!isAdmin) return
    fetchPendingJoinRequests()
      .then(rows => setPendingReqs(rows.filter(r => r.org_id === activeOrgId)))
      .catch(() => {})
  }, [isAdmin, activeOrgId, busy])

  const handleApprove = async (reqId) => {
    setBusy(true)
    try {
      await approveJoinRequest(reqId)
      setPendingReqs(r => r.filter(x => x.id !== reqId))
      refreshUsers()
      flash(t.requestApproved ?? 'Request approved')
    } catch { flash(t.inviteError, 'err') }
    finally { setBusy(false) }
  }

  const handleReject = async (reqId) => {
    setBusy(true)
    try {
      await rejectJoinRequest(reqId)
      setPendingReqs(r => r.filter(x => x.id !== reqId))
      flash(t.requestRejected ?? 'Request rejected')
    } catch { flash(t.removeError, 'err') }
    finally { setBusy(false) }
  }

  const flash = (text, type = 'ok') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setBusy(true)
    try {
      await addOrgMember(activeOrgId, inviteEmail.trim(), inviteRole)
      flash(t.inviteSuccess(inviteEmail.trim()))
      setInviteEmail('')
      setInviteRole('member')
      refreshUsers()
    } catch (e) {
      if (e.message === 'USER_NOT_FOUND') flash(t.inviteErrorNotFound, 'err')
      else if (e.message === 'ALREADY_MEMBER') flash(t.inviteErrorAlready, 'err')
      else flash(t.inviteError, 'err')
    } finally { setBusy(false) }
  }

  const handleRemove = async (u) => {
    if (u.id === currentUser?.id) { flash(t.cannotRemoveSelf, 'err'); return }
    if (!confirm(t.confirmRemove(u.name))) return
    setBusy(true)
    try {
      await removeOrgMember(activeOrgId, u.id)
      flash(t.removeSuccess(u.name))
      refreshUsers()
    } catch (e) {
      console.error('removeOrgMember failed:', e)
      flash(t.removeError + (e?.message ? ` (${e.message})` : ''), 'err')
    }
    finally { setBusy(false) }
  }

  const handleRoleChange = async (u, newRole) => {
    setBusy(true)
    try {
      await updateOrgMemberRole(activeOrgId, u.id, newRole)
      flash(t.roleUpdated)
      refreshUsers()
    } catch { flash(t.roleError, 'err') }
    finally { setBusy(false) }
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx1)' }}>{t.people}</div>
        {isAdmin && (
          <button
            onClick={() => setShowAdmin(s => !s)}
            style={{ fontSize: 12, fontWeight: 500, color: showAdmin ? 'var(--bg1)' : 'var(--accent)', background: showAdmin ? 'var(--accent)' : 'var(--accent)18', border: '1px solid var(--accent)', borderRadius: 'var(--r1)', padding: '3px 10px', cursor: 'pointer', transition: 'all .15s' }}
          >
            {t.manageMembers}
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 16 }}>{t.teamMembers(USERS.length)}</div>

      {/* Feedback toast */}
      {msg && (
        <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 'var(--r1)', fontSize: 13, fontWeight: 500, color: msg.type === 'err' ? 'var(--c-danger)' : 'var(--c-success)', background: msg.type === 'err' ? 'var(--c-danger)12' : 'var(--c-success)12', border: `1px solid ${msg.type === 'err' ? 'var(--c-danger)' : 'var(--c-success)'}30` }}>
          {msg.text}
        </div>
      )}

      {/* Admin panel: invite + member table */}
      {showAdmin && isAdmin && (
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd3)', borderRadius: 'var(--r2)', padding: 16, marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
          {/* Invite form */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)', marginBottom: 10 }}>{t.inviteMember}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              placeholder={t.emailPlaceholder}
              style={{ flex: 1, minWidth: 200, padding: '7px 10px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx1)', fontSize: 13, outline: 'none' }}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx1)', fontSize: 13, cursor: 'pointer' }}
            >
              {ROLES.map(r => <option key={r} value={r}>{t[`role${r.charAt(0).toUpperCase() + r.slice(1)}`]}</option>)}
            </select>
            <button
              onClick={handleInvite}
              disabled={busy || !inviteEmail.trim()}
              style={{ padding: '7px 16px', borderRadius: 'var(--r1)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: busy ? 'wait' : 'pointer', opacity: busy || !inviteEmail.trim() ? 0.5 : 1 }}
            >
              {t.invite}
            </button>
          </div>

          {/* Member table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd3)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--tx3)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--tx3)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--tx3)', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {USERS.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--bd3)08' }}>
                  <td style={{ padding: '8px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color + '28', color: u.color, fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {getInitials(u.name)}
                    </div>
                    <span style={{ color: 'var(--tx1)', fontWeight: 500 }}>{u.name}</span>
                    {u.id === currentUser?.id && <span style={{ fontSize: 10, color: 'var(--tx3)', fontStyle: 'italic' }}>(you)</span>}
                  </td>
                  <td style={{ padding: '8px 8px', color: 'var(--tx3)' }}>{u.email}</td>
                  <td style={{ padding: '8px 8px' }}>
                    {u.id === currentUser?.id || !isUUID(u.id)
                      ? <RoleBadge role={u.role} />
                      : (
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u, e.target.value)}
                          disabled={busy}
                          style={{ padding: '3px 6px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx1)', fontSize: 12, cursor: 'pointer' }}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{t[`role${r.charAt(0).toUpperCase() + r.slice(1)}`]}</option>)}
                        </select>
                      )
                    }
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                    {u.id !== currentUser?.id && isUUID(u.id) && (
                      <button
                        onClick={() => handleRemove(u)}
                        disabled={busy}
                        style={{ fontSize: 12, color: 'var(--c-danger)', background: 'none', border: '1px solid var(--c-danger)40', borderRadius: 'var(--r1)', padding: '2px 8px', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}
                      >
                        {t.removeMember}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pending join requests */}
          {pendingReqs.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)', marginBottom: 8 }}>
                {t.pendingRequests ?? 'Pending requests'} ({pendingReqs.length})
              </div>
              {pendingReqs.map(req => (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderBottom: '1px solid var(--bd3)08' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)28', color: 'var(--accent)', fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {getInitials(req.user_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)' }}>{req.user_name}</span>
                    <span style={{ fontSize: 12, color: 'var(--tx3)', marginLeft: 8 }}>{req.user_email}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleApprove(req.id)} disabled={busy}
                      style={{ fontSize: 12, padding: '3px 10px', border: 'none', borderRadius: 'var(--r1)', background: 'var(--c-success)', color: '#fff', cursor: 'pointer', fontWeight: 500, opacity: busy ? 0.5 : 1 }}>
                      {t.approve ?? 'Approve'}
                    </button>
                    <button onClick={() => handleReject(req.id)} disabled={busy}
                      style={{ fontSize: 12, padding: '3px 10px', border: '1px solid var(--c-danger)40', borderRadius: 'var(--r1)', background: 'none', color: 'var(--c-danger)', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
                      {t.reject ?? 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Member cards (existing view) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {USERS.map(u => {
          const userTasks = tasks.filter(task => task.who === u.name)
          const open      = userTasks.filter(task => !task.done)
          const od        = open.filter(task => isOverdue(task.due))
          const userProjs = [...new Set(userTasks.map(task => task.pid))]
            .map(id => projects.find(p => p.id === id))
            .filter(Boolean)

          return (
            <div key={u.id} style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', boxShadow: 'var(--shadow-sm)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: u.color + '28', color: u.color, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getInitials(u.name)}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--tx1)' }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{u.email}</div>
                </div>
                <span style={{ marginLeft: 'auto' }}><RoleBadge role={u.role} /></span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
                {[
                  [t.openTasks,    open.length,                          'var(--tx2)'],
                  [t.overdueLabel, od.length,                            od.length ? 'var(--c-danger)' : 'var(--tx3)'],
                  [t.completed,    userTasks.filter(task => task.done).length, 'var(--c-success)'],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ background: 'var(--bg2)', borderRadius: 'var(--r1)', padding: '6px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 500, color, lineHeight: 1, marginBottom: 2 }}>{value}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)' }}>{label}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.projects}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {userProjs.map(p => (
                    <span key={p.id} style={{ fontSize: 11, color: p.color, background: p.color + '18', padding: '2px 6px', borderRadius: 'var(--r1)', fontWeight: 500 }}>{p.name}</span>
                  ))}
                  {userProjs.length === 0 && <span style={{ fontSize: 12, color: 'var(--tx3)' }}>—</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
