-- Add banner_url (cover image) to restaurants table
-- Safe to run multiple times
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS banner_url TEXT;
