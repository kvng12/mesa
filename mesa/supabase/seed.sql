-- ============================================================
--  MESA — Seed Data
--  Run AFTER schema.sql.
--  Creates demo restaurants (no owner_id — update these to
--  real UUIDs after you create accounts in your app).
-- ============================================================

-- Replace these with real user UUIDs from auth.users after
-- creating accounts in your Supabase dashboard or app.
do $$
declare
  owner1 uuid := '00000000-0000-0000-0000-000000000001'; -- placeholder
  r1 uuid; r2 uuid; r3 uuid; r4 uuid;
  c1 uuid; c2 uuid; c3 uuid;
begin

  -- ── Restaurant 1 ─────────────────────────────────────────
  insert into public.restaurants
    (id, owner_id, name, category, description, address, phone, icon, bg_from, bg_to, badge, tags, is_open)
  values
    (uuid_generate_v4(), owner1, 'Mama Ngozi''s Kitchen', 'Nigerian',
     'Proper home cooking. The jollof here will end arguments.',
     'Block 3, Shop 7', '080XXXXXXXX', '🍲', '#7C2D12', '#C2410C',
     'Top Rated', '{"Jollof Rice","Egusi","Pepper Soup"}', true)
  returning id into r1;

  -- Categories
  insert into public.menu_categories (id, restaurant_id, name, sort_order)
  values (uuid_generate_v4(), r1, 'Rice & Swallow', 1) returning id into c1;

  insert into public.menu_items (restaurant_id, category_id, name, price, is_available, sort_order) values
    (r1, c1, 'Jollof Rice + Chicken', 1500, true, 1),
    (r1, c1, 'Fried Rice + Plantain', 1800, true, 2),
    (r1, c1, 'Ofada Rice + Sauce',    1600, false, 3),
    (r1, c1, 'Eba + Egusi Soup',      1200, true, 4),
    (r1, c1, 'Pounded Yam + Oha',     1400, true, 5);

  insert into public.menu_categories (id, restaurant_id, name, sort_order)
  values (uuid_generate_v4(), r1, 'Soups & Sides', 2) returning id into c2;

  insert into public.menu_items (restaurant_id, category_id, name, price, is_available, sort_order) values
    (r1, c2, 'Pepper Soup (Goat)', 1500, true, 1),
    (r1, c2, 'Nkwobi',             2000, false, 2),
    (r1, c2, 'Moi Moi (2 wraps)',  500,  true, 3);

  insert into public.menu_categories (id, restaurant_id, name, sort_order)
  values (uuid_generate_v4(), r1, 'Drinks', 3) returning id into c3;

  insert into public.menu_items (restaurant_id, category_id, name, price, is_available, sort_order) values
    (r1, c3, 'Zobo (500ml)', 300, true, 1),
    (r1, c3, 'Kunu (500ml)', 300, true, 2),
    (r1, c3, 'Water',        100, true, 3);

  -- ── Restaurant 2 ─────────────────────────────────────────
  insert into public.restaurants
    (id, owner_id, name, category, description, address, phone, icon, bg_from, bg_to, badge, tags, is_open)
  values
    (uuid_generate_v4(), owner1, 'Alhaji Suya Spot', 'Grills',
     'Best suya in the area. The spice blend is a family secret.',
     'Block 1, Corner Shop', '081XXXXXXXX', '🔥', '#7F1D1D', '#DC2626',
     'Popular', '{"Beef Suya","Chicken","Yaji"}', true)
  returning id into r2;

  insert into public.menu_categories (id, restaurant_id, name, sort_order)
  values (uuid_generate_v4(), r2, 'Suya', 1) returning id into c1;

  insert into public.menu_items (restaurant_id, category_id, name, price, is_available, sort_order) values
    (r2, c1, 'Beef Suya (100g)',   800, true, 1),
    (r2, c1, 'Chicken Suya (100g)',700, true, 2),
    (r2, c1, 'Kidney Suya (100g)', 600, false, 3),
    (r2, c1, 'Liver Suya (100g)',  600, true, 4);

  insert into public.menu_categories (id, restaurant_id, name, sort_order)
  values (uuid_generate_v4(), r2, 'Sides', 2) returning id into c2;

  insert into public.menu_items (restaurant_id, category_id, name, price, is_available, sort_order) values
    (r2, c2, 'Yaji Spice Pack',      200, true, 1),
    (r2, c2, 'Onion & Tomato Mix',   100, true, 2);

  -- ── Restaurant 3 ─────────────────────────────────────────
  insert into public.restaurants
    (id, owner_id, name, category, description, address, phone, icon, bg_from, bg_to, badge, tags, is_open)
  values
    (uuid_generate_v4(), owner1, 'Fatima''s Snacks & More', 'Snacks',
     'Samosas, spring rolls, puff puff, shawarma. The works.',
     'Block 2, Front Row', '090XXXXXXXX', '🥐', '#78350F', '#D97706',
     'Most Visited', '{"Shawarma","Samosa","Puff Puff"}', true)
  returning id into r3;

  insert into public.menu_categories (id, restaurant_id, name, sort_order)
  values (uuid_generate_v4(), r3, 'Pastries', 1) returning id into c1;

  insert into public.menu_items (restaurant_id, category_id, name, price, is_available, sort_order) values
    (r3, c1, 'Samosa (3 pcs)',    500, true, 1),
    (r3, c1, 'Spring Roll (3 pcs)',600, true, 2),
    (r3, c1, 'Puff Puff (5 pcs)', 400, true, 3),
    (r3, c1, 'Meat Pie',          500, false, 4);

  insert into public.menu_categories (id, restaurant_id, name, sort_order)
  values (uuid_generate_v4(), r3, 'Shawarma', 2) returning id into c2;

  insert into public.menu_items (restaurant_id, category_id, name, price, is_available, sort_order) values
    (r3, c2, 'Chicken Shawarma',  1500, true, 1),
    (r3, c2, 'Beef Shawarma',     1600, true, 2),
    (r3, c2, 'Shawarma + Fries',  2000, true, 3);

  -- ── Seed posts ────────────────────────────────────────────
  insert into public.posts (restaurant_id, post_type, text, like_count, created_at) values
    (r1, 'new',    'Fresh Oha soup is ready! Come get it while it lasts — we only make this on Saturdays.', 14, now() - interval '8 minutes'),
    (r2, 'promo',  'Buy 200g of suya today and get a free Onion & Tomato Mix. Offer runs until 7pm only.',  31, now() - interval '25 minutes'),
    (r3, 'update', 'We just restocked everything. Meat pies are fresh out the oven right now.',             9,  now() - interval '44 minutes'),
    (r1, 'promo',  'Family combo: 2 plates of jollof + 2 proteins + 2 drinks for ₦5,000. Tell a friend.',  22, now() - interval '2 hours');

end $$;
