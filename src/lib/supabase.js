import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  )
}

/** Dedicated key avoids clashes with other Supabase apps / old corrupted sb-* session blobs */
const AUTH_STORAGE_KEY = 'taskflow-auth'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: AUTH_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/* Expose for E2E programmatic login (dev only, stripped in prod build) */
if (import.meta.env.DEV) {
  window.__supabase = supabase
}
