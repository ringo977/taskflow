import { useState } from 'react'
import { useLang } from '@/i18n'
import { signIn, signUp } from '@/lib/auth'

export default function LoginPage({ lang, setLang }) {
  const t = useLang()
  const [mode, setMode]       = useState('login')   // 'login' | 'signup'
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [pass2, setPass2]     = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')
  const [info, setInfo]       = useState('')

  const isIt = lang === 'it'

  const doLogin = async () => {
    setErr(''); setLoading(true)
    try {
      await signIn(email.trim(), pass)
      // onAuthStateChange in App.jsx gestisce il resto
    } catch (e) {
      setErr(e.message)
      setLoading(false)
    }
  }

  const doSignUp = async () => {
    setErr('')
    if (pass !== pass2) { setErr(isIt ? 'Le password non coincidono.' : 'Passwords do not match.'); return }
    if (pass.length < 8) { setErr(isIt ? 'Password minimo 8 caratteri.' : 'Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      await signUp(email.trim(), pass)
      setInfo(isIt
        ? 'Account creato. Controlla la tua email per il link di conferma, poi torna qui ad accedere.'
        : 'Account created. Check your email for the confirmation link, then come back to sign in.')
      setMode('login')
    } catch (e) {
      setErr(e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', margin: '-20px', padding: 20 }}>
      <div style={{ width: 380, background: 'var(--bg1)', borderRadius: 'var(--r3)', border: '1px solid var(--bd3)', padding: '36px 32px', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
              <rect x="1"  y="3.5"  width="10" height="3.5" rx="1.5" fill="var(--tx1)"/>
              <rect x="4"  y="9"    width="10" height="3.5" rx="1.5" fill="var(--tx1)" opacity="0.7"/>
              <rect x="7"  y="14.5" width="9"  height="3"   rx="1.5" fill="var(--tx1)" opacity="0.45"/>
              <path d="M14 2.5L17.5 6L14 9.5" stroke="var(--tx1)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
            </svg>
            <span style={{ fontWeight: 500, fontSize: 20, color: 'var(--tx1)' }}>TaskFlow</span>
          </div>
          <button onClick={() => setLang(l => l === 'it' ? 'en' : 'it')}
            style={{ fontSize: 11, padding: '3px 9px', color: 'var(--tx3)', borderColor: 'var(--bd3)' }}>
            {isIt ? 'EN' : 'IT'}
          </button>
        </div>

        {/* Title */}
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--tx1)' }}>
          {mode === 'login'
            ? (isIt ? 'Accedi' : 'Sign in')
            : (isIt ? 'Crea account' : 'Create account')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx3)' }}>
          MiMic Lab · BiomimX Srl
        </div>

        {/* Info banner */}
        {info && (
          <div style={{ padding: '10px 14px', background: 'var(--bg-success)', border: '1px solid var(--bd-success)', borderRadius: 'var(--r1)', fontSize: 13, color: 'var(--tx-success)', lineHeight: 1.6 }}>
            {info}
          </div>
        )}

        {/* Email */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isIt ? 'Email' : 'Email'}
          </label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder={isIt ? 'nome@polimi.it' : 'name@biomimx.com'}
            style={{ width: '100%', fontSize: '14px', padding: '10px 14px', borderRadius: 'var(--r1)' }}
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? doLogin() : null)}
          />
        </div>

        {/* Password */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isIt ? 'Password' : 'Password'}
          </label>
          <input
            type="password" value={pass} onChange={e => setPass(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', fontSize: '14px', padding: '10px 14px', borderRadius: 'var(--r1)' }}
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? doLogin() : null)}
          />
        </div>

        {/* Confirm password (signup only) */}
        {mode === 'signup' && (
          <div>
            <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isIt ? 'Conferma password' : 'Confirm password'}
            </label>
            <input
              type="password" value={pass2} onChange={e => setPass2(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', fontSize: '14px', padding: '10px 14px', borderRadius: 'var(--r1)' }}
              onKeyDown={e => e.key === 'Enter' && doSignUp()}
            />
          </div>
        )}

        {/* Error */}
        {err && (
          <div style={{ fontSize: 13, color: 'var(--c-danger)', background: 'var(--bg-danger)', borderRadius: 'var(--r1)', padding: '8px 12px' }}>
            {err}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={mode === 'login' ? doLogin : doSignUp}
          disabled={loading || !email || !pass}
          style={{
            width: '100%', padding: '10px 20px',
            background: 'var(--c-brand)', color: '#fff',
            border: 'none', borderRadius: 'var(--r1)',
            fontWeight: 600, fontSize: 14,
            cursor: (loading || !email || !pass) ? 'not-allowed' : 'pointer',
            opacity: (loading || !email || !pass) ? 0.6 : 1,
          }}
        >
          {loading
            ? (isIt ? 'Attendere…' : 'Please wait…')
            : mode === 'login'
              ? (isIt ? 'Accedi' : 'Sign in')
              : (isIt ? 'Crea account' : 'Create account')}
        </button>

        {/* Mode switch */}
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

        {/* TOTP info */}
        <div style={{ padding: '12px 14px', background: 'var(--bg2)', borderRadius: 'var(--r1)', fontSize: 12, color: 'var(--tx3)', lineHeight: 1.6 }}>
          {isIt
            ? 'Dopo il primo accesso ti verrà chiesto di configurare il doppio fattore con Google Authenticator o Authy.'
            : 'After first sign-in you will be asked to set up two-factor auth with Google Authenticator or Authy.'}
        </div>
      </div>
    </div>
  )
}
