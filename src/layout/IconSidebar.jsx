import { useState } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import { useInbox } from '@/context/InboxCtx'
import { getInitials } from '@/utils/initials'
import ConfirmModal from '@/components/ConfirmModal'
import OrgSwitcher from './OrgSwitcher'

export function TFLogo({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="1"  y="3.5" width="10" height="3.5" rx="1.5" fill={color}/>
      <rect x="4"  y="9"   width="10" height="3.5" rx="1.5" fill={color} opacity="0.7"/>
      <rect x="7"  y="14.5" width="9" height="3"   rx="1.5" fill={color} opacity="0.45"/>
      <path d="M14 2.5L17.5 6L14 9.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
    </svg>
  )
}

const NavIcon = ({ id, label, active, onClick, children }) => (
  <button
    onClick={() => onClick(id)}
    aria-label={label}
    className="hoverable"
    style={{
      width: '100%', padding: '10px 6px', borderRadius: 'var(--r1)', border: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      background: active ? 'var(--bg1)' : 'transparent',
      color: active ? 'var(--tx1)' : 'var(--tx3)', cursor: 'pointer',
      fontWeight: active ? 500 : 400,
    }}
  >
    {children}
    <span style={{ fontSize: 10, lineHeight: 1, textAlign: 'center' }}>{label}</span>
  </button>
)

const DB_CFG = {
  local:    { color: 'var(--c-warning)', tip: { it: 'localStorage', en: 'localStorage' } },
  syncing:  { color: 'var(--c-brand)',   tip: { it: 'Sincronizzazione…', en: 'Syncing…' } },
  supabase: { color: 'var(--c-success)', tip: { it: 'Supabase connesso', en: 'Supabase connected' } },
  error:    { color: 'var(--c-danger)',  tip: { it: 'DB offline', en: 'DB offline' } },
}

export default function IconSidebar({ active, onNav, currentUser, onLogout, lang, setLang, theme, setTheme, orgs, activeOrgId, onSwitchOrg, onAddOrg, onSetup2FA, dbStatus }) {
  const t = useLang()
  const orgUsers = useOrgUsers()
  const { unread } = useInbox()
  const [showLogout, setShowLogout] = useState(false)
  const userColor = orgUsers.find(u => u.name === currentUser.name)?.color ?? '#888'

  const NAV = [
    { id: 'home',       label: t.home,       icon: <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2 6.5L8 2l6 4.5V14H10v-3.5H6V14H2V6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg> },
    { id: 'projects',   label: t.projects,   icon: <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/></svg> },
    { id: 'portfolios', label: t.portfolios, icon: <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2 5h12M2 5v8h12V5M2 5V3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5V5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M6 8h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg> },
    { id: 'mytasks',    label: t.myTasks,    icon: <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> },
    { id: 'people',     label: t.people,     icon: <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M14 13c0-1.86-.93-3.5-2.33-4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
    { id: 'inbox',      label: t.inbox,      icon: <div style={{ position: 'relative' }}><svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2 4.5h12v7.5a1 1 0 01-1 1H3a1 1 0 01-1-1V4.5z" stroke="currentColor" strokeWidth="1.3"/><path d="M2 4.5L8 9l6-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>{unread > 0 && <div style={{ position: 'absolute', top: -3, right: -5, width: 14, height: 14, borderRadius: '50%', background: 'var(--c-danger)', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread > 9 ? '9+' : unread}</div>}</div> },
  ]

  return (
    <div style={{
      width: 68, background: 'var(--bg2)', borderRight: '1px solid var(--bd3)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '12px 0', flexShrink: 0,
    }}>
      <div style={{ marginBottom: 8, padding: '4px 0' }}>
        <TFLogo size={24} color="var(--tx1)" />
      </div>

      <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} onSwitch={onSwitchOrg} onAddOrg={onAddOrg} />

      <div style={{ width: '70%', height: 1, background: 'var(--bd3)', marginBottom: 8 }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 6px' }}>
        {NAV.map(n => (
          <NavIcon key={n.id} id={n.id} label={n.label} active={active === n.id} onClick={onNav}>
            {n.icon}
          </NavIcon>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '10px 0' }}>
        <button
          onClick={() => onSetup2FA()}
          aria-label="2FA"
          className="hoverable"
          style={{ width: 36, height: 36, borderRadius: 'var(--r1)', background: 'var(--bg1)', border: '1px solid var(--bd3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, padding: 0 }}
        >
          🔐
        </button>
        <button
          onClick={() => setLang(l => l === 'it' ? 'en' : 'it')}
          style={{ fontSize: 11, fontWeight: 600, padding: '4px 8px', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', color: 'var(--tx3)', background: 'transparent', cursor: 'pointer' }}
        >
          {lang === 'it' ? 'EN' : 'IT'}
        </button>
        {setTheme && (
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : t === 'light' ? 'auto' : 'dark')}
            aria-label="Theme"
            title={theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'Auto'}
            className="hoverable"
            style={{ width: 36, height: 36, borderRadius: 'var(--r1)', background: 'var(--bg1)', border: '1px solid var(--bd3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, padding: 0 }}
          >
            {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '⚙️'}
          </button>
        )}
        {dbStatus && (() => {
          const db = DB_CFG[dbStatus] ?? DB_CFG.local
          return (
            <div title={db.tip[lang] ?? db.tip.en} style={{ width: 36, height: 36, borderRadius: 'var(--r1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <ellipse cx="8" cy="4" rx="5.5" ry="2.5" stroke={db.color} strokeWidth="1.2" />
                <path d="M2.5 4v4c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5V4" stroke={db.color} strokeWidth="1.2" />
                <path d="M2.5 8v4c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5V8" stroke={db.color} strokeWidth="1.2" />
                {dbStatus === 'syncing' && <circle cx="8" cy="8" r="1.5" fill={db.color}><animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/></circle>}
              </svg>
            </div>
          )
        })()}
        <div
          title={`${currentUser.name} — ${t.logout}`}
          onClick={() => setShowLogout(true)}
          role="button"
          tabIndex={0}
          className="hoverable"
          style={{ width: 36, height: 36, borderRadius: '50%', background: userColor + '28', color: userColor, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          {getInitials(currentUser.name)}
        </div>
      </div>
      {showLogout && (
        <ConfirmModal
          message={t.confirmLogout ?? 'Sign out?'}
          onConfirm={() => { setShowLogout(false); onLogout() }}
          onCancel={() => setShowLogout(false)}
          danger={false}
        />
      )}
    </div>
  )
}
