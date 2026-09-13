-- ── Write paths and rate limits ──────────────────────────────────────────────
--
-- Three escalation paths closed and one new primitive added. Like 012, none of
-- this changes which *rows* an existing policy matches — the changes are at the
-- grant, trigger and function level — so no policy is re-planned and no read
-- gets slower.
--
-- ⚠️  This migration must be applied BEFORE the code that ships with it.
--     `placeOrder` stops inserting into public.orders directly and starts
--     calling create_order_with_items() below; the café role loses INSERT on
--     both order tables at the same time.
--
-- Run inside a transaction so nothing is briefly half-protected.
begin;

-- ── 1. push_subscriptions.role must not be client-writable ───────────────────
--
-- 007 states that role "is set server-side at subscribe time and is never
-- trusted from the client", and subscribeToPush does derive it correctly from
-- the access token. But the promise was only ever kept by the application:
-- every policy on this table checks `auth.uid() = user_id` and says nothing
-- about columns, and RLS has no column granularity. A café user holding
-- nothing but the anon key and their own session could call PostgREST
-- directly:
--
--   supabase.from('push_subscriptions').insert({
--     user_id: <their own id>, role: 'admin', endpoint: <their own device>, ...
--   })
--
-- — passing the row check, because the row genuinely is theirs. sendPushToAdmins
-- selects subscriptions purely on `role = 'admin'`, so from then on that café
-- receives a push for every order placed on the platform: the ordering café's
-- name and the order value, for every café on the system.
--
-- Same shape as the `cafes.status` hole 012 closed, and the same fix, with one
-- addition. Column grants alone would break the legitimate write, because the
-- server action has to *name* role to set it. So role is taken away from the
-- client and assigned by a trigger instead, from the same signed claim the
-- server action was reading — which means the column can no longer be named by
-- anyone whose writes go through PostgREST as `authenticated`, including ours.

alter table public.push_subscriptions alter column role set default 'cafe';

create or replace function public.set_push_subscription_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Trusted writers pass through untouched: a direct psql or SQL-editor
  -- connection has no JWT at all, and the service-role client (which
  -- lib/push/send.ts uses to prune dead subscriptions) presents role
  -- 'service_role'. Without this arm, any maintenance UPDATE run from the SQL
  -- editor would silently rewrite every admin's subscription to 'cafe' —
  -- including the corrective statement below.
  --
  -- Every request through PostgREST carries a JWT, including the anon key, so
  -- there is no way for an end user to reach this as "no JWT".
  if auth.jwt() is null
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin') then
    return new;
  end if;

  new.role := case
    when coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' then 'admin'
    else 'cafe'
  end;

  return new;
end;
$$;

