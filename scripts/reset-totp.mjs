#!/usr/bin/env node
/**
 * Reset & re-enroll TOTP — tutto in un unico step.
 *
 * 1. Login con password
 * 2. Verifica il codice TOTP attuale (raggiunge AAL2)
 * 3. Rimuove il vecchio factor
 * 4. Enrolla un nuovo TOTP
 * 5. Genera il codice dal nuovo secret e lo verifica (attiva il factor)
 *
 * Usage:
 *   node scripts/reset-totp.mjs <email> <password> <current-6-digit-code>
 *
 * Il <current-6-digit-code> è quello che vedi ORA in Google Authenticator.
 */

import { createClient } from '@supabase/supabase-js'
import { TOTP } from 'otpauth'

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? 'https://ygcmvdvoflfslnccwrrf.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnY212ZHZvZmxmc2xuY2N3cnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjQ3NTMsImV4cCI6MjA4OTUwMDc1M30.Abz9C88PL32BpnLKqyewvJRrVoZQ0_KThZ1in5AgmnI'

const [email, password, currentCode] = process.argv.slice(2)
if (!email || !password || !currentCode) {
  console.error('')
  console.error('  Usage: node scripts/reset-totp.mjs <email> <password> <current-totp-code>')
  console.error('')
  console.error('  <current-totp-code> = il codice a 6 cifre che vedi ORA')
  console.error('  in Google Authenticator per TaskFlow.')
  console.error('')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

async function main() {
  // ── 1. Login (AAL1) ────────────────────────────────────────
  console.log(`\n  1/5  Signing in as ${email}...`)
  const { error: signInErr } =
    await supabase.auth.signInWithPassword({ email, password })
  if (signInErr) {
    console.error('  ✗ Login failed:', signInErr.message)
    process.exit(1)
  }
  console.log('  ✓ Logged in')

  // ── 2. Verify current TOTP → AAL2 ─────────────────────────
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const existing = factors?.totp ?? []

  if (existing.length > 0) {
    console.log(`\n  2/5  Verifying current code to reach AAL2...`)
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
      code: currentCode.replace(/\s/g, ''),
    })
    if (ve) {
      console.error('  ✗ Verify failed:', ve.message)
      console.error('  Assicurati che il codice sia quello attualmente visibile nell\'app.')
      process.exit(1)
    }
    console.log('  ✓ AAL2 reached')

    // ── 3. Unenroll old factor ─────────────────────────────
    console.log(`\n  3/5  Removing old TOTP factor...`)
    for (const f of existing) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id })
      if (error) {
        console.error(`  ✗ Unenroll failed: ${error.message}`)
        process.exit(1)
      }
    }
    console.log('  ✓ Old factor removed')
  } else {
    console.log('\n  2/5  No existing TOTP — skipping unenroll')
    console.log('  3/5  (skipped)')
  }

  // ── 4. Enroll new TOTP ──────────────────────────────────
  console.log(`\n  4/5  Enrolling new TOTP...`)
  const { data: enrollData, error: enrollErr } =
    await supabase.auth.mfa.enroll({ factorType: 'totp' })
  if (enrollErr) {
    console.error('  ✗ Enroll failed:', enrollErr.message)
    process.exit(1)
  }

  const secret = enrollData.totp.secret
  console.log(`  ✓ New factor created — secret: ${secret}`)

  // ── 5. Verify new factor (same session, activates it) ───
  console.log(`\n  5/5  Activating new factor...`)
  const totp = new TOTP({ secret, digits: 6, period: 30 })
  const newCode = totp.generate()

  const { data: ch2, error: ce2 } =
    await supabase.auth.mfa.challenge({ factorId: enrollData.id })
  if (ce2) {
    console.error('  ✗ Challenge failed:', ce2.message)
    process.exit(1)
  }

  const { error: ve2 } = await supabase.auth.mfa.verify({
    factorId: enrollData.id,
    challengeId: ch2.id,
    code: newCode,
  })
  if (ve2) {
    console.error('  ✗ Verify failed:', ve2.message)
    process.exit(1)
  }
  console.log('  ✓ Factor verified and ACTIVE')

  // ── Done ────────────────────────────────────────────────
  console.log('\n  ╔══════════════════════════════════════════════════╗')
  console.log(`  ║  NUOVO SECRET: ${secret}`)
  console.log('  ╚══════════════════════════════════════════════════╝')
  console.log('')
  console.log('  👉 Prossimi passi:')
  console.log('')
  console.log('  1. GOOGLE AUTHENTICATOR (telefono):')
  console.log('     - Elimina la vecchia entry TaskFlow')
  console.log('     - Tocca + → "Inserisci chiave di configurazione"')
  console.log(`     - Account: ${email}`)
  console.log(`     - Chiave:  ${secret}`)
  console.log('     - Aggiungi')
  console.log('')
  console.log('  2. Crea .env.e2e nella root del progetto:')
  console.log(`     E2E_EMAIL=${email}`)
  console.log(`     E2E_PASSWORD=${password}`)
  console.log(`     E2E_TOTP_SECRET=${secret}`)
  console.log('')
  console.log('  3. Lancia i test:')
  console.log('     npm run e2e:auth')
  console.log('')
}

main()
