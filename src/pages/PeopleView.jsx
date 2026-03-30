import { useState, useEffect, useMemo, useCallback } from 'react'
import { logger } from '@/utils/logger'
import { useLang } from '@/i18n'
import { useOrgUsers, useRefreshOrgUsers } from '@/context/OrgUsersCtx'
import { isOverdue } from '@/utils/filters'
import { addOrgMember, removeOrgMember, updateOrgMemberRole, fetchMyMemberships, fetchPendingJoinRequests, approveJoinRequest, rejectJoinRequest, fetchPendingSignups, confirmUserEmail, deleteUserAccount } from '@/lib/db'
import ConfirmModal from '@/components/ConfirmModal'
import { getInitials } from '@/utils/initials'

const log = logger('PeopleView')

const ROLES = ['admin', 'manager', 'member', 'guest']
const ROLE_COLORS = { admin: 'var(--c-danger)', manager: 'var(--c-warning)', member: 'var(--accent)', guest: 'var(--tx3)' }
const isUUID = id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

/** Split "First Last" → { first, last }. Last word = last name. */
function splitName(fullName) {
  const parts = (fullName ?? '').trim().split(/\s+/)
  if (parts.length <= 1) return { first: parts[0] || '', last: '' }
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] }
}

/* ── Shared sub-components ────────────────────────────────────── */

