-- ============================================================
-- Stripe Billing: schema additions for subscription management
-- ============================================================

-- 1. New columns on businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS monthly_price numeric(10,2) DEFAULT NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_customer_id text DEFAULT NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_subscription_id text DEFAULT NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none'
  CHECK (subscription_status IN ('none','active','past_due','canceled','unpaid','trialing','incomplete','incomplete_expired'));
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS current_period_end timestamptz DEFAULT NULL;

-- 2. Payment history table (local mirror of Stripe invoices)
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stripe_invoice_id text UNIQUE NOT NULL,
  amount_paid numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  status text NOT NULL CHECK (status IN ('paid','failed','open','void')),
  invoice_url text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups by business
CREATE INDEX IF NOT EXISTS idx_payment_history_business_id ON payment_history(business_id);

-- 3. Enable RLS on payment_history
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- SELECT: only owner/admin users of the same business can read
CREATE POLICY "payment_history_select_own_business"
  ON payment_history FOR SELECT
  USING (
    business_id IN (
      SELECT u.business_id FROM users u
      WHERE u.auth_uid = auth.uid()
        AND u.role IN ('owner', 'admin')
    )
  );

-- No INSERT/UPDATE/DELETE policies for anon/authenticated roles.
-- Only service_role (Edge Functions) can write to this table.

-- 4. Protective trigger: prevent client-side writes to Stripe columns on businesses
CREATE OR REPLACE FUNCTION protect_stripe_columns()
RETURNS trigger AS $$
BEGIN
  -- Allow service_role to update anything
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_setting('role', true) = 'service_role'
     OR current_user = 'supabase_admin'
  THEN
    RETURN NEW;
  END IF;

  -- For all other roles, reset Stripe-managed columns to their old values
  NEW.stripe_customer_id     := OLD.stripe_customer_id;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  NEW.subscription_status    := OLD.subscription_status;
  NEW.current_period_end     := OLD.current_period_end;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_stripe_columns
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION protect_stripe_columns();
