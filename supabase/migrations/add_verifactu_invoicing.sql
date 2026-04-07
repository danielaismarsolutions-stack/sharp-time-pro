-- ============================================================
-- Verifactu Invoicing: schema additions for Spanish tax compliance
-- ============================================================
--
-- Implements the data model required to support Verifactu (Real Decreto
-- 1007/2023, Orden HAC/1177/2024). This migration only sets up the
-- database schema; business logic, hash chaining, AEAT submission and
-- UI are introduced in later phases.
--
-- Tables created: invoices, invoice_lines, invoice_sequences
-- Columns added to: businesses, clients
-- ============================================================


-- ------------------------------------------------------------
-- 1. Extend `businesses` with fiscal data of the issuer
-- ------------------------------------------------------------
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tax_id text DEFAULT NULL;                       -- NIF/CIF
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS legal_name text DEFAULT NULL;                   -- Razón social
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS fiscal_address text DEFAULT NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS fiscal_postal_code text DEFAULT NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS fiscal_city text DEFAULT NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS fiscal_province text DEFAULT NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS fiscal_country text DEFAULT 'ES';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verifactu_enabled boolean DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verifactu_provider text DEFAULT NULL;           -- 'fiskaly'
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verifactu_provider_org_id text DEFAULT NULL;   -- Organization ID at the provider (fiskaly)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS invoice_series_prefix text DEFAULT 'F';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS simplified_invoice_series_prefix text DEFAULT 'FS';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS default_iva_rate numeric(5,2) DEFAULT 21.00;


-- ------------------------------------------------------------
-- 2. Extend `clients` with optional fiscal data
--    (only used when the client requests a full invoice F1)
-- ------------------------------------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tax_id text DEFAULT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS legal_name text DEFAULT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_address text DEFAULT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_city text DEFAULT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_postal_code text DEFAULT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_province text DEFAULT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_country text DEFAULT 'ES';


-- ------------------------------------------------------------
-- 3. Helper function: auto-update `updated_at`
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_verifactu_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ------------------------------------------------------------
-- 4. Table: invoices
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Invoice identification (Verifactu mandatory fields)
  invoice_number text NOT NULL,                  -- e.g. "FS-2027-0001"
  invoice_series text NOT NULL,                  -- e.g. "FS-2027"
  invoice_sequence integer NOT NULL,             -- Sequential number inside the series
  invoice_date date NOT NULL,                    -- FechaExpedicionFactura
  invoice_type text NOT NULL DEFAULT 'F2'        -- F1, F2, F3, R1-R5
    CHECK (invoice_type IN ('F1','F2','F3','R1','R2','R3','R4','R5')),

  -- Issuer data (denormalized for immutability)
  issuer_tax_id text NOT NULL,                   -- IDEmisorFactura (NIF)
  issuer_name text NOT NULL,

  -- Recipient data (NULL for simplified F2 tickets under 400€)
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  recipient_tax_id text,
  recipient_name text,
  recipient_address text,

  -- Amounts
  tax_base numeric(12,2) NOT NULL DEFAULT 0,      -- Base imponible
  iva_rate numeric(5,2)  NOT NULL DEFAULT 21.00,
  iva_amount numeric(12,2) NOT NULL DEFAULT 0,    -- CuotaTotal
  total_amount numeric(12,2) NOT NULL DEFAULT 0,  -- ImporteTotal

  description text,

  -- Verifactu hash chain (SHA-256 chained)
  hash text,                                     -- Huella of the current record
  previous_hash text,                            -- Huella of the previous record
  hash_timestamp timestamptz,                    -- FechaHoraHusoGenRegistro (ISO 8601)

  -- AEAT submission state (via fiskaly)
  verifactu_status text NOT NULL DEFAULT 'pending'
    CHECK (verifactu_status IN ('pending','submitted','accepted','accepted_with_errors','rejected','error')),
  verifactu_csv text,                            -- Código Seguro de Verificación returned by AEAT
  verifactu_error_code text,
  verifactu_error_message text,
  verifactu_submitted_at timestamptz,
  verifactu_provider_id text,                    -- Record ID at fiskaly

  -- AEAT QR validation URL
  qr_url text,

  -- Optional link to a booking
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,

  -- Internal status of the invoice
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','issued','cancelled','corrected')),
  cancelled_at timestamptz,
  correction_invoice_id uuid REFERENCES invoices(id), -- For rectifying invoices

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
-- 5. Table: invoice_lines
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL,
  iva_rate numeric(5,2) NOT NULL DEFAULT 21.00,
  line_total numeric(12,2) NOT NULL,             -- Computed at insert time
  sort_order integer NOT NULL DEFAULT 0,

  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);