function RoleBadge({ role }) {
  return (
    <span style={{ fontSize: 11, color: ROLE_COLORS[role] ?? 'var(--tx3)', background: (ROLE_COLORS[role] ?? 'var(--tx3)') + '18', padding: '2px 7px', borderRadius: 'var(--r1)', fontWeight: 500, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {role}
    </span>
  )
}

function ViewToggle({ view, setView, t }) {
  const btn = (v, label) => (
    <button key={v} onClick={() => setView(v)}
      style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', border: 'none', borderRadius: 'var(--r1)',
        background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? '#fff' : 'var(--tx2)',
        cursor: 'pointer', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5 }}>
      {v === 'cards' && <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="1" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="9" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="9" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3"/></svg>}
      {v === 'list' && <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M4 3h10M4 8h10M4 13h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="1.5" cy="3" r="1" fill="currentColor"/><circle cx="1.5" cy="8" r="1" fill="currentColor"/><circle cx="1.5" cy="13" r="1" fill="currentColor"/></svg>}
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', gap: 2, background: 'var(--bg2)', borderRadius: 'var(--r1)', padding: 2, border: '1px solid var(--bd3)' }}>
      {btn('cards', t.cardView)}{btn('list', t.listView)}
    </div>
  )
}

function ProjectFilter({ projects, selected, setSelected, t }) {
  return (
    <select value={selected} onChange={e => setSelected(e.target.value)}
      style={{ fontSize: 12, padding: '5px 10px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx1)', cursor: 'pointer' }}>
      <option value="">{t.filterByProject}</option>
      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  )
}

/* ── Sortable column header ───────────────────────────────────── */

const SORT_ARROW = { asc: '▲', desc: '▼' }

function SortHeader({ label, field, sortField, sortDir, onSort, style }) {
  const active = sortField === field
  return (
    <div onClick={() => onSort(field)} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: active ? 'var(--accent)' : 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', ...style }}>
      {label}
      {active && <span style={{ fontSize: 8, marginTop: 1 }}>{SORT_ARROW[sortDir]}</span>}
    </div>
  )
}

/* ── Card view ────────────────────────────────────────────────── */

function MemberCard({ u, userTasks, projects, t }) {
  const open = userTasks.filter(task => !task.done)
  const od = open.filter(task => isOverdue(task.due))
  const done = userTasks.filter(task => task.done)
  const userProjs = [...new Set(userTasks.map(task => task.pid))]
    .map(id => projects.find(p => p.id === id)).filter(Boolean)

  return (
    <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ background: u.color + '14', padding: '16px 18px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: u.color, color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px ' + u.color + '40' }}>
          {getInitials(u.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
          <div style={{ fontSize: 12, color: 'var(--tx3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
        </div>
        <RoleBadge role={u.role} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--bd3)' }}>
        {[
          [t.openTasks, open.length, 'var(--tx1)'],
          [t.overdueLabel, od.length, od.length ? 'var(--c-danger)' : 'var(--tx3)'],
          [t.completed, done.length, 'var(--c-success)'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: 'var(--bg1)', padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color, lineHeight: 1, marginBottom: 3 }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 18px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.projects}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {userProjs.map(p => (
            <span key={p.id} style={{ fontSize: 11, color: p.color, background: p.color + '18', padding: '3px 8px', borderRadius: 'var(--r1)', fontWeight: 500 }}>{p.name}</span>
          ))}
          {userProjs.length === 0 && <span style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>{t.noResults ?? '—'}</span>}
        </div>
      </div>
    </div>
  )
}

/* ── Admin section header ─────────────────────────────────────── */

function AdminSectionHeader({ icon, title, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 }}>
      <div style={{ width: 28, height: 28, borderRadius: 'var(--r1)', background: (color ?? 'var(--accent)') + '14', color: color ?? 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx1)', flex: 1 }}>{title}</div>
      {count > 0 && (
        <span style={{ fontSize: 11, fontWeight: 600, background: (color ?? 'var(--accent)') + '18', color: color ?? 'var(--accent)', padding: '2px 8px', borderRadius: 10 }}>{count}</span>
      )}
    </div>
  )
}

/* ── Main component ───────────────────────────────────────────── */

export default function PeopleView({ tasks, projects, currentUser, activeOrgId }) {
  const t = useLang()
  const USERS = useOrgUsers()
  const refreshUsers = useRefreshOrgUsers()

  // View state
  const [view, setView] = useState('cards')
  const [filterProject, setFilterProject] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkRole, setBulkRole] = useState('member')

  // Sort state for list view
  const [sortField, setSortField] = useState('last')
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = useCallback((field) => {
    setSortField(prev => {
      if (prev === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return field }
      setSortDir('asc')
      return field
    })
  }, [])

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

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
      .catch(e => log.warn('fetchMyMemberships failed:', e.message))
  }, [activeOrgId])

  const isAdmin = currentMember?.role === 'admin' || dbRole === 'admin'
  const [pendingReqs, setPendingReqs] = useState([])
  const [pendingSignups, setPendingSignups] = useState([])

  useEffect(() => {
    if (!isAdmin) return
    fetchPendingJoinRequests()
      .then(rows => setPendingReqs(rows.filter(r => r.org_id === activeOrgId)))
      .catch(e => log.warn('fetchPendingJoinRequests failed:', e.message))
    fetchPendingSignups(activeOrgId)
      .then(rows => setPendingSignups(rows))
      .catch(e => log.warn('fetchPendingSignups failed:', e.message))
  }, [isAdmin, activeOrgId, busy])

  // Compute user stats lookup
  const userStatsMap = useMemo(() => {
    const map = {}
    for (const u of USERS) {
      const ut = tasks.filter(task => Array.isArray(task.who) ? task.who.includes(u.name) : task.who === u.name)
      const open = ut.filter(task => !task.done)
      map[u.id] = {
        tasks: ut,
        open: open.length,
        overdue: open.filter(task => isOverdue(task.due)).length,
        done: ut.filter(task => task.done).length,
      }
    }
    return map
  }, [USERS, tasks])

  // Filtered users (by project)
  const filteredUsers = useMemo(() => {
    let list = USERS
    if (filterProject) {
      list = list.filter(u => (userStatsMap[u.id]?.tasks ?? []).some(task => task.pid === filterProject))
    }
    return list
  }, [USERS, filterProject, userStatsMap])

  // Sorted users for list view
  const sortedUsers = useMemo(() => {
    const arr = [...filteredUsers]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      let va, vb
      switch (sortField) {
        case 'first': { va = splitName(a.name).first.toLowerCase(); vb = splitName(b.name).first.toLowerCase(); break }
        case 'last': { va = splitName(a.name).last.toLowerCase(); vb = splitName(b.name).last.toLowerCase(); break }
        case 'role': { va = ROLES.indexOf(a.role); vb = ROLES.indexOf(b.role); return (va - vb) * dir }
        case 'open': { return ((userStatsMap[a.id]?.open ?? 0) - (userStatsMap[b.id]?.open ?? 0)) * dir }
        case 'overdue': { return ((userStatsMap[a.id]?.overdue ?? 0) - (userStatsMap[b.id]?.overdue ?? 0)) * dir }
        case 'done': { return ((userStatsMap[a.id]?.done ?? 0) - (userStatsMap[b.id]?.done ?? 0)) * dir }
        default: va = a.name.toLowerCase(); vb = b.name.toLowerCase()
      }
      return va < vb ? -dir : va > vb ? dir : 0
    })
    return arr
  }, [filteredUsers, sortField, sortDir, userStatsMap])

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
      log.error('removeOrgMember failed:', e)
      flash(t.removeError + (e?.message ? ` (${e.message})` : ''), 'err')
    } finally { setBusy(false) }
  }

  const handleDeleteAccount = async (userId) => {
    setBusy(true)
    try {
      await deleteUserAccount(userId)
      flash(t.accountDeleted ?? 'Account deleted')
      refreshUsers()
    } catch (e) {
      flash((t.accountDeleteError ?? 'Delete failed') + (e?.message ? ` (${e.message})` : ''), 'err')
    } finally { setBusy(false); setConfirmDelete(null) }
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

  const handleConfirmEmail = async (userId) => {
    setBusy(true)
    try {
      await confirmUserEmail(userId)
      setPendingSignups(s => s.filter(x => x.user_id !== userId))
      flash(t.userConfirmed ?? 'User email confirmed')
    } catch (e) {
      flash((t.confirmError ?? 'Confirm failed') + (e?.message ? ` (${e.message})` : ''), 'err')
    } finally { setBusy(false) }
  }

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

  const handleBulkRoleChange = async () => {
    if (selectedIds.size === 0) return
    setBusy(true)
    let ok = 0
    for (const uid of selectedIds) {
      if (uid === currentUser?.id) continue
      try { await updateOrgMemberRole(activeOrgId, uid, bulkRole); ok++ }
      catch (e) { log.warn('bulk role change failed for', uid, e.message) }
    }
    setSelectedIds(new Set())
    refreshUsers()
    flash(`${ok} ${t.roleUpdated?.toLowerCase?.() ?? 'updated'}`)
    setBusy(false)
  }

  const toggleSelect = (uid) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  const pendingCount = pendingSignups.length + pendingReqs.length
  const editing = showAdmin && isAdmin

  /*
   * Grid columns — tighter name/email, comfortable stats + projects.
   * In admin mode: prepend checkbox, append actions.
   */
  const baseCols = '22px 100px 100px 150px 68px 44px 44px 44px 1fr'
  const adminCols = '28px 22px 100px 100px 150px 68px 44px 44px 44px 1fr 130px'

  const COL_STYLE = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx1)' }}>{t.people}</div>
        <div style={{ flex: 1 }} />
        <ProjectFilter projects={projects} selected={filterProject} setSelected={setFilterProject} t={t} />
        <ViewToggle view={view} setView={setView} t={t} />
        {isAdmin && (
          <button onClick={() => { setShowAdmin(s => !s); setSelectedIds(new Set()) }}
            style={{ fontSize: 12, fontWeight: 500, color: showAdmin ? '#fff' : 'var(--accent)',
              background: showAdmin ? 'var(--accent)' : 'var(--accent)18',
              border: '1px solid var(--accent)', borderRadius: 'var(--r1)', padding: '4px 12px',
              cursor: 'pointer', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1a3 3 0 100 6 3 3 0 000-6zM2 13c0-2.2 2.7-4 6-4s6 1.8 6 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            {t.manageMembers}
            {pendingCount > 0 && (
              <span style={{ background: 'var(--c-warning)', color: '#fff', fontSize: 10, fontWeight: 600, borderRadius: 10, padding: '1px 6px', lineHeight: '16px' }}>
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 16 }}>{t.teamMembers(filteredUsers.length)}</div>

      {/* Feedback toast */}
      {msg && (
        <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 500,
          color: msg.type === 'err' ? 'var(--c-danger)' : 'var(--c-success)',
          background: msg.type === 'err' ? 'var(--c-danger)12' : 'var(--c-success)12',
          border: `1px solid ${msg.type === 'err' ? 'var(--c-danger)' : 'var(--c-success)'}30`,
          display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            {msg.type === 'err'
              ? <><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></>
              : <><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/><path d="M5 8.5l2 2 4-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></>}
          </svg>
          {msg.text}
        </div>
      )}

      {/* ── Admin-only panels (invite + pending) ───────────────── */}
      {editing && (
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd3)', borderRadius: 'var(--r2)', marginBottom: 16, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>

          {/* Invite section */}
          <div style={{ padding: '16px 20px', borderBottom: (pendingSignups.length || pendingReqs.length) ? '1px solid var(--bd3)' : 'none' }}>
            <AdminSectionHeader
              icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              title={t.inviteMember} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()} placeholder={t.emailPlaceholder}
                style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx1)', fontSize: 13, outline: 'none' }} />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx1)', fontSize: 13, cursor: 'pointer' }}>
                {ROLES.map(r => <option key={r} value={r}>{t[`role${r.charAt(0).toUpperCase() + r.slice(1)}`]}</option>)}
              </select>
              <button onClick={handleInvite} disabled={busy || !inviteEmail.trim()}
                style={{ padding: '8px 20px', borderRadius: 'var(--r2)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: busy ? 'wait' : 'pointer', opacity: busy || !inviteEmail.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 14l-2-5-5-2L14 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                {t.invite}
              </button>
            </div>
          </div>

          {/* Pending signups */}
          {pendingSignups.length > 0 && (
            <div style={{ padding: '16px 20px', borderBottom: pendingReqs.length ? '1px solid var(--bd3)' : 'none' }}>
              <AdminSectionHeader
                icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/><path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="8" cy="11" r="0.8" fill="currentColor"/></svg>}
                title={t.pendingSignups ?? 'Pending signups'} count={pendingSignups.length} color="var(--c-warning)" />
              <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 10 }}>
                {t.pendingSignupsDesc ?? 'These users registered but never confirmed their email.'}
              </div>
              {pendingSignups.map((s, i) => (
                <div key={s.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid var(--bd3)' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-warning)18', color: 'var(--c-warning)', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {getInitials(s.display_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)' }}>{s.display_name}</span>
                    <span style={{ fontSize: 12, color: 'var(--tx3)', marginLeft: 6 }}>{s.email}</span>
                    <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                      {t.registeredOn ?? 'Registered'} {new Date(s.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      {!s.signup_org && <span style={{ color: 'var(--c-warning)', marginLeft: 6 }}>{t.noOrgSelected ?? 'no org selected'}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleConfirmEmail(s.user_id)} disabled={busy}
                    style={{ fontSize: 12, padding: '4px 12px', border: 'none', borderRadius: 'var(--r1)', background: 'var(--c-success)', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: busy ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                    {t.confirmEmail ?? 'Confirm'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pending join requests */}
          {pendingReqs.length > 0 && (
            <div style={{ padding: '16px 20px' }}>
              <AdminSectionHeader
                icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1v6l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/></svg>}
                title={t.pendingRequests ?? 'Pending requests'} count={pendingReqs.length} />
              {pendingReqs.map((req, i) => (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid var(--bd3)' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)18', color: 'var(--accent)', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {getInitials(req.user_name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)' }}>{req.user_name}</span>
                    <span style={{ fontSize: 12, color: 'var(--tx3)', marginLeft: 6 }}>{req.user_email}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleApprove(req.id)} disabled={busy}
                      style={{ fontSize: 12, padding: '4px 12px', border: 'none', borderRadius: 'var(--r1)', background: 'var(--c-success)', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: busy ? 0.5 : 1 }}>
                      {t.approve ?? 'Approve'}
                    </button>
                    <button onClick={() => handleReject(req.id)} disabled={busy}
                      style={{ fontSize: 12, padding: '4px 12px', border: '1px solid var(--c-danger)30', borderRadius: 'var(--r1)', background: 'none', color: 'var(--c-danger)', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
                      {t.reject ?? 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk actions bar (above the table when admin + selections) */}
      {editing && selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', marginBottom: 8, background: 'var(--accent)08', border: '1px solid var(--accent)30', borderRadius: 'var(--r2)' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)' }}>{t.selectedCount(selectedIds.size)}</span>
          <div style={{ flex: 1 }} />
          <select value={bulkRole} onChange={e => setBulkRole(e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', cursor: 'pointer' }}>
            {ROLES.map(r => <option key={r} value={r}>{t[`role${r.charAt(0).toUpperCase() + r.slice(1)}`]}</option>)}
          </select>
          <button onClick={handleBulkRoleChange} disabled={busy}
            style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', border: 'none', borderRadius: 'var(--r1)', background: 'var(--accent)', color: '#fff', cursor: 'pointer', opacity: busy ? 0.5 : 1 }}>
            {t.bulkChangeRole}
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            style={{ fontSize: 11, color: 'var(--tx3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
        </div>
      )}

      {/* ── Members display ────────────────────────────────────── */}
      {view === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filteredUsers.map(u => (
            <MemberCard key={u.id} u={u} userTasks={userStatsMap[u.id]?.tasks ?? []} projects={projects} t={t} />
          ))}
        </div>
      ) : (
        <div style={{ borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {/* List header */}
          <div style={{ display: 'grid', gridTemplateColumns: editing ? adminCols : baseCols, gap: 6, alignItems: 'center', padding: '8px 14px', background: 'var(--bg2)', borderBottom: '1px solid var(--bd3)' }}>
            {editing && <div />}
            <div />
            <SortHeader label={t.lastName ?? 'Last name'} field="last" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label={t.firstName ?? 'First name'} field="first" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</div>
            <SortHeader label="Role" field="role" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label={t.openTasks} field="open" sortField={sortField} sortDir={sortDir} onSort={handleSort} style={{ justifyContent: 'center' }} />
            <SortHeader label={t.overdueLabel} field="overdue" sortField={sortField} sortDir={sortDir} onSort={handleSort} style={{ justifyContent: 'center' }} />
            <SortHeader label={t.completed} field="done" sortField={sortField} sortDir={sortDir} onSort={handleSort} style={{ justifyContent: 'center' }} />
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.projects}</div>
            {editing && <div />}
          </div>

          {/* Rows */}
          {sortedUsers.map((u, i) => {
            const s = userStatsMap[u.id] ?? { tasks: [], open: 0, overdue: 0, done: 0 }
            const { first, last } = splitName(u.name)
            const userProjs = [...new Set(s.tasks.map(task => task.pid))]
              .map(id => projects.find(p => p.id === id)).filter(Boolean)
            const isSelf = u.id === currentUser?.id
            const canEdit = !isSelf && isUUID(u.id)

            return (
              <div key={u.id}
                style={{ display: 'grid', gridTemplateColumns: editing ? adminCols : baseCols, gap: 6, alignItems: 'center',
                  padding: '7px 14px', background: i % 2 ? 'var(--bg2)' : 'var(--bg1)',
                  borderBottom: '1px solid var(--bd3)' }}>
                {/* Checkbox (admin only) */}
                {editing && (
                  <div>
                    {canEdit && (
                      <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)}
                        style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--accent)' }} />
                    )}
                  </div>
                )}
                {/* Avatar */}
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: u.color, color: '#fff', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {getInitials(u.name)}
                </div>
                {/* Last name */}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)', ...COL_STYLE }}>
                  {last || first}
                </div>
                {/* First name */}
                <div style={{ fontSize: 13, color: 'var(--tx1)', ...COL_STYLE }}>
                  {last ? first : ''}
                </div>
                {/* Email */}
                <div style={{ fontSize: 12, color: 'var(--tx3)', ...COL_STYLE }}>{u.email}</div>
                {/* Role — badge or dropdown in admin mode */}
                <div>
                  {editing && canEdit ? (
                    <select value={u.role} onChange={e => handleRoleChange(u, e.target.value)} disabled={busy}
                      style={{ padding: '2px 4px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx1)', fontSize: 11, cursor: 'pointer', width: '100%' }}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <RoleBadge role={u.role} />
                  )}
                </div>
                {/* Open */}
                <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--tx1)' }}>{s.open}</div>
                {/* Overdue */}
                <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: s.overdue ? 'var(--c-danger)' : 'var(--tx3)' }}>{s.overdue}</div>
                {/* Completed */}
                <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--c-success)' }}>{s.done}</div>
                {/* Projects */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minWidth: 0 }}>
                  {userProjs.slice(0, 3).map(p => (
                    <span key={p.id} style={{ fontSize: 10, color: p.color, background: p.color + '18', padding: '2px 7px', borderRadius: 'var(--r1)', fontWeight: 500, whiteSpace: 'nowrap' }}>{p.name}</span>
                  ))}
                  {userProjs.length > 3 && <span style={{ fontSize: 10, color: 'var(--tx3)' }}>+{userProjs.length - 3}</span>}
                  {userProjs.length === 0 && <span style={{ fontSize: 11, color: 'var(--tx3)', fontStyle: 'italic' }}>—</span>}
                </div>
                {/* Actions (admin only) */}
                {editing && (
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {canEdit && (
                      <>
                        <button onClick={() => handleRemove(u)} disabled={busy} title={t.removeMember}
                          style={{ fontSize: 11, color: 'var(--tx2)', background: 'none', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', padding: '2px 6px', cursor: 'pointer', opacity: busy ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                          {t.removeMember}
                        </button>
                        <button onClick={() => setConfirmDelete(u)} disabled={busy} title={t.deleteAccount ?? 'Delete'}
                          style={{ fontSize: 11, color: '#fff', background: 'var(--c-danger)', border: 'none', borderRadius: 'var(--r1)', padding: '2px 6px', cursor: 'pointer', fontWeight: 600, opacity: busy ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                          {t.deleteAccount ?? 'Delete'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {sortedUsers.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'var(--tx3)', fontStyle: 'italic' }}>{t.noResults ?? 'No results'}</div>
          )}
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`${t.confirmDeleteAccount ?? 'Permanently delete the account of'} "${confirmDelete.name}" (${confirmDelete.email})? ${t.cannotUndo ?? 'This cannot be undone.'}`}
          onConfirm={() => handleDeleteAccount(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
