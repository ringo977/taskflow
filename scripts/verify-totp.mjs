#!/usr/bin/env node
/**
 * Verify a newly enrolled TOTP factor (activates it).
 *
 * Usage:
 *   node scripts/verify-totp.mjs <email> <password> <totp-secret>
 */

import { createClient } from '@supabase/supabase-js'
import { TOTP } from 'otpauth'

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? 'https://ygcmvdvoflfslnccwrrf.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnY212ZHZvZmxmc2xuY2N3cnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjQ3NTMsImV4cCI6MjA4OTUwMDc1M30.Abz9C88PL32BpnLKqyewvJRrVoZQ0_KThZ1in5AgmnI'

const [email, password, secret] = process.argv.slice(2)
if (!email || !password || !secret) {
  console.error('Usage: node scripts/verify-totp.mjs <email> <password> <totp-secret>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

async function main() {
  // 1. Sign in
  console.log(`\n  Signing in as ${email}...`)
  const { error: signInErr } =
    await supabase.auth.signInWithPassword({ email, password })
  if (signInErr) {
    console.error('  Login failed:', signInErr.message)
    process.exit(1)
  }

  // 2. Find the unverified factor
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const unverified = (factors?.totp ?? []).find(f => f.status === 'unverified')
  if (!unverified) {
    const verified = (factors?.totp ?? []).find(f => f.status === 'verified')
    if (verified) {
      console.log('  ✅ TOTP factor is already verified — you\'re good to go!')
      process.exit(0)
    }
    console.error('  No TOTP factor found to verify. Run reset-totp.mjs first.')
    process.exit(1)
  }

  // 3. Generate code and verify
  const totp = new TOTP({ secret, digits: 6, period: 30 })
  const code = totp.generate()
  console.log(`  Generated TOTP code: ${code}`)

  const { data: challenge, error: ce } =
    await supabase.auth.mfa.challenge({ factorId: unverified.id })
  if (ce) {
    console.error('  Challenge failed:', ce.message)
    process.exit(1)
  }

  const { error: ve } = await supabase.auth.mfa.verify({
    factorId: unverified.id,
    challengeId: challenge.id,
    code,
  })
  if (ve) {
    console.error('  Verify failed:', ve.message)
    process.exit(1)
  }

  console.log('\n  ✅ TOTP factor verified and active!')
  console.log('  Your .env.e2e should have:')
  console.log(`     E2E_EMAIL=${email}`)
  console.log(`     E2E_PASSWORD=${password}`)
  console.log(`     E2E_TOTP_SECRET=${secret}`)
  console.log('\n  Now run: npm run e2e:auth')
  console.log('')
}

main()
