/**
 * Thin wrapper around localStorage with JSON serialization.
 * All keys are prefixed with 'tf_' to avoid collisions.
 *
 * When Supabase is connected, replace these calls with
 * supabase.from('table').select/insert/update/delete.
 */

const PREFIX = 'tf_'

export const storage = {
  get: (key, fallback = null) => {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      return raw ? JSON.parse(raw) : fallback
    } catch {
      return fallback
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch (e) {
      console.warn('[TaskFlow:Storage] localStorage write failed:', e)
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(PREFIX + key)
    } catch { /* ignore */ }
  },

  clear: () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k))
  },
}

// ── Well-known key helpers ─────────────────────────────────────
// Centralise all ad-hoc localStorage keys so call-sites never
// construct key strings themselves.

/** Sidebar collapsed-sections map (object keyed by section id). */
export const sidebarStorage = {
  get: () => storage.get('sidebar_collapsed', {}),
  set: (v) => storage.set('sidebar_collapsed', v),
}

/** Org seeding flag — true once demo data has been written. */
export const seedStorage = {
  isDone: (orgId) => storage.get(`${orgId}_seeded`, false),
  markDone: (orgId) => storage.set(`${orgId}_seeded`, true),
}

/** Org id captured during signup flow. */
export const signupOrgStorage = {
  get: () => storage.get('signup_org', null),
  set: (orgId) => storage.set('signup_org', orgId),
  clear: () => storage.remove('signup_org'),
}
