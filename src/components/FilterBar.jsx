import { useState, useEffect, useRef } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import { usePartners } from '@/hooks/usePartners'
import { useWorkpackages } from '@/hooks/useWorkpackages'
import { useMilestones } from '@/hooks/useMilestones'

const EMPTY = { q: '', pri: 'all', who: 'all', due: 'all', done: 'all', tag: 'all', partner: 'all', wp: 'all', ms: 'all' }

export default function FilterBar({ filters, setFilters, tasks = [], orgId, projectId, groupBy, onGroupByChange }) {
  const t = useLang()
  const orgUsers = useOrgUsers()
  const memberNames = orgUsers.map(u => u.name)
  const activeCount = Object.entries(filters).filter(([k, v]) => k !== 'q' && v && v !== 'all').length
  const active = activeCount > 0 || (filters.q && filters.q !== '')

  const { orgPartners } = usePartners(orgId, projectId)
  const { workpackages } = useWorkpackages(orgId, projectId)
  const { milestones } = useMilestones(orgId, projectId)
  const allTags = [...new Map(tasks.flatMap(tk => tk.tags ?? []).map(tg => [tg.name, tg])).values()]

  const [localQ, setLocalQ] = useState(filters.q || '')
  const [collapsed, setCollapsed] = useState(false)
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

  // ── Collapsed mode: compact bar with filter icon + count ──
  if (collapsed) {
    return (
      <div style={{ padding: '6px 18px', borderBottom: '1px solid var(--bd3)', background: 'var(--bg1)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={() => setCollapsed(false)} aria-label={t.showFilters ?? 'Show filters'}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--r1)', color: active ? 'var(--accent)' : 'var(--tx3)', fontSize: 12, fontWeight: active ? 600 : 400 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 3h14M3 8h10M5 13h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          {t.filters ?? 'Filters'}
          {activeCount > 0 && (
            <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 8, padding: '1px 6px', fontSize: 10, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{activeCount}</span>
          )}
        </button>
        {/* Always show search even when collapsed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg2)', borderRadius: 'var(--r1)', padding: '5px 10px', border: '1px solid var(--bd3)', flex: 1, minWidth: 120 }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="var(--tx3)" strokeWidth="1.4"/><path d="M10.5 10.5L14 14" stroke="var(--tx3)" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <input value={localQ} onChange={e => onSearch(e.target.value)} placeholder={t.search} aria-label={t.search}
            style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 12, flex: 1, outline: 'none' }} />
          {localQ && <span onClick={clearSearch} style={{ cursor: 'pointer', color: 'var(--tx3)', fontSize: 14, lineHeight: 1 }}>✕</span>}
        </div>
        {/* GroupBy always visible */}
        {onGroupByChange && (
          <select value={groupBy ?? 'section'} onChange={e => onGroupByChange(e.target.value)} aria-label={t.groupBy ?? 'Group by'} style={{ fontSize: 12, padding: '5px 8px', fontWeight: groupBy && groupBy !== 'section' ? 600 : 400, color: groupBy && groupBy !== 'section' ? 'var(--accent)' : undefined }}>
            <option value="section">{t.groupBySection ?? 'Group: Section'}</option>
            {workpackages.length > 0 && <option value="wp">{t.groupByWp ?? 'Group: WP'}</option>}
            {milestones.length > 0 && <option value="milestone">{t.groupByMilestone ?? 'Group: Milestone'}</option>}
            <option value="assignee">{t.groupByAssignee ?? 'Group: Assignee'}</option>
            <option value="priority">{t.groupByPriority ?? 'Group: Priority'}</option>
            {orgPartners.length > 0 && <option value="partner">{t.groupByPartner ?? 'Group: Partner'}</option>}
          </select>
        )}
      </div>
    )
  }

  // ── Expanded mode (full filter bar) ───────────────────────
  return (
    <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--bd3)', background: 'var(--bg1)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
      {/* Collapse button */}
      <button onClick={() => setCollapsed(true)} aria-label={t.hideFilters ?? 'Hide filters'}
        style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--tx3)', fontSize: 12 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 3h14M3 8h10M5 13h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      </button>
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
      {onGroupByChange && (
        <select value={groupBy ?? 'section'} onChange={e => onGroupByChange(e.target.value)} aria-label={t.groupBy ?? 'Group by'} style={{ fontSize: 13, padding: '7px 10px', fontWeight: groupBy && groupBy !== 'section' ? 600 : 400, color: groupBy && groupBy !== 'section' ? 'var(--accent)' : undefined }}>
          <option value="section">{t.groupBySection ?? 'Group: Section'}</option>
          {workpackages.length > 0 && <option value="wp">{t.groupByWp ?? 'Group: WP'}</option>}
          {milestones.length > 0 && <option value="milestone">{t.groupByMilestone ?? 'Group: Milestone'}</option>}
          <option value="assignee">{t.groupByAssignee ?? 'Group: Assignee'}</option>
          <option value="priority">{t.groupByPriority ?? 'Group: Priority'}</option>
          {orgPartners.length > 0 && <option value="partner">{t.groupByPartner ?? 'Group: Partner'}</option>}
        </select>
      )}
      {active && <button onClick={() => setFilters(EMPTY)} style={{ fontSize: 12, padding: '5px 10px', color: 'var(--c-danger)', borderColor: 'var(--bd2)' }}>{t.resetFilters}</button>}
    </div>
  )
}
