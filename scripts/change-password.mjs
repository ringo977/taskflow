#!/usr/bin/env node
/**
 * Change password — login + TOTP, poi aggiorna la password.
 *
 * 1. Login con la password attuale
 * 2. Verifica il codice TOTP (raggiunge AAL2, richiesto se MFA è arruolata)
 * 3. Aggiorna la password
 *
 * Usage:
 *   node scripts/change-password.mjs <email> <old-password> <current-6-digit-code> <new-password>
 *
 * Il <current-6-digit-code> è quello che vedi ORA in Google Authenticator.
 * Se l'account non ha MFA, passa - come codice.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? 'https://ygcmvdvoflfslnccwrrf.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnY212ZHZvZmxmc2xuY2N3cnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjQ3NTMsImV4cCI6MjA4OTUwMDc1M30.Abz9C88PL32BpnLKqyewvJRrVoZQ0_KThZ1in5AgmnI'

const [email, oldPassword, currentCode, newPassword] = process.argv.slice(2)
if (!email || !oldPassword || !currentCode || !newPassword) {
  console.error('')
  console.error('  Usage: node scripts/change-password.mjs <email> <old-password> <current-totp-code> <new-password>')
  console.error('')
  console.error('  <current-totp-code> = il codice a 6 cifre che vedi ORA in')
  console.error('  Google Authenticator per TaskFlow (usa - se MFA non è attiva).')
  console.error('')
  process.exit(1)
}

if (newPassword.length < 12) {
  console.error('  ✗ Usa una password di almeno 12 caratteri.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

async function main() {
  // ── 1. Login (AAL1) ────────────────────────────────────────
  console.log(`\n  1/3  Signing in as ${email}...`)
  const { error: signInErr } =
    await supabase.auth.signInWithPassword({ email, password: oldPassword })
  if (signInErr) {
    console.error('  ✗ Login failed:', signInErr.message)
    process.exit(1)
  }
  console.log('  ✓ Logged in')

  // ── 2. Verify TOTP → AAL2 ─────────────────────────────────
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const existing = factors?.totp ?? []

  if (existing.length > 0) {
    if (currentCode === '-') {
      console.error('  ✗ L\'account ha MFA attiva: serve il codice TOTP corrente.')
      process.exit(1)
    }
    console.log('\n  2/3  Verifying TOTP code to reach AAL2...')
    const factor = existing[0]
    const { data: challenge, error: ce } =
      await supabase.auth.mfa.challenge({ factorId: factor.id })
    if (ce) {
      console.error('  ✗ Challenge failed:', ce.message)
      process.exit(1)
    }
    const { error: ve } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code: currentCode,
    })
    if (ve) {
      console.error('  ✗ TOTP verification failed:', ve.message)
      process.exit(1)
    }
    console.log('  ✓ AAL2 reached')
  } else {
    console.log('\n  2/3  No MFA factor enrolled — skipping TOTP step')
  }

  // ── 3. Update password ────────────────────────────────────
  console.log('\n  3/3  Updating password...')
  const { error: upErr } = await supabase.auth.updateUser({ password: newPassword })
  if (upErr) {
    console.error('  ✗ Password update failed:', upErr.message)
    process.exit(1)
  }

  console.log('  ✓ Password aggiornata con successo\n')
  console.log('  Ricorda di aggiornare anche:')
  console.log('    - .env.e2e locale (E2E_PASSWORD)')
  console.log('    - GitHub Secrets → E2E_PASSWORD (se i test e2e-auth sono attivi in CI)\n')

  await supabase.auth.signOut()
}

main().catch(e => {
  console.error('  ✗ Unexpected error:', e.message)
  process.exit(1)
})
