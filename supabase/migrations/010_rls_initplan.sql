-- ── RLS policy performance ───────────────────────────────────────────────────
--
-- Two standard Supabase RLS optimisations, neither of which changes who can
-- see what. Every policy below grants exactly the same rows as before.
--
-- 1. `auth.uid()` / `auth.jwt()` written bare in a policy are re-evaluated for
--    every candidate row. Wrapping them in a scalar subquery — `(select
--    auth.uid())` — lets the planner hoist them into an InitPlan that runs once
--    per statement. The larger the table, the bigger the difference.
--
-- 2. `orders` and `cafes` each had two *permissive* SELECT policies for the
--    same `authenticated` role (owner access + admin access). Postgres
--    evaluates every permissive policy and ORs the results, so café users were
--    paying for the admin JWT check on every row and vice versa. Merging each
--    pair into one policy with an explicit OR is equivalent and evaluated once.
--
-- Run inside a transaction so the tables are never briefly unprotected.
begin;

-- ── cafes ────────────────────────────────────────────────────────────────────

drop policy if exists "cafe_select_own"        on public.cafes;
drop policy if exists "admin_select_all_cafes" on public.cafes;

-- Merge of cafe_select_own OR admin_select_all_cafes.
create policy "cafes_select"
  on public.cafes for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "cafe_insert_own" on public.cafes;
create policy "cafe_insert_own"
  on public.cafes for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "cafe_update_own" on public.cafes;
create policy "cafe_update_own"
  on public.cafes for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ── cafe_product_prices ──────────────────────────────────────────────────────

drop policy if exists "cafe_product_prices_select_own" on public.cafe_product_prices;
create policy "cafe_product_prices_select_own"
  on public.cafe_product_prices for select
  to authenticated
  using (cafe_id = (select auth.uid()));

-- ── orders ───────────────────────────────────────────────────────────────────

drop policy if exists "orders_select_own"        on public.orders;
drop policy if exists "admin_select_all_orders"  on public.orders;

-- Merge of orders_select_own OR admin_select_all_orders. Realtime filters
-- events through this same policy, so admins keep receiving order events.
create policy "orders_select"
  on public.orders for select
  to authenticated
  using (
    cafe_id = (select auth.uid())
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders for insert
  to authenticated
  with check (cafe_id = (select auth.uid()));

-- ── order_items ──────────────────────────────────────────────────────────────

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.cafe_id = (select auth.uid())
    )
  );

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.cafe_id = (select auth.uid())
    )
  );

-- ── invoices ─────────────────────────────────────────────────────────────────

drop policy if exists "invoices_select_own" on public.invoices;
create policy "invoices_select_own"
  on public.invoices for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = invoices.order_id
        and orders.cafe_id = (select auth.uid())
    )
  );

-- ── push_subscriptions ───────────────────────────────────────────────────────

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = (select auth.uid()));

commit;
