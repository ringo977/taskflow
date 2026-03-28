import { useState } from 'react'
import { useLang } from '@/i18n'
import { signIn, signUp } from '@/lib/auth'
import { INITIAL_ORGS } from '@/data/orgs'
import { signupOrgStorage } from '@/utils/storage'

const inputStyle = { width: '100%', fontSize: '14px', padding: '10px 14px', borderRadius: 'var(--r1)' }
const labelStyle = { fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }

export default function LoginPage({ lang, setLang }) {
  const _t = useLang()
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [pass2, setPass2]     = useState('')
  const [firstName, setFirst] = useState('')
  const [lastName, setLast]   = useState('')
  const [orgId, setOrgId]     = useState(INITIAL_ORGS[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')
  const [info, setInfo]       = useState('')

  const isIt = lang === 'it'

  const doLogin = async () => {
    setErr(''); setLoading(true)
    try {
      await signIn(email.trim(), pass)
    } catch (e) {
      setErr(e.message)
      setLoading(false)
    }
  }

  const doSignUp = async () => {
    setErr('')
    if (!firstName.trim() || !lastName.trim()) {
      setErr(isIt ? 'Nome e cognome sono obbligatori.' : 'First and last name are required.')
      return
    }
    if (pass !== pass2) { setErr(isIt ? 'Le password non coincidono.' : 'Passwords do not match.'); return }
    if (pass.length < 8) { setErr(isIt ? 'Password minimo 8 caratteri.' : 'Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      await signUp(email.trim(), pass, { firstName: firstName.trim(), lastName: lastName.trim(), orgId })
      if (orgId) {
        signupOrgStorage.set(orgId)
      }
      setInfo(isIt
        ? 'Account creato. Controlla la tua email per il link di conferma, poi torna qui ad accedere.'
        : 'Account created. Check your email for the confirmation link, then come back to sign in.')
      setMode('login')
    } catch (e) {
      setErr(e.message)
    }
    setLoading(false)
  }

  const canSubmit = mode === 'login'
    ? email && pass
    : email && pass && pass2 && firstName.trim() && lastName.trim()

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', padding: 20, zIndex: 10, overflowY: 'auto' }}>
      <div style={{ width: 380, maxWidth: '100%', background: 'var(--bg1)', borderRadius: 'var(--r3)', border: '1px solid var(--bd3)', padding: '36px 32px', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 14, margin: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="3.5" width="10" height="3.5" rx="1.5" fill="var(--tx1)"/>
              <rect x="4" y="9" width="10" height="3.5" rx="1.5" fill="var(--tx1)" opacity="0.7"/>
              <rect x="7" y="14.5" width="9" height="3" rx="1.5" fill="var(--tx1)" opacity="0.45"/>
              <path d="M14 2.5L17.5 6L14 9.5" stroke="var(--tx1)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
            </svg>
            <span style={{ fontWeight: 500, fontSize: 20, color: 'var(--tx1)' }}>TaskFlow</span>
          </div>
          <button onClick={() => setLang(l => l === 'it' ? 'en' : 'it')}
            style={{ fontSize: 11, padding: '3px 9px', color: 'var(--tx3)', borderColor: 'var(--bd3)' }}>
            {isIt ? 'EN' : 'IT'}
          </button>
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--tx1)' }}>
          {mode === 'login' ? (isIt ? 'Accedi' : 'Sign in') : (isIt ? 'Crea account' : 'Create account')}
        </div>

        {info && (
          <div style={{ padding: '10px 14px', background: 'var(--bg-success)', border: '1px solid var(--bd-success)', borderRadius: 'var(--r1)', fontSize: 13, color: 'var(--tx-success)', lineHeight: 1.6 }}>
            {info}
          </div>
        )}

        {/* Name fields (signup only) */}
        {mode === 'signup' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{isIt ? 'Nome' : 'First name'}</label>
              <input value={firstName} onChange={e => setFirst(e.target.value)} placeholder="John" style={inputStyle} autoComplete="given-name" autoFocus />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{isIt ? 'Cognome' : 'Last name'}</label>
              <input value={lastName} onChange={e => setLast(e.target.value)} placeholder="Doe" style={inputStyle} autoComplete="family-name" />
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john.doe@email.com"
            style={inputStyle} autoComplete="email" onKeyDown={e => e.key === 'Enter' && mode === 'login' && doLogin()} />
        </div>

        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)}
            placeholder={mode === 'signup' ? (isIt ? 'Min. 8 caratteri' : 'Min. 8 characters') : '••••••••'}
            style={inputStyle} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            onKeyDown={e => e.key === 'Enter' && mode === 'login' && doLogin()} />
        </div>

        {mode === 'signup' && (
          <>
            <div>
              <label style={labelStyle}>{isIt ? 'Conferma password' : 'Confirm password'}</label>
              <input type="password" value={pass2} onChange={e => setPass2(e.target.value)}
                placeholder={isIt ? 'Ripeti password' : 'Repeat password'}
                style={inputStyle} autoComplete="new-password" />
            </div>

            {/* Org selection */}
            <div>
              <label style={labelStyle}>{isIt ? 'Organizzazione' : 'Organization'}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {INITIAL_ORGS.map(org => (
                  <div
                    key={org.id}
                    onClick={() => setOrgId(org.id)}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 'var(--r1)', cursor: 'pointer',
                      border: `2px solid ${orgId === org.id ? org.color : 'var(--bd3)'}`,
                      background: orgId === org.id ? org.color + '12' : 'var(--bg2)',
                      transition: 'all .15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: orgId === org.id ? org.color : 'var(--tx1)' }}>
                      {org.shortName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{org.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {err && (
          <div style={{ fontSize: 13, color: 'var(--c-danger)', background: 'var(--bg-danger)', borderRadius: 'var(--r1)', padding: '8px 12px' }}>
            {err}
          </div>
        )}

        <button
          onClick={mode === 'login' ? doLogin : doSignUp}
          disabled={loading || !canSubmit}
          style={{
            width: '100%', padding: '10px 20px',
            background: 'var(--c-brand)', color: '#fff',
            border: 'none', borderRadius: 'var(--r1)',
            fontWeight: 600, fontSize: 14,
            cursor: (loading || !canSubmit) ? 'not-allowed' : 'pointer',
            opacity: (loading || !canSubmit) ? 0.6 : 1,
          }}
        >
          {loading
            ? (isIt ? 'Attendere…' : 'Please wait…')
            : mode === 'login'
              ? (isIt ? 'Accedi' : 'Sign in')
              : (isIt ? 'Crea account' : 'Create account')}
        </button>

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--tx3)' }}>
          {mode === 'login' ? (
            <>
              {isIt ? 'Non hai un account? ' : 'No account? '}
              <span onClick={() => { setMode('signup'); setErr(''); setInfo('') }}
                style={{ color: 'var(--tx-info)', cursor: 'pointer', textDecoration: 'underline' }}>
                {isIt ? 'Registrati' : 'Sign up'}
              </span>
            </>
          ) : (
            <>
              {isIt ? 'Hai già un account? ' : 'Already have an account? '}
              <span onClick={() => { setMode('login'); setErr(''); setInfo('') }}
                style={{ color: 'var(--tx-info)', cursor: 'pointer', textDecoration: 'underline' }}>
                {isIt ? 'Accedi' : 'Sign in'}
              </span>
            </>
          )}
        </div>

        <div style={{ padding: '12px 14px', background: 'var(--bg2)', borderRadius: 'var(--r1)', fontSize: 12, color: 'var(--tx3)', lineHeight: 1.6 }}>
          {isIt
            ? 'Dopo il primo accesso ti verrà chiesto di configurare il doppio fattore con Google Authenticator o Authy.'
            : 'After first sign-in you will be asked to set up two-factor auth with Google Authenticator or Authy.'}
        </div>
      </div>
    </div>
  )
}
