-- ============================================================
-- Migration 043: Grant SELECT on profiles to authenticated role
-- ============================================================
-- Context:
--   After 040/041/042 fixed the RLS policies and introduced an RPC
--   path for assignee resolution, direct SELECT queries from the
--   client against public.profiles still returned HTTP 403 with:
--     { code: "42501", message: "permission denied for table profiles" }
--
-- Root cause:
--   PostgreSQL evaluates table-level GRANTs *before* RLS policies.
--   The `profiles` table was created via SQL migration (002) with
--   `CREATE TABLE IF NOT EXISTS` and RLS enabled, but no explicit
--   GRANT was issued. Supabase auto-grants are not applied to
--   tables created through migrations (only to tables created via
--   the dashboard UI). Every previous code path that touched
--   profiles went through a SECURITY DEFINER RPC (which runs as
--   the function's owner, bypassing GRANT checks on `authenticated`),
--   so the missing GRANT was never exercised.
--
--   Once `fetchTasks` started querying profiles directly (to
--   resolve assignee_ids → display_name), the 403 surfaced. Until
--   migration 040, the RLS recursion masked the underlying GRANT
--   issue as a 500.
--
-- SAFE TO RUN:
--   • Only grants — no data, schema, or policy changes
--   • Idempotent: GRANT is additive (no-op if already granted)
-- ============================================================

GRANT SELECT ON public.profiles TO authenticated;

-- Small sanity: make sure INSERT/UPDATE are also explicit. Both
-- are already gated by the "profiles insert own" / "profiles
-- update own" RLS policies (migration 002). Without the GRANT,
-- self-signup profile creation would also silently fail.
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
