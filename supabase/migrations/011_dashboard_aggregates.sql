-- ── Server-side dashboard aggregation ────────────────────────────────────────
--
-- The admin dashboard previously read *every* row of `orders` and *every* row
-- of `order_items` (joined to products) across the wire on each load, then
-- reduced them in JavaScript. The transferred payload and the reduce cost both
-- grew linearly with the lifetime order count, for six small numbers, one
-- 60-day sparkline and a top-5 list.
--
-- This computes the same figures in Postgres and returns a single JSON object.
--
-- Deliberately NOT `security definer`: getDashboardStats already calls it with
-- the service-role client (which bypasses RLS) after its own admin check, so
-- the function needs no elevated rights of its own. Execute is revoked from
-- anon/authenticated so it cannot become a way for a café user to read
-- platform-wide totals.

create or replace function public.admin_dashboard_stats(trend_days int default 60)
returns json
language sql
stable
as $$
  select json_build_object(
    'total_sales',
      (select coalesce(sum(total_amount), 0)::float8 from public.orders),
    'total_orders',
      (select count(*) from public.orders),
    'active_orders',
      (select count(*) from public.orders
        where status in ('received', 'confirmed', 'out_for_delivery')),
    'outstanding_total',
      (select coalesce(sum(total_amount), 0)::float8 from public.orders
        where payment_status in ('pending', 'due')),

    'active_cafes',
      (select count(*) from public.cafes where status = 'active'),
    'pending_cafes',
      (select count(*) from public.cafes where status = 'pending'),

    -- Sparse: only statuses that actually occur. The client maps these onto the
    -- fixed received -> delivered ordering the chart expects.
    'status_counts',
      (select coalesce(json_agg(json_build_object('status', s.status, 'count', s.count)), '[]'::json)
         from (select status, count(*) as count
                 from public.orders
                group by status) s),

    -- Sparse: only days that had orders, bucketed by UTC calendar day to match
    -- the previous JavaScript (which sliced the ISO timestamp). The client
    -- fills the empty days so the trend line stays continuous.
    'sales_trend',
      (select coalesce(json_agg(json_build_object('date', to_char(t.day, 'YYYY-MM-DD'), 'total', t.total)
                                order by t.day), '[]'::json)
         from (select (created_at at time zone 'UTC')::date as day,
                      sum(total_amount)::float8            as total
                 from public.orders
                where created_at >= ((now() at time zone 'UTC')::date
                                     - make_interval(days => trend_days - 1))
                group by 1) t),

    'top_products',
      (select coalesce(json_agg(json_build_object(
                'product_id',    tp.product_id,
                'name',          tp.name,
                'quantity_sold', tp.quantity_sold,
                'revenue',       tp.revenue) order by tp.quantity_sold desc), '[]'::json)
         from (select oi.product_id,
                      coalesce(max(p.name), 'Unknown product')                as name,
                      sum(oi.quantity)::bigint                                as quantity_sold,
                      sum(oi.quantity * oi.unit_price_at_time_of_order)::float8 as revenue
                 from public.order_items oi
                 left join public.products p on p.id = oi.product_id
                group by oi.product_id
                order by sum(oi.quantity) desc
                limit 5) tp)
  );
$$;

revoke all on function public.admin_dashboard_stats(int) from public;
revoke all on function public.admin_dashboard_stats(int) from anon;
revoke all on function public.admin_dashboard_stats(int) from authenticated;
grant execute on function public.admin_dashboard_stats(int) to service_role;


-- ── Payments page totals ─────────────────────────────────────────────────────
--
-- The payments page summed outstanding and paid amounts by fetching the
-- total_amount of every matching order — the whole orders table, split in two —
-- on every load, purely to render two figures in the header.

create or replace function public.admin_payment_totals()
returns json
language sql
stable
as $$
  select json_build_object(
    'outstanding_total',
      (select coalesce(sum(total_amount), 0)::float8 from public.orders
        where payment_status in ('pending', 'due')),
    'paid_total',
      (select coalesce(sum(total_amount), 0)::float8 from public.orders
        where payment_status = 'paid')
  );
$$;

revoke all on function public.admin_payment_totals() from public;
revoke all on function public.admin_payment_totals() from anon;
revoke all on function public.admin_payment_totals() from authenticated;
grant execute on function public.admin_payment_totals() to service_role;
