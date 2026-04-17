-- ── Bank details for restaurant payouts ─────────────────────────────────────
--
-- 1. Add bank columns to restaurant_applications (collected during registration)
-- 2. Add bank columns to restaurants (copied over on approval)
-- 3. RLS: only the restaurant owner + admins can read/write bank columns
--    (Supabase doesn't support column-level security natively, so we handle
--    this in application code + the owner RLS policies below)
-- 4. restaurant_payouts table for admin payout tracking
--
-- Run order: safe to run multiple times (IF NOT EXISTS / IF EXISTS guards).
-- ─────────────────────────────────────────────────────────────────────────────

-- restaurant_applications: collect bank details at registration time
ALTER TABLE restaurant_applications
  ADD COLUMN IF NOT EXISTS bank_name       TEXT,
  ADD COLUMN IF NOT EXISTS bank_code       TEXT,
  ADD COLUMN IF NOT EXISTS account_number  TEXT,
  ADD COLUMN IF NOT EXISTS account_name    TEXT,
  ADD COLUMN IF NOT EXISTS account_verified BOOLEAN DEFAULT FALSE;

-- restaurants: store the verified payout account
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS bank_name          TEXT,
  ADD COLUMN IF NOT EXISTS bank_code          TEXT,
  ADD COLUMN IF NOT EXISTS account_number     TEXT,
  ADD COLUMN IF NOT EXISTS account_name       TEXT,
  ADD COLUMN IF NOT EXISTS account_verified   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bank_updated_at    TIMESTAMPTZ;

-- ── restaurant_payouts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_payouts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id  UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  amount         NUMERIC(12, 2) NOT NULL,
  period_start   DATE NOT NULL,
  period_end     DATE NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'paid', 'failed')),
  bank_name      TEXT,
  account_number TEXT,
  account_name   TEXT,
  notes          TEXT,
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS on restaurant_payouts ────────────────────────────────────────────────
ALTER TABLE restaurant_payouts ENABLE ROW LEVEL SECURITY;

-- Helper: is_admin (reuse from fraud_escrow migration if already exists)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Admins can do everything
DROP POLICY IF EXISTS "Admin full access on payouts" ON restaurant_payouts;
CREATE POLICY "Admin full access on payouts" ON restaurant_payouts
  FOR ALL USING (is_admin());

-- Restaurant owner can only read their own payouts
DROP POLICY IF EXISTS "Owner read own payouts" ON restaurant_payouts;
CREATE POLICY "Owner read own payouts" ON restaurant_payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = restaurant_payouts.restaurant_id
        AND r.owner_id = auth.uid()
    )
  );
