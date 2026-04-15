-- Add scheduled_time to orders table
-- Customers can place an order now and choose a future delivery/pickup time.
-- NULL means "ASAP" (immediate order).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMPTZ;
