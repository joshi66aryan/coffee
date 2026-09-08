-- ── Indexes for the app's actual query patterns ──────────────────────────────
--
-- Postgres does NOT create an index for a foreign key automatically, and until
-- now the only index in the schema was products_archived_at_idx (008). Every
-- lookup below was therefore a sequential scan whose cost grows with the table:
-- fine on a demo dataset, progressively slower as real orders accumulate.
--
-- Written with `if not exists` so this is safe to re-run.

-- ── orders ───────────────────────────────────────────────────────────────────

-- The café-facing workhorse: "my orders, newest first", used by the order
-- history page (paged), the profile page's last-order card and the home page's
-- repeat-order card. Also serves the `orders_select_own` RLS check on its own,
-- since cafe_id leads the index.
create index if not exists orders_cafe_id_created_at_idx
  on public.orders (cafe_id, created_at desc);

-- Admin order queue and payments list both sort the whole table by recency.
create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

-- Admin order queue status filter, and the dashboard's active-order count.
create index if not exists orders_status_idx
  on public.orders (status);

-- Payments page filters on payment_status ('unpaid' = pending|due, or paid)
-- and the dashboard sums outstanding amounts by the same column.
create index if not exists orders_payment_status_idx
  on public.orders (payment_status);

-- The profile page's outstanding-bills card: this café's unpaid orders only.
create index if not exists orders_cafe_id_payment_status_idx
  on public.orders (cafe_id, payment_status);

-- ── order_items ──────────────────────────────────────────────────────────────

-- The most important index here. order_id is read by every order detail page,
-- by the order-history preview (`in (...)` over a page of order ids), and by
-- the `order_items_select_own` / `_insert_own` RLS policies, which run an
-- `exists (select 1 from orders where orders.id = order_items.order_id)`
-- subquery per row. Without this index that subquery re-scans order_items.
create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

-- deleteProduct counts a product's order history before deciding to archive
-- vs. hard-delete, and the dashboard aggregates line items per product.
create index if not exists order_items_product_id_idx
  on public.order_items (product_id);

-- ── push_subscriptions ───────────────────────────────────────────────────────

-- Only `endpoint` had an index (via its unique constraint). user_id is read on
-- essentially every authenticated page render (the notification toggle's
-- state) and by all four push_subscriptions RLS policies.
create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- sendPushToAdmins fans out to every admin subscription by role.
create index if not exists push_subscriptions_role_idx
  on public.push_subscriptions (role);

-- ── cafes ────────────────────────────────────────────────────────────────────

-- Admin café list sorts by recency; the dashboard counts by status.
create index if not exists cafes_created_at_idx
  on public.cafes (created_at desc);

create index if not exists cafes_status_idx
  on public.cafes (status);
