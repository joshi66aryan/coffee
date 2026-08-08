-- Enable Realtime on orders and products so browsers get live postgres_changes
-- events instead of relying on polling.
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.products;

-- Admin users need to SELECT all order rows for Realtime to deliver events for
-- orders that don't belong to them (mirrors admin_select_all_cafes from 003).
create policy "admin_select_all_orders"
  on public.orders for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
