-- ── Promo Codes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  discount_type   TEXT CHECK (discount_type IN ('percent', 'fixed')),
  discount_value  NUMERIC NOT NULL,
  min_order       NUMERIC DEFAULT 0,
  max_uses        INTEGER DEFAULT NULL,
  uses_count      INTEGER DEFAULT 0,
  expires_at      TIMESTAMPTZ DEFAULT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- ── Customer Loyalty Points ───────────────────────────────────
-- Points are per customer per restaurant.
-- Earning rule: ₦1000 spent = 10 points (awarded on order completion).
-- Redemption rule: 100 points = ₦500 discount on next order.
CREATE TABLE IF NOT EXISTS loyalty_points (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  points        INTEGER DEFAULT 0,
  total_earned  INTEGER DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, restaurant_id)
);
