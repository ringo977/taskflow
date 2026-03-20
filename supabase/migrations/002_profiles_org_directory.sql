-- TaskFlow: public.profiles + RLS so org mates are visible for directory UI
-- Run in Supabase SQL Editor if migrations are not applied automatically.

-- ── Profiles (one row per auth user) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  email        text,
  color        text NOT NULL DEFAULT '#378ADD',
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#378ADD';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles select own" ON public.profiles;
DROP POLICY IF EXISTS "profiles readable by org mates" ON public.profiles;
CREATE POLICY "profiles readable by org mates"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM public.org_members om_self
      INNER JOIN public.org_members om_peer ON om_self.org_id = om_peer.org_id
      WHERE om_self.user_id = auth.uid()
        AND om_peer.user_id = profiles.id
    )
  );

DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles insert own" ON public.profiles;
CREATE POLICY "profiles insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── org_members: teammates can see membership rows in shared orgs ──
DROP POLICY IF EXISTS "read own memberships" ON public.org_members;
DROP POLICY IF EXISTS "org members see teammate memberships" ON public.org_members;
CREATE POLICY "org members see teammate memberships"
  ON public.org_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.user_id = auth.uid()
        AND m.org_id = org_members.org_id
    )
  );

-- ── New user → profile row ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(NULLIF(public.profiles.display_name, ''), EXCLUDED.display_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── Backfill profiles for existing auth users ─────────────────
INSERT INTO public.profiles (id, display_name, email)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  email
FROM auth.users
ON CONFLICT (id) DO NOTHING;
