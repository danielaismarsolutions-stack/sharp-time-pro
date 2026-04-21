-- Harden holidays table for closure dates feature
-- Applied to Supabase project omeeupvetsacxbgojifx on 2026-04-21

-- 1) Enforce business_id NOT NULL so every row is strictly scoped by RLS
ALTER TABLE public.holidays
  ALTER COLUMN business_id SET NOT NULL;

-- 2) Enforce is_closed default/NOT NULL (feature treats it as a flag, never null)
ALTER TABLE public.holidays
  ALTER COLUMN is_closed SET DEFAULT true,
  ALTER COLUMN is_closed SET NOT NULL;

-- 3) Add updated_at column for consistency with business_hours
ALTER TABLE public.holidays
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 4) Limit name length to prevent abuse
ALTER TABLE public.holidays
  ADD CONSTRAINT holidays_name_length_chk
  CHECK (name IS NULL OR char_length(name) <= 120);

-- 5) Ensure RLS is on + forced (defense in depth)
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays FORCE ROW LEVEL SECURITY;

-- 6) Per-command RLS policies, strictly scoped to the caller's business_id
DROP POLICY IF EXISTS "auth_business_all_holidays" ON public.holidays;

CREATE POLICY "holidays_select_own_business"
  ON public.holidays
  FOR SELECT
  TO authenticated
  USING (business_id = public.get_my_business_id());

CREATE POLICY "holidays_insert_own_business"
  ON public.holidays
  FOR INSERT
  TO authenticated
  WITH CHECK (business_id = public.get_my_business_id());

CREATE POLICY "holidays_update_own_business"
  ON public.holidays
  FOR UPDATE
  TO authenticated
  USING (business_id = public.get_my_business_id())
  WITH CHECK (business_id = public.get_my_business_id());

CREATE POLICY "holidays_delete_own_business"
  ON public.holidays
  FOR DELETE
  TO authenticated
  USING (business_id = public.get_my_business_id());

-- 7) Trigger to keep updated_at in sync on UPDATE
CREATE OR REPLACE FUNCTION public.holidays_set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_holidays_set_updated_at ON public.holidays;
CREATE TRIGGER trg_holidays_set_updated_at
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.holidays_set_updated_at();
