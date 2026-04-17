-- ════════════════════════════════════════════════════════════
--  Fix: auto_release_at trigger was firing confirmed_at immediately
--
--  Root cause: the set_auto_release trigger in the live DB may have been
--  modified to set confirmed_at = NOW() (i.e. release immediately) instead
--  of only setting auto_release_at = NOW() + INTERVAL '2 hours'.
--
--  Rules enforced here:
--    • set_auto_release  → ONLY sets auto_release_at. Never touches confirmed_at.
--    • confirmed_at      → ONLY set by:
--        a) Customer clicking "Confirm Received" (frontend update), OR
--        b) auto_release_orders() after auto_release_at has passed (2h window)
--    • status='completed'→ ONLY set alongside confirmed_at (never by set_auto_release)
-- ════════════════════════════════════════════════════════════

-- ── 1. Fix set_auto_release ───────────────────────────────────
-- Rewrites the live function. Only sets auto_release_at + escrow pending.
-- confirmed_at is intentionally absent from this function.

CREATE OR REPLACE FUNCTION set_auto_release()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    -- Schedule the 2-hour release window
    NEW.auto_release_at = NOW() + INTERVAL '2 hours';
    -- Move escrow to pending_release so admin can see it coming
    UPDATE escrow_ledger
      SET status = 'pending_release'
      WHERE order_id = NEW.id AND status = 'held';
    -- NOTE: confirmed_at is NOT set here. It is set only by the customer
    -- manually confirming or by auto_release_orders() after the timer expires.
  END IF;
  RETURN NEW;
END;
$$;

-- Re-attach the trigger (idempotent)
DROP TRIGGER IF EXISTS trg_auto_release ON orders;
CREATE TRIGGER trg_auto_release
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_auto_release();


-- ── 2. auto_release_orders() ─────────────────────────────────
-- Called by the backend cron job every 5 minutes.
-- Releases any delivered order whose 2-hour window has expired,
-- the customer hasn't confirmed, and no dispute is open.
--
-- This is the ONLY place (apart from the customer's own confirm action)
-- that sets confirmed_at.

CREATE OR REPLACE FUNCTION auto_release_orders()
RETURNS TABLE(released_order_id UUID) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Step 1: mark qualifying orders as completed + release payment
  UPDATE orders
  SET
    status           = 'completed',
    confirmed_at     = NOW(),
    payment_released = TRUE
  WHERE
    status           = 'delivered'
    AND disputed     = FALSE
    AND confirmed_at IS NULL
    AND auto_release_at IS NOT NULL
    AND auto_release_at <= NOW();

  -- Step 2: release the escrow for those same orders
  UPDATE escrow_ledger el
  SET
    status      = 'released',
    released_at = NOW()
  FROM orders o
  WHERE
    el.order_id = o.id
    AND el.status IN ('pending_release', 'held')
    AND o.status = 'completed'
    AND o.payment_released = TRUE
    AND el.released_at IS NULL;

  -- Return the IDs of released orders so the caller can send notifications
  RETURN QUERY
    SELECT id FROM orders
    WHERE
      status           = 'completed'
      AND payment_released = TRUE
      AND confirmed_at >= NOW() - INTERVAL '10 minutes' -- just released in this run
      AND disputed = FALSE;
END;
$$;


-- ── 3. Optional pg_cron schedule ─────────────────────────────
-- Only runs if pg_cron is enabled in this Supabase project.
-- Enable via: Supabase Dashboard → Database → Extensions → pg_cron
-- The backend cron job (server.js) is the primary scheduler; this is a
-- belt-and-suspenders fallback.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('auto-release-orders');
    PERFORM cron.schedule(
      'auto-release-orders',
      '*/5 * * * *',
      'SELECT auto_release_orders()'
    );
    RAISE NOTICE 'pg_cron: auto-release-orders scheduled every 5 minutes';
  ELSE
    RAISE NOTICE 'pg_cron not enabled — backend cron job will handle auto-release';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END;
$$;
