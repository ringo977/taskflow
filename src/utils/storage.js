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
      console.warn('localStorage write failed:', e)
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
