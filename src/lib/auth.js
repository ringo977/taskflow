/**
 * TaskFlow Authentication — Email + Password + TOTP
 *
 * Flow:
 *   1. signUp()     → crea account con email + password
 *   2. signIn()     → login con email + password
 *   3. enrollTotp() → prima volta: mostra QR da scansionare
 *   4. verifyTotp() → ogni login: verifica codice 6 cifre
 */

import { supabase } from './supabase'

// ── Sign up (prima registrazione) ─────────────────────────────
export async function signUp(email, password, { firstName, lastName, orgId } = {}) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined
  const meta = {}
  if (fullName) meta.full_name = fullName
  if (orgId) meta.signup_org = orgId
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: Object.keys(meta).length ? { data: meta } : undefined,
  })
  if (error) throw error
  return data
}

// ── Sign in ───────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// ── Sign out ──────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── Fetch orgs the current user belongs to ────────────────────
export async function getUserOrgs() {
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id, role')
  if (error) throw error
  return data ?? []
}

// ── MFA: enroll TOTP (prima volta) ───────────────────────────
export async function enrollTotp() {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
  if (error) throw error
  return data   // data.totp.qr_code, data.totp.secret, data.id
}

// ── MFA: verifica codice ──────────────────────────────────────
export async function verifyTotp(factorId, code) {
  const { data: challenge, error: ce } = await supabase.auth.mfa.challenge({ factorId })
  if (ce) throw ce
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.replace(/\s/g, ''),
  })
  if (error) throw error
  return data
}

// ── MFA: lista fattori enrollati ─────────────────────────────
export async function getFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw error
  return data?.totp ?? []
}

// ── MFA: livello di assurance della sessione corrente ─────────
export async function getMfaLevel() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) throw error
  return data
}
