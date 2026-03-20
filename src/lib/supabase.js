import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://ygcmvdvoflfslnccwrrf.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnY212ZHZvZmxmc2xuY2N3cnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjQ3NTMsImV4cCI6MjA4OTUwMDc1M30.Abz9C88PL32BpnLKqyewvJRrVoZQ0_KThZ1in5AgmnI'

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
