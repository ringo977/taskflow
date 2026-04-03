import { useState, useEffect } from 'react'
import { enrollTotp, verifyTotp, getFactors } from '@/lib/auth'

export default function MfaPage({ onComplete, lang }) {
  const [step, setStep]       = useState('loading')
  const [qrCode, setQrCode]   = useState('')
  const [secret, setSecret]   = useState('')
  const [factorId, setFactorId] = useState('')
  const [code, setCode]       = useState('')
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)
  const isIt = lang === 'it'

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (step === 'loading') {
        setErr('Timeout. Verifica che MFA/TOTP sia abilitato in Supabase Dashboard → Authentication → Multi-Factor.')
        setStep('error')
      }
    }, 8000)

    enrollTotp()
      .then(data => {
        clearTimeout(timeout)
        setQrCode(data.totp.qr_code)
        setSecret(data.totp.secret)
        setFactorId(data.id)
        setStep('enroll')
      })
      .catch(e => {
        clearTimeout(timeout)
        if (e.message?.includes('already')) {
          getFactors().then(factors => {
            if (factors.length > 0) { setFactorId(factors[0].id); setStep('verify') }
            else { setErr(e.message); setStep('error') }
          }).catch(e2 => { setErr(e2.message); setStep('error') })
        } else {
          setErr(e.message)
          setStep('error')
        }
      })

    return () => clearTimeout(timeout)
  // Mount-only: MFA enrollment must run once. All missing deps are stable
  // state setters (setQrCode, setSecret, setFactorId, setStep, setErr).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doVerify = async () => {
    if (code.length < 6) return
    setErr(''); setLoading(true)
    try {
      await verifyTotp(factorId, code)
      onComplete()
    } catch {
      setErr(isIt ? 'Codice non valido. Riprova.' : 'Invalid code. Try again.')
      setCode('')
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', padding: 20, zIndex: 10 }}>
      <div style={{ width: 400, background: 'var(--bg1)', borderRadius: 'var(--r3)', border: '1px solid var(--bd3)', padding: '40px 36px', boxShadow: 'var(--shadow-lg)' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
            <rect x="1"  y="3.5"  width="10" height="3.5" rx="1.5" fill="var(--tx1)"/>
            <rect x="4"  y="9"    width="10" height="3.5" rx="1.5" fill="var(--tx1)" opacity="0.7"/>
            <rect x="7"  y="14.5" width="9"  height="3"   rx="1.5" fill="var(--tx1)" opacity="0.45"/>
            <path d="M14 2.5L17.5 6L14 9.5" stroke="var(--tx1)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
          </svg>
          <span style={{ fontWeight: 600, fontSize: 20, color: 'var(--tx1)', letterSpacing: '-0.01em' }}>TaskFlow</span>
        </div>

        {step === 'loading' && (
          <div style={{ fontSize: 14, color: 'var(--tx3)' }}>{isIt ? 'Caricamento…' : 'Loading…'}</div>
        )}

        {step === 'error' && (
          <>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--tx1)', marginBottom: 14 }}>
              {isIt ? 'Errore configurazione 2FA' : '2FA setup error'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-danger)', background: 'var(--bg-danger)', borderRadius: 'var(--r1)', padding: '12px 14px', marginBottom: 18 }}>
              {err}
            </div>
            <button onClick={onComplete} style={{ fontSize: 14, padding: '8px 16px' }}>
              {isIt ? 'Continua senza 2FA' : 'Continue without 2FA'}
            </button>
          </>
        )}

        {step === 'enroll' && (
          <>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx1)', marginBottom: 8, letterSpacing: '-0.01em' }}>
              {isIt ? 'Configura doppio fattore' : 'Set up two-factor auth'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--tx3)', marginBottom: 22, lineHeight: 1.65, whiteSpace: 'pre-line' }}>
              {isIt
                ? '1. Apri Google Authenticator sul telefono\n2. Premi + → Scansiona codice QR\n3. Inquadra il codice qui sotto'
                : '1. Open Google Authenticator on your phone\n2. Tap + → Scan QR code\n3. Point your camera at the code below'}
            </div>

            {qrCode && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <img src={qrCode} alt="QR TOTP" width={180} height={180}
                  style={{ borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', background: '#fff' }} />
              </div>
            )}

            <div style={{ marginBottom: 22, padding: '10px 14px', background: 'var(--bg2)', borderRadius: 'var(--r1)', fontSize: 12, color: 'var(--tx3)', lineHeight: 1.6 }}>
              {isIt ? 'Codice manuale: ' : 'Manual entry: '}
              <span style={{ fontFamily: 'monospace', color: 'var(--tx2)', wordBreak: 'break-all' }}>{secret}</span>
            </div>

            <div style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: 12 }}>
              {isIt ? 'Inserisci il codice a 6 cifre per confermare:' : 'Enter the 6-digit code to confirm:'}
            </div>
          </>
        )}

        {step === 'verify' && (
          <>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx1)', marginBottom: 8, letterSpacing: '-0.01em' }}>
              {isIt ? 'Verifica identità' : 'Verify your identity'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--tx3)', marginBottom: 22 }}>
              {isIt ? 'Inserisci il codice da Google Authenticator:' : 'Enter the code from Google Authenticator:'}
            </div>
          </>
        )}

        {(step === 'enroll' || step === 'verify') && (
          <>
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000 000"
              data-testid="input-mfa"
              maxLength={6}
              autoFocus
              style={{ width: '100%', fontSize: 28, letterSpacing: '0.3em', textAlign: 'center', padding: '12px', fontVariantNumeric: 'tabular-nums', marginBottom: 14, borderRadius: 'var(--r1)' }}
              onKeyDown={e => e.key === 'Enter' && doVerify()}
            />

            {err && (
              <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--c-danger)', background: 'var(--bg-danger)', borderRadius: 'var(--r1)', padding: '10px 14px' }}>
                {err}
              </div>
            )}

            <button
              onClick={doVerify}
              disabled={loading || code.length < 6}
              data-testid="btn-mfa-verify"
              style={{
                width: '100%', padding: '12px',
                background: code.length === 6 ? 'var(--tx1)' : 'var(--bg2)',
                color: code.length === 6 ? 'var(--bg1)' : 'var(--tx3)',
                border: 'none', borderRadius: 'var(--r1)',
                fontWeight: 600, fontSize: 15,
                cursor: code.length < 6 ? 'not-allowed' : 'pointer',
              }}
            >
              {loading
                ? (isIt ? 'Verifica…' : 'Verifying…')
                : step === 'enroll'
                  ? (isIt ? 'Conferma e accedi' : 'Confirm & continue')
                  : (isIt ? 'Verifica' : 'Verify')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
