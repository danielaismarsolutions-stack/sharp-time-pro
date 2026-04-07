-- ============================================================
-- Verifactu Invoicing: schema additions for Spanish tax compliance
-- ============================================================
--
-- Implements the data model required to support Verifactu (Real Decreto
-- 1007/2023, Orden HAC/1177/2024). This migration only sets up the
-- database schema; business logic, hash chaining, AEAT submission and
-- UI are introduced in later phases.
--
-- This file mirrors EXACTLY what was applied to the Supabase project
-- `omeeupvetsacxbgojifx` via the MCP tools, in the same order:
--
--   1. verifactu_extend_businesses
--   2. verifactu_extend_clients
--   3. verifactu_helper_function
--   4. verifactu_create_invoices_table
--   5. verifactu_create_invoice_lines_and_sequences
--   6. verifactu_rls_policies
--   7. verifactu_protect_columns_trigger
--   8. verifactu_perf_fixes
--
-- Verified end-to-end:
--  * security advisors: zero new warnings vs baseline
--  * performance advisors: zero new warnings vs baseline (after step 8)
--  * UNIQUE(business_id, invoice_number) constraint enforced
--  * invoice_type CHECK constraint enforced
--  * trg_invoices_updated_at trigger active and bound to
--    set_verifactu_updated_at()
--  * trg_protect_verifactu_columns coexists with trg_protect_stripe_columns
-- ============================================================


-- ------------------------------------------------------------
-- 1. Extend `businesses` with fiscal data of the issuer
-- ------------------------------------------------------------
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS fiscal_address text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS fiscal_postal_code text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS fiscal_city text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS fiscal_province text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS fiscal_country text DEFAULT 'ES';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verifactu_enabled boolean DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verifactu_provider text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verifactu_provider_org_id text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS invoice_series_prefix text DEFAULT 'F';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS simplified_invoice_series_prefix text DEFAULT 'FS';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS default_iva_rate numeric(5,2) DEFAULT 21.00;


-- ------------------------------------------------------------
-- 2. Extend `clients` with optional fiscal/billing data
--    (only used when the client requests a full F1 invoice)
-- ------------------------------------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_address text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_city text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_postal_code text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_province text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_country text DEFAULT 'ES';


-- ------------------------------------------------------------
-- 3. Helper function: auto-update `updated_at`
--    search_path is fixed to satisfy the function_search_path_mutable
--    advisor (defense-in-depth against search-path injection).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_verifactu_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


-- ------------------------------------------------------------
-- 4. Table: invoices
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Invoice identification (Verifactu mandatory fields)
  invoice_number text NOT NULL,
  invoice_series text NOT NULL,
  invoice_sequence integer NOT NULL,
  invoice_date date NOT NULL,
  invoice_type text NOT NULL DEFAULT 'F2'
    CHECK (invoice_type IN ('F1','F2','F3','R1','R2','R3','R4','R5')),

  -- Issuer (denormalized for immutability)
  issuer_tax_id text NOT NULL,
  issuer_name text NOT NULL,

  -- Recipient (NULL for simplified F2 tickets)
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  recipient_tax_id text,
  recipient_name text,
  recipient_address text,

  -- Amounts
  tax_base numeric(12,2) NOT NULL DEFAULT 0,
  iva_rate numeric(5,2) NOT NULL DEFAULT 21.00,
  iva_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,

  description text,

  -- Verifactu hash chain (filled by Edge Function in Phase 3)
  hash text,
  previous_hash text,
  hash_timestamp timestamptz,

  -- AEAT submission state (via fiskaly)
  verifactu_status text NOT NULL DEFAULT 'pending'
    CHECK (verifactu_status IN ('pending','submitted','accepted','accepted_with_errors','rejected','error')),
  verifactu_csv text,
  verifactu_error_code text,
  verifactu_error_message text,
  verifactu_submitted_at timestamptz,
  verifactu_provider_id text,

  qr_url text,

  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','issued','cancelled','corrected')),
  cancelled_at timestamptz,
  correction_invoice_id uuid REFERENCES invoices(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(business_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_business ON invoices(business_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_booking  ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(business_id, verifactu_status);

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_verifactu_updated_at();


-- ------------------------------------------------------------
-- 5. Tables: invoice_lines + invoice_sequences
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL,
  iva_rate numeric(5,2) NOT NULL DEFAULT 21.00,
  line_total numeric(12,2) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);

CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  series text NOT NULL,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, series, year)
);

DROP TRIGGER IF EXISTS trg_invoice_sequences_updated_at ON invoice_sequences;
CREATE TRIGGER trg_invoice_sequences_updated_at
  BEFORE UPDATE ON invoice_sequences
  FOR EACH ROW
  EXECUTE FUNCTION set_verifactu_updated_at();


-- ============================================================
-- 6. Row Level Security
-- ============================================================
--
-- Multi-tenant isolation via the canonical helper get_my_business_id()
-- (same pattern as the bookings table). Verifactu requires immutability:
-- there is no DELETE policy on invoices/invoice_lines. All writes are
-- reserved to service_role (Edge Functions, Phase 3) — no INSERT/UPDATE
-- policies are exposed to the authenticated role.
-- ============================================================

ALTER TABLE invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select_own_business" ON invoices;
CREATE POLICY "invoices_select_own_business"
  ON invoices FOR SELECT
  TO authenticated
  USING (business_id = get_my_business_id());

DROP POLICY IF EXISTS "invoice_lines_select_via_invoice" ON invoice_lines;
CREATE POLICY "invoice_lines_select_via_invoice"
  ON invoice_lines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_lines.invoice_id
        AND i.business_id = get_my_business_id()
    )
  );

-- Sensitive data (atomic numbering): only owner/admin may read.
-- auth.uid() is wrapped in (SELECT auth.uid()) so it is evaluated
-- once per query instead of once per row (auth_rls_initplan advisor).
DROP POLICY IF EXISTS "invoice_sequences_select_own_admin" ON invoice_sequences;
CREATE POLICY "invoice_sequences_select_own_admin"
  ON invoice_sequences FOR SELECT
  TO authenticated
  USING (
    business_id = get_my_business_id()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_uid = (SELECT auth.uid())
        AND u.role IN ('owner','admin')
    )
  );


-- ============================================================
-- 7. Protective trigger on `businesses`
-- ============================================================
--
-- Prevents non-service_role clients from tampering with the
-- server-managed Verifactu columns. The fiscal data (tax_id,
-- legal_name, address, series prefixes, default IVA) can still be
-- edited freely from the Settings UI by owners/admins. Same pattern
-- as the existing protect_stripe_columns trigger.
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_verifactu_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_setting('role', true) = 'service_role'
     OR current_user = 'supabase_admin'
  THEN
    RETURN NEW;
  END IF;

  NEW.verifactu_provider        := OLD.verifactu_provider;
  NEW.verifactu_provider_org_id := OLD.verifactu_provider_org_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_verifactu_columns ON businesses;
CREATE TRIGGER trg_protect_verifactu_columns
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION protect_verifactu_columns();


-- ============================================================
-- 8. Performance: covering indexes for foreign keys
--    (resolves the unindexed_foreign_keys advisor for the new tables)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invoice_lines_booking ON invoice_lines(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_lines_service ON invoice_lines(service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_client      ON invoices(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_correction  ON invoices(correction_invoice_id) WHERE correction_invoice_id IS NOT NULL;


-- ============================================================
-- End of Verifactu invoicing schema migration
-- ============================================================
