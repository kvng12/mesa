-- ============================================================
--  Migration: Add admin + full RLS policies for orders table
--  Run this in: Supabase Dashboard → SQL Editor → New Query
--
--  Problem: Admin Panel showed orders count = 0 because the
--  orders table had no SELECT policy for admin users. Supabase
--  RLS silently returns 0 rows (and count=0) when no policy
--  matches, so the bug showed up as a zeroed stat rather than
--  an error.
-- ============================================================

-- ORDERS — add the three SELECT policies if they don't exist yet
do $$
begin

  if not exists (
    select 1 from pg_policies
    where tablename = 'orders' and policyname = 'Customers can read own orders'
  ) then
    execute $p$
      create policy "Customers can read own orders"
        on public.orders for select
        using (auth.uid() = customer_id)
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'orders' and policyname = 'Restaurant owners can read their orders'
  ) then
    execute $p$
      create policy "Restaurant owners can read their orders"
        on public.orders for select
        using (
          exists (
            select 1 from public.restaurants r
            where r.id = restaurant_id and r.owner_id = auth.uid()
          )
        )
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'orders' and policyname = 'Admins can read all orders'
  ) then
    execute $p$
      create policy "Admins can read all orders"
        on public.orders for select
        using (
          exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
          )
        )
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'orders' and policyname = 'Customers can place orders'
  ) then
    execute $p$
      create policy "Customers can place orders"
        on public.orders for insert
        with check (auth.uid() = customer_id)
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'orders' and policyname = 'Restaurant owners can update order status'
  ) then
    execute $p$
      create policy "Restaurant owners can update order status"
        on public.orders for update
        using (
          exists (
            select 1 from public.restaurants r
            where r.id = restaurant_id and r.owner_id = auth.uid()
          )
        )
    $p$;
  end if;

end $$;


-- ORDER ITEMS
do $$
begin

  if not exists (
    select 1 from pg_policies
    where tablename = 'order_items' and policyname = 'Customers can read own order items'
  ) then
    execute $p$
      create policy "Customers can read own order items"
        on public.order_items for select
        using (
          exists (
            select 1 from public.orders o
            where o.id = order_id and o.customer_id = auth.uid()
          )
        )
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'order_items' and policyname = 'Restaurant owners can read their order items'
  ) then
    execute $p$
      create policy "Restaurant owners can read their order items"
        on public.order_items for select
        using (
          exists (
            select 1 from public.orders o
            join public.restaurants r on r.id = o.restaurant_id
            where o.id = order_id and r.owner_id = auth.uid()
          )
        )
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'order_items' and policyname = 'Admins can read all order items'
  ) then
    execute $p$
      create policy "Admins can read all order items"
        on public.order_items for select
        using (
          exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
          )
        )
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'order_items' and policyname = 'Customers can insert order items'
  ) then
    execute $p$
      create policy "Customers can insert order items"
        on public.order_items for insert
        with check (
          exists (
            select 1 from public.orders o
            where o.id = order_id and o.customer_id = auth.uid()
          )
        )
    $p$;
  end if;

end $$;


-- Verify: list all policies on both tables
select tablename, policyname, cmd
from pg_policies
where tablename in ('orders', 'order_items')
order by tablename, policyname;
