-- Migration: gate cash orders on phone_verified = true
-- Customers who haven't verified their phone cannot place cash-on-delivery orders.
-- This reduces fraud risk (anonymous / throwaway accounts).

-- Ensure phone_verified column exists (added in 20260416_fraud_escrow.sql, kept here as safety)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- Also store the verified phone number so we have it on file
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ── Update check_cash_eligibility trigger ─────────────────────
-- Original trigger (from 20260416_fraud_escrow.sql) blocks cash orders when
-- fraud_score >= 80 or the account is too new.
-- We add an additional check: phone_verified must be TRUE.

CREATE OR REPLACE FUNCTION check_cash_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile       profiles%ROWTYPE;
  v_account_age   INTERVAL;
BEGIN
  -- Only applies to cash payment orders
  IF NEW.payment_method <> 'cash' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = NEW.customer_id;

  -- 1. Phone must be verified
  IF v_profile.phone_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'Phone verification required for cash orders. Please verify your phone number in your profile.';
  END IF;

  -- 2. High fraud score blocks cash
  IF v_profile.fraud_score >= 80 THEN
    RAISE EXCEPTION 'Cash on delivery is not available for your account. Please use online payment.';
  END IF;

  -- 3. Account must be at least 24 hours old
  v_account_age := NOW() - v_profile.created_at;
  IF v_account_age < INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'New accounts must wait 24 hours before placing cash orders.';
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach the trigger (DROP + CREATE so it picks up the new function body)
DROP TRIGGER IF EXISTS trg_check_cash_eligibility ON orders;
CREATE TRIGGER trg_check_cash_eligibility
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_cash_eligibility();