-- ------------------------------------------------------------
-- 6. Table: invoice_sequences (atomic numbering per series/year)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  series text NOT NULL,                          -- e.g. "FS-2027"
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
-- 7. Row Level Security
-- ============================================================
--
-- Multi-tenant isolation: every row must belong to a business the
-- authenticated user is a member of (via users.auth_uid = auth.uid()).
-- Verifactu requires immutability: there is no DELETE policy on invoices.
-- Cancellations are modeled as a status change + (in a later phase) a new
-- annulment record sent to the AEAT. Writes to invoices/invoice_lines/
-- invoice_sequences from the client are NOT allowed: only Edge Functions
-- running with the service_role key may insert/update them, ensuring the
-- hash chain and AEAT submission stay consistent.
-- ============================================================

ALTER TABLE invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

-- ----- invoices -----

-- SELECT: any user (owner/admin/barber) belonging to the business can read
DROP POLICY IF EXISTS "invoices_select_own_business" ON invoices;
CREATE POLICY "invoices_select_own_business"
  ON invoices FOR SELECT
  USING (
    business_id IN (
      SELECT u.business_id FROM users u
      WHERE u.auth_uid = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies: only service_role (Edge Functions) writes.
-- DELETE is intentionally NEVER allowed (Verifactu immutability).

-- ----- invoice_lines -----

DROP POLICY IF EXISTS "invoice_lines_select_via_invoice" ON invoice_lines;
CREATE POLICY "invoice_lines_select_via_invoice"
  ON invoice_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN users u ON u.business_id = i.business_id
      WHERE i.id = invoice_lines.invoice_id
        AND u.auth_uid = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies: only service_role writes.

-- ----- invoice_sequences -----

DROP POLICY IF EXISTS "invoice_sequences_select_own_business" ON invoice_sequences;
CREATE POLICY "invoice_sequences_select_own_business"
  ON invoice_sequences FOR SELECT
  USING (
    business_id IN (
      SELECT u.business_id FROM users u
      WHERE u.auth_uid = auth.uid()
        AND u.role IN ('owner', 'admin')
    )
  );

-- No INSERT/UPDATE/DELETE policies: only service_role writes.


-- ============================================================
-- 8. Protective trigger: prevent client-side writes to Verifactu
--    columns on `businesses` (provider id is server-managed)
-- ============================================================
CREATE OR REPLACE FUNCTION protect_verifactu_columns()
RETURNS trigger AS $$
BEGIN
  -- Allow service_role to update anything
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_setting('role', true) = 'service_role'
     OR current_user = 'supabase_admin'
  THEN
    RETURN NEW;
  END IF;

  -- For all other roles, reset server-managed columns to their old values.
  -- The fiscal data (tax_id, legal_name, address, series prefixes, default IVA)
  -- can still be updated freely from the Settings UI by owners/admins.
  NEW.verifactu_provider        := OLD.verifactu_provider;
  NEW.verifactu_provider_org_id := OLD.verifactu_provider_org_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_verifactu_columns ON businesses;
CREATE TRIGGER trg_protect_verifactu_columns
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION protect_verifactu_columns();


-- ============================================================
-- End of Verifactu invoicing schema migration
-- ============================================================
