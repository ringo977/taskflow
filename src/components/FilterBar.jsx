import { useState, useEffect, useRef } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import { usePartners } from '@/hooks/usePartners'
import { useWorkpackages } from '@/hooks/useWorkpackages'
import { useMilestones } from '@/hooks/useMilestones'

const EMPTY = { q: '', pri: 'all', who: 'all', due: 'all', done: 'all', tag: 'all', partner: 'all', wp: 'all', ms: 'all' }

export default function FilterBar({ filters, setFilters, tasks = [], orgId, projectId }) {
  const t = useLang()
  const orgUsers = useOrgUsers()
  const memberNames = orgUsers.map(u => u.name)
  const active = Object.values(filters).some(v => v && v !== 'all' && v !== '')

  const { orgPartners } = usePartners(orgId, projectId)
  const { workpackages } = useWorkpackages(orgId, projectId)
  const { milestones } = useMilestones(orgId, projectId)
  const allTags = [...new Map(tasks.flatMap(tk => tk.tags ?? []).map(tg => [tg.name, tg])).values()]

  const [localQ, setLocalQ] = useState(filters.q || '')
  const debounceRef = useRef(null)

  useEffect(() => { setLocalQ(filters.q || '') }, [filters.q])

  const onSearch = (value) => {
    setLocalQ(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters(f => ({ ...f, q: value }))
    }, 200)
  }

  const clearSearch = () => {
    setLocalQ('')
    clearTimeout(debounceRef.current)
    setFilters(f => ({ ...f, q: '' }))
  }

  return (
    <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--bd3)', background: 'var(--bg1)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg2)', borderRadius: 'var(--r1)', padding: '7px 12px', border: '1px solid var(--bd3)', flex: 1, minWidth: 160 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="var(--tx3)" strokeWidth="1.4"/><path d="M10.5 10.5L14 14" stroke="var(--tx3)" strokeWidth="1.4" strokeLinecap="round"/></svg>
        <input value={localQ} onChange={e => onSearch(e.target.value)} placeholder={t.search} aria-label={t.search}
          style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 13, flex: 1, outline: 'none' }} />
        {localQ && <span onClick={clearSearch} style={{ cursor: 'pointer', color: 'var(--tx3)', fontSize: 15, lineHeight: 1 }}>✕</span>}
      </div>
      <select value={filters.pri || 'all'} onChange={e => setFilters(f => ({ ...f, pri: e.target.value }))} aria-label={t.priority} style={{ fontSize: 13, padding: '7px 10px' }}><option value="all">{t.priority}</option><option value="high">{t.high}</option><option value="medium">{t.medium}</option><option value="low">{t.low}</option></select>
      <select value={filters.who || 'all'} onChange={e => setFilters(f => ({ ...f, who: e.target.value }))} aria-label={t.assigned} style={{ fontSize: 13, padding: '7px 10px' }}><option value="all">{t.assigned}</option>{memberNames.map(m => <option key={m}>{m}</option>)}</select>
      <select value={filters.due || 'all'} onChange={e => setFilters(f => ({ ...f, due: e.target.value }))} aria-label={t.deadline} style={{ fontSize: 13, padding: '7px 10px' }}><option value="all">{t.deadline}</option><option value="overdue">{t.overdueGroup}</option><option value="today">{t.today}</option><option value="week">{t.week}</option></select>
      <select value={filters.done || 'all'} onChange={e => setFilters(f => ({ ...f, done: e.target.value }))} aria-label={t.stateAll} style={{ fontSize: 13, padding: '7px 10px' }}><option value="all">{t.stateAll}</option><option value="open">{t.stateOpen}</option><option value="done">{t.stateDone}</option></select>
      {allTags.length > 0 && (
        <select value={filters.tag || 'all'} onChange={e => setFilters(f => ({ ...f, tag: e.target.value }))} aria-label={t.tags ?? 'Tags'} style={{ fontSize: 13, padding: '7px 10px' }}>
          <option value="all">{t.tags ?? 'Tags'}</option>
          {allTags.map(tg => <option key={tg.name} value={tg.name}>{tg.name}</option>)}
        </select>
      )}
      {orgPartners.length > 0 && (
        <select value={filters.partner || 'all'} onChange={e => setFilters(f => ({ ...f, partner: e.target.value }))} aria-label={t.partnerTeam ?? 'Partner'} style={{ fontSize: 13, padding: '7px 10px' }}>
          <option value="all">{t.partnerTeam ?? 'Partner'}</option>
          {orgPartners.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      {workpackages.length > 0 && (
        <select value={filters.wp || 'all'} onChange={e => setFilters(f => ({ ...f, wp: e.target.value }))} aria-label={t.workpackage ?? 'Workpackage'} style={{ fontSize: 13, padding: '7px 10px' }}>
          <option value="all">{t.workpackage ?? 'WP'}</option>
          {workpackages.filter(w => w.isActive).map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
        </select>
      )}
      {milestones.length > 0 && (
        <select value={filters.ms || 'all'} onChange={e => setFilters(f => ({ ...f, ms: e.target.value }))} aria-label={t.milestone ?? 'Milestone'} style={{ fontSize: 13, padding: '7px 10px' }}>
          <option value="all">{t.milestone ?? 'MS'}</option>
          {milestones.filter(m => m.isActive).map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
        </select>
      )}
      {active && <button onClick={() => setFilters(EMPTY)} style={{ fontSize: 12, padding: '5px 10px', color: 'var(--c-danger)', borderColor: 'var(--bd2)' }}>{t.resetFilters}</button>}
    </div>
  )
}
