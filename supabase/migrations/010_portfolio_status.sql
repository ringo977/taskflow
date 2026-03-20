-- Add status column to portfolios for archive support
DO $$ BEGIN
  ALTER TABLE public.portfolios ADD COLUMN status text NOT NULL DEFAULT 'active';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
