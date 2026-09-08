-- ── Product archiving ───────────────────────────────────────────────────────
--
-- order_items.product_id is `on delete restrict` (002_catalog_orders.sql) so
-- that historical order/invoice line items always resolve to a real product.
-- That means a product with order history can never be hard-deleted. Archiving
-- gives admins a working "delete" for that case: the row stays (order history
-- stays intact) but disappears from the catalog and admin product list.

alter table public.products add column if not exists archived_at timestamptz;

create index if not exists products_archived_at_idx on public.products (archived_at);
