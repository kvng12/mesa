-- ============================================================
--  MESA — Supabase Database Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ── PROFILES ────────────────────────────────────────────────
-- Extends the built-in auth.users table.
-- Created automatically on sign-up via a trigger.

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        text not null default 'customer'  -- 'customer' | 'owner' | 'admin'
              check (role in ('customer', 'owner', 'admin')),
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── RESTAURANTS ─────────────────────────────────────────────
create table public.restaurants (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  category    text not null,
  description text,
  address     text,
  phone       text,
  icon        text default '🍽️',
  bg_from     text default '#7C2D12',     -- gradient start colour
  bg_to       text default '#C2410C',     -- gradient end colour
  badge       text,                        -- e.g. "Top Rated", "Popular"
  tags        text[] default '{}',         -- e.g. {"Jollof Rice","Egusi"}
  is_open     boolean not null default false,
  created_at  timestamptz not null default now()
);


-- ── MENU CATEGORIES ─────────────────────────────────────────
create table public.menu_categories (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);


-- ── MENU ITEMS ──────────────────────────────────────────────
create table public.menu_items (
  id            uuid primary key default uuid_generate_v4(),
  category_id   uuid not null references public.menu_categories(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  price         numeric(10, 2) not null,
  is_available  boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);


-- ── ORDERS ──────────────────────────────────────────────────
create table public.orders (
  id               uuid primary key default uuid_generate_v4(),
  customer_id      uuid not null references public.profiles(id) on delete cascade,
  restaurant_id    uuid not null references public.restaurants(id) on delete cascade,
  status           text not null default 'pending'
                   check (status in ('pending','confirmed','preparing','ready','delivered','cancelled')),
  fulfillment      text not null default 'pickup'
                   check (fulfillment in ('pickup','delivery')),
  payment_method   text not null default 'cash'
                   check (payment_method in ('cash','card','transfer')),
  payment_status   text not null default 'unpaid'
                   check (payment_status in ('unpaid','paid','refunded')),
  subtotal         numeric(10, 2) not null default 0,
  note             text,
  delivery_address text,
  created_at       timestamptz not null default now()
);

create table public.order_items (
  id           uuid primary key default uuid_generate_v4(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name         text not null,
  price        numeric(10, 2) not null,
  quantity     int not null default 1,
  line_total   numeric(10, 2) not null,
  created_at   timestamptz not null default now()
);


-- ── POSTS (feed updates) ─────────────────────────────────────
create table public.posts (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  post_type     text not null default 'update'
                check (post_type in ('new', 'promo', 'update', 'sold_out')),
  text          text not null,
  like_count    int not null default 0,
  created_at    timestamptz not null default now()
);


-- ── LIKES ───────────────────────────────────────────────────
-- One row per user-post pair to prevent double-liking.
create table public.likes (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

-- Keep like_count in sync automatically
create or replace function public.update_like_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set like_count = like_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger on_like_change
  after insert or delete on public.likes
  for each row execute procedure public.update_like_count();


-- ── INDEXES ─────────────────────────────────────────────────
create index idx_restaurants_owner on public.restaurants(owner_id);
create index idx_restaurants_open  on public.restaurants(is_open);
create index idx_menu_items_rest   on public.menu_items(restaurant_id);
create index idx_menu_items_cat    on public.menu_items(category_id);
create index idx_orders_customer   on public.orders(customer_id);
create index idx_orders_restaurant on public.orders(restaurant_id);
create index idx_orders_status     on public.orders(status);
create index idx_orders_created    on public.orders(created_at desc);
create index idx_order_items_order on public.order_items(order_id);
create index idx_posts_restaurant  on public.posts(restaurant_id);
create index idx_posts_created     on public.posts(created_at desc);
create index idx_likes_post        on public.likes(post_id);
create index idx_likes_user        on public.likes(user_id);


-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.restaurants     enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items      enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.posts           enable row level security;
alter table public.likes           enable row level security;


-- PROFILES
create policy "Users can read any profile"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);


-- RESTAURANTS
create policy "Anyone can read restaurants"
  on public.restaurants for select using (true);

create policy "Owners can insert their own restaurant"
  on public.restaurants for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update own restaurant"
  on public.restaurants for update
  using (auth.uid() = owner_id);

create policy "Owners can delete own restaurant"
  on public.restaurants for delete
  using (auth.uid() = owner_id);


-- MENU CATEGORIES
create policy "Anyone can read menu categories"
  on public.menu_categories for select using (true);

create policy "Owners can manage own categories"
  on public.menu_categories for all
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );


-- MENU ITEMS
create policy "Anyone can read menu items"
  on public.menu_items for select using (true);

create policy "Owners can manage own items"
  on public.menu_items for all
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );


-- ORDERS
-- Helper: is the current user an admin?
-- (Inlined as a subquery to avoid a separate function.)

create policy "Customers can read own orders"
  on public.orders for select
  using (auth.uid() = customer_id);

create policy "Restaurant owners can read their orders"
  on public.orders for select
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "Admins can read all orders"
  on public.orders for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Customers can place orders"
  on public.orders for insert
  with check (auth.uid() = customer_id);

create policy "Restaurant owners can update order status"
  on public.orders for update
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );


-- ORDER ITEMS
create policy "Customers can read own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );

create policy "Restaurant owners can read their order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      join public.restaurants r on r.id = o.restaurant_id
      where o.id = order_id and r.owner_id = auth.uid()
    )
  );

create policy "Admins can read all order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Customers can insert order items"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );


-- POSTS
create policy "Anyone can read posts"
  on public.posts for select using (true);

create policy "Owners can create posts for their restaurant"
  on public.posts for insert
  with check (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "Owners can delete own posts"
  on public.posts for delete
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );


-- LIKES
create policy "Anyone can read likes"
  on public.likes for select using (true);

create policy "Authenticated users can like"
  on public.likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike their own likes"
  on public.likes for delete
  using (auth.uid() = user_id);