-- EXECUTE is deliberately left at the default here. Postgres checks EXECUTE on
-- a trigger function when the trigger is *created*, not when it fires, so
-- revoking it risks the trigger rather than securing it — and a trigger
-- function cannot be called directly in any case ("trigger functions can only
-- be called as triggers"), so there is nothing to reach.

-- Repair before arming: any row that already claims a role its owner does not
-- have. The hole above was open from 007 until now, so this is not
-- hypothetical — and after the trigger exists, a corrective UPDATE run from the
-- SQL editor is exactly the case the first arm of the function guards.
update public.push_subscriptions ps
set role = case
             when coalesce(u.raw_app_meta_data ->> 'role', '') = 'admin' then 'admin'
             else 'cafe'
           end
from auth.users u
where u.id = ps.user_id
  and ps.role is distinct from (case
                                  when coalesce(u.raw_app_meta_data ->> 'role', '') = 'admin' then 'admin'
                                  else 'cafe'
                                end);

drop trigger if exists push_subscriptions_set_role on public.push_subscriptions;

create trigger push_subscriptions_set_role
  before insert or update on public.push_subscriptions
  for each row execute function public.set_push_subscription_role();

-- BEFORE triggers fire ahead of the NOT NULL check, so a row that never names
-- `role` still lands with the trigger's value rather than failing.
revoke insert, update on public.push_subscriptions from authenticated;

grant insert (user_id, endpoint, p256dh, auth_key)
  on public.push_subscriptions to authenticated;

-- `user_id` stays updatable so the existing upsert-on-endpoint keeps working
-- when a device is re-subscribed; push_subscriptions_update_own's USING clause
-- is evaluated against the *existing* row, so it still cannot be used to seize
-- someone else's subscription.
grant update (user_id, endpoint, p256dh, auth_key)
  on public.push_subscriptions to authenticated;


-- ── 2. Orders are written whole, or not at all ───────────────────────────────
--
-- `order_items_insert_own` checked only that the parent order belongs to the
-- caller. It had no time bound and no price bound, so a café could keep
-- inserting lines into an order it placed days ago, at any unit price it liked
-- including zero:
--
--   supabase.from('order_items').insert({
--     order_id: <their own, already-placed order>,
--     product_id: <anything>, quantity: 500, unit_price_at_time_of_order: 0
--   })
--
-- orders.total_amount is not café-writable, so the total stays where placeOrder
-- computed it while the fulfilment list underneath it grows — free goods. It
-- also raced the `after()` invoice generation: lines added in that window land
-- on the PDF, lines added later do not, and neither matches the total.
--
-- A time-and-price bound on the policy would narrow the window, but the real
-- observation is that the café's own client never needed write access to these
-- tables at all. placeOrder already resolves every price server-side from
-- products/cafe_product_prices and ignores whatever the client claimed; the
-- café session was being used as the writer only because it was the client
-- already in hand. So the write moves behind a SECURITY DEFINER function that
-- only the service role may call, and the grants go away.
--
-- This also fixes a correctness bug the old code documented but could not
-- solve: the order row and its items were two separate PostgREST calls, so a
-- failure between them left an order with a total and no line items ("Order
-- created but items failed to save. Please contact support."). One function
-- call is one transaction.

create or replace function public.create_order_with_items(
  p_cafe_id       uuid,
  p_payment_type  text,
  p_delivery_date date,
  p_total_amount  numeric,
  p_items         jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  insert into public.orders (cafe_id, total_amount, payment_type, payment_status, delivery_date)
  values (p_cafe_id, p_total_amount, p_payment_type, 'pending', p_delivery_date)
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, unit_price_at_time_of_order)
  select
    v_order_id,
    (item ->> 'product_id')::uuid,
    (item ->> 'quantity')::int,
    (item ->> 'unit_price_at_time_of_order')::numeric
  from jsonb_array_elements(p_items) as item;

  -- An order with no lines is never something the caller meant to create.
  if not found then
    raise exception 'create_order_with_items: no line items supplied';
  end if;

  return v_order_id;
end;
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC by default — the same
-- default that left next_invoice_seq() open until 012. Undo it explicitly.
revoke all on function public.create_order_with_items(uuid, text, date, numeric, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_order_with_items(uuid, text, date, numeric, jsonb)
  to service_role;

drop policy if exists "orders_insert_own" on public.orders;
drop policy if exists "order_items_insert_own" on public.order_items;

revoke insert on public.orders from authenticated;
revoke insert on public.order_items from authenticated;

-- SELECT policies are untouched: a café still reads its own orders and lines.


-- ── 3. Rate limiting ─────────────────────────────────────────────────────────
--
-- A fixed-window counter, kept in Postgres rather than in process memory
-- because this app runs on serverless functions: an in-memory limiter there
-- counts per-instance, which for an attacker is no limiter at all.
--
-- The table is service-role-only — RLS is enabled with no policies at all, so
-- `authenticated` and `anon` match nothing, and the function below is the only
-- way in. Keys are opaque strings built by lib/rate-limit.ts; sign-in keys hash
-- the email rather than storing it, so this table never becomes a list of
-- addresses that have been tried.

create table if not exists public.rate_limits (
  key          text        primary key,
  window_start timestamptz not null default now(),
  hit_count    int         not null default 0
);

alter table public.rate_limits enable row level security;

-- Supports the sweep below; the primary key already serves the hot path.
create index if not exists rate_limits_window_start_idx
  on public.rate_limits (window_start);

create or replace function public.consume_rate_limit(
  p_key            text,
  p_limit          int,
  p_window_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now          timestamptz := now();
  v_window_start timestamptz;
  v_count        int;
  v_expired      boolean;
begin
  insert into public.rate_limits as rl (key, window_start, hit_count)
  values (p_key, v_now, 1)
  on conflict (key) do update
    -- Both arms read rl.window_start, which inside DO UPDATE is still the
    -- stored value — so "has the window expired?" is answered once, against
    -- the row as it was before this hit.
    set window_start = case
          when rl.window_start < v_now - make_interval(secs => p_window_seconds)
          then v_now else rl.window_start end,
        hit_count = case
          when rl.window_start < v_now - make_interval(secs => p_window_seconds)
          then 1 else rl.hit_count + 1 end
  returning rl.window_start, rl.hit_count into v_window_start, v_count;

  return jsonb_build_object(
    'allowed', v_count <= p_limit,
    'retry_after',
      greatest(0, ceil(extract(epoch from
        (v_window_start + make_interval(secs => p_window_seconds)) - v_now))::int)
  );
end;
$$;

revoke all on function public.consume_rate_limit(text, int, int)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, int, int) to service_role;

-- Rows are only interesting while their window is open. Nothing calls this on
-- the request path; run it from a scheduled job (pg_cron) or leave it — the
-- table stays small either way, since keys are reused rather than appended.
create or replace function public.prune_rate_limits(p_older_than_seconds int default 86400)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits
  where window_start < now() - make_interval(secs => p_older_than_seconds);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_rate_limits(int) from public, anon, authenticated;
grant execute on function public.prune_rate_limits(int) to service_role;


-- ── 4. Storage: enforce image type and size at the bucket ────────────────────
--
-- Product images are uploaded straight from the browser to Storage with a
-- signed URL, so the bytes never pass through Next.js and no server action can
-- inspect them. Validating the filename in createProductImageUploadUrl (which
-- it now does) constrains the *path*, not the content — nothing stopped a
-- 200MB file, or an HTML document, being PUT to a .webp key.
--
-- Supabase Storage enforces both of these itself, on the upload request, which
-- is the only place in this design that actually sees the file.
update storage.buckets
set file_size_limit   = 5242880,  -- 5 MB; the client re-encodes to ~200KB first
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'product-images';

update storage.buckets
set file_size_limit   = 10485760,  -- 10 MB
    allowed_mime_types = array['application/pdf']
where id = 'invoices';

commit;
