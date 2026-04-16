-- ════════════════════════════════════════════════════════════
--  Chowli Fraud Protection & Escrow System
--  Run in Supabase SQL editor
-- ════════════════════════════════════════════════════════════

-- ── 1. Alter existing tables ──────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_verified         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS orders_placed          INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS orders_completed       INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_count     INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_orders_blocked    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS device_fingerprint     TEXT;

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS verified               BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS false_delivery_count   INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspended              BOOLEAN DEFAULT FALSE;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS disputed               BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dispute_reason         TEXT,
  ADD COLUMN IF NOT EXISTS dispute_raised_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_held           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_released       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS delivery_photo_url     TEXT,
  ADD COLUMN IF NOT EXISTS auto_release_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at           TIMESTAMPTZ;

-- ── 2. New tables ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS escrow_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  amount        NUMERIC NOT NULL,
  status        TEXT NOT NULL DEFAULT 'held'
                  CHECK (status IN ('held','released','refunded','frozen','pending_release')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  released_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS disputes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES profiles(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  reason        TEXT NOT NULL
                  CHECK (reason IN ('not_received','wrong_order','poor_quality','other')),
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','resolved','rejected')),
  evidence_url  TEXT,
  admin_note    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cancellation_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id),
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restaurant_payouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  amount        NUMERIC NOT NULL,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','paid')),
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Trigger 1 — Order velocity check ──────────────────────
-- Blocks a customer from placing more than 3 orders per hour.

CREATE OR REPLACE FUNCTION check_order_velocity()
RETURNS TRIGGER AS $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM orders
  WHERE customer_id = NEW.customer_id
    AND created_at > NOW() - INTERVAL '1 hour';
  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Order limit reached: maximum 3 orders per hour. Please wait before placing another.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_order_velocity ON orders;
CREATE TRIGGER trg_order_velocity
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION check_order_velocity();

-- ── 4. Trigger 2 — Auto-release scheduler ────────────────────
-- When restaurant marks order delivered, set auto_release_at = now() + 2h
-- and move escrow to pending_release.

CREATE OR REPLACE FUNCTION set_auto_release()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    NEW.auto_release_at = NOW() + INTERVAL '2 hours';
    UPDATE escrow_ledger
      SET status = 'pending_release'
      WHERE order_id = NEW.id AND status = 'held';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_release ON orders;
CREATE TRIGGER trg_auto_release
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_auto_release();

-- ── 5. Trigger 3 — Order stats tracker ───────────────────────
-- Increments orders_placed on insert.
-- Increments orders_completed when customer sets confirmed_at.

CREATE OR REPLACE FUNCTION track_order_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles
      SET orders_placed = COALESCE(orders_placed, 0) + 1
      WHERE id = NEW.customer_id;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.confirmed_at IS NOT NULL
     AND OLD.confirmed_at IS NULL THEN
    UPDATE profiles
      SET orders_completed = COALESCE(orders_completed, 0) + 1
      WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_order_stats_insert ON orders;
CREATE TRIGGER trg_order_stats_insert
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION track_order_stats();

DROP TRIGGER IF EXISTS trg_order_stats_update ON orders;
CREATE TRIGGER trg_order_stats_update
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION track_order_stats();

-- ── 6. Trigger 4 — Cash order blocker ────────────────────────
-- Blocks cash orders for customers with < 60% completion after 5+ orders,
-- or those explicitly marked cash_orders_blocked.

CREATE OR REPLACE FUNCTION check_cash_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_rate    FLOAT;
BEGIN
  IF NEW.payment_method = 'cash' THEN
    SELECT * INTO v_profile FROM profiles WHERE id = NEW.customer_id;
    IF v_profile.cash_orders_blocked THEN
      RAISE EXCEPTION 'Cash orders are blocked on your account. Please contact support or pay online.';
    END IF;
    IF COALESCE(v_profile.orders_placed, 0) > 5 THEN
      v_rate := COALESCE(v_profile.orders_completed, 0)::FLOAT / v_profile.orders_placed;
      IF v_rate < 0.6 THEN
        RAISE EXCEPTION 'Cash orders unavailable: your completion rate is too low. Please pay online.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cash_eligibility ON orders;
CREATE TRIGGER trg_cash_eligibility
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION check_cash_eligibility();

-- ── 7. Trigger 5 — False delivery detector ───────────────────
-- Increments false_delivery_count on restaurant.
-- Suspends restaurant if >= 3 not_received disputes in 30 days.

CREATE OR REPLACE FUNCTION track_false_deliveries()
RETURNS TRIGGER AS $$
DECLARE v_count INT;
BEGIN
  IF NEW.reason = 'not_received' THEN
    UPDATE restaurants
      SET false_delivery_count = COALESCE(false_delivery_count, 0) + 1
      WHERE id = NEW.restaurant_id;
    -- Count disputes in last 30 days (including the row just inserted)
    SELECT COUNT(*) INTO v_count
    FROM disputes
    WHERE restaurant_id = NEW.restaurant_id
      AND reason = 'not_received'
      AND created_at > NOW() - INTERVAL '30 days';
    IF v_count >= 3 THEN
      UPDATE restaurants SET suspended = TRUE WHERE id = NEW.restaurant_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_false_deliveries ON disputes;
CREATE TRIGGER trg_false_deliveries
AFTER INSERT ON disputes
FOR EACH ROW EXECUTE FUNCTION track_false_deliveries();

-- ── 8. Trigger 6 — Cancellation penalty ──────────────────────
-- Logs cancellations and blocks cash orders after 3.

CREATE OR REPLACE FUNCTION track_cancellation()
RETURNS TRIGGER AS $$
DECLARE v_count INT;
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    INSERT INTO cancellation_logs (order_id, customer_id)
    VALUES (NEW.id, NEW.customer_id);
    UPDATE profiles
      SET cancellation_count = COALESCE(cancellation_count, 0) + 1
      WHERE id = NEW.customer_id
      RETURNING cancellation_count INTO v_count;
    IF v_count >= 3 THEN
      UPDATE profiles SET cash_orders_blocked = TRUE WHERE id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cancellation ON orders;
CREATE TRIGGER trg_cancellation
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION track_cancellation();

-- ── 9. Admin helper function ──────────────────────────────────

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ── 10. RLS Policies ─────────────────────────────────────────

ALTER TABLE escrow_ledger       ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_payouts  ENABLE ROW LEVEL SECURITY;

-- escrow_ledger: system can insert (no auth required for backend), admins can read/update
DROP POLICY IF EXISTS "escrow_system_insert"  ON escrow_ledger;
DROP POLICY IF EXISTS "escrow_admin_all"      ON escrow_ledger;
CREATE POLICY "escrow_system_insert" ON escrow_ledger FOR INSERT WITH CHECK (true);
CREATE POLICY "escrow_admin_all"     ON escrow_ledger FOR ALL    USING (is_admin());

-- disputes: customers insert/read own, restaurants read theirs, admins all
DROP POLICY IF EXISTS "disputes_customer_insert"    ON disputes;
DROP POLICY IF EXISTS "disputes_customer_read"      ON disputes;
DROP POLICY IF EXISTS "disputes_restaurant_read"    ON disputes;
DROP POLICY IF EXISTS "disputes_admin_all"          ON disputes;
CREATE POLICY "disputes_customer_insert" ON disputes
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "disputes_customer_read" ON disputes
  FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "disputes_restaurant_read" ON disputes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM restaurants WHERE id = disputes.restaurant_id AND owner_id = auth.uid())
  );
CREATE POLICY "disputes_admin_all" ON disputes
  FOR ALL USING (is_admin());

-- restaurant_payouts: admins + owning restaurant
DROP POLICY IF EXISTS "payouts_admin_all"   ON restaurant_payouts;
DROP POLICY IF EXISTS "payouts_owner_read"  ON restaurant_payouts;
CREATE POLICY "payouts_admin_all" ON restaurant_payouts
  FOR ALL USING (is_admin());
CREATE POLICY "payouts_owner_read" ON restaurant_payouts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_payouts.restaurant_id AND owner_id = auth.uid())
  );

-- ── 11. Create delivery-photos storage bucket (if not exists) ─
-- Run separately in Supabase dashboard Storage tab if SQL doesn't create it:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-photos', 'delivery-photos', true)
-- ON CONFLICT DO NOTHING;
