-- ── Privilege boundaries ─────────────────────────────────────────────────────
--
-- Two escalation paths closed here. Neither changes which *rows* anyone can
-- reach, so no policy is re-planned and no query gets slower — these are
-- grant-level and EXECUTE-level restrictions only.
--
-- Run inside a transaction so the tables are never briefly unprotected.
begin;

-- ── 1. cafes: a café must not be able to approve itself ──────────────────────
--
-- `cafe_insert_own` / `cafe_update_own` are row-scoped (`id = auth.uid()`) but
-- say nothing about *columns*. RLS has no column granularity, so with only
-- those policies a café user holding nothing but the anon key and their own
-- session could call PostgREST directly:
--
--   supabase.from('cafes').update({ status: 'active', credit_enabled: true })
--                         .eq('id', <their own id>)
--
-- and self-approve out of `pending`, plus grant themselves credit terms —
-- `placeOrder` reads both of those columns back from this row and trusts them.
-- The same holds for INSERT at onboarding: nothing stopped a first profile
-- being written with status 'active' directly.
--
-- Column-level grants are the missing half. Postgres checks them *before* RLS,
-- so `authenticated` simply has no privilege to name these columns in a write.
-- status and credit_enabled fall back to their defaults ('pending', false) on
-- insert, and are writable only by the service-role client behind assertAdmin
-- (approveCafe / rejectCafe / updateCafeCreditEnabled), which bypasses grants.
--
-- `id` stays insertable — onboarding writes it, and `cafe_insert_own`'s WITH
-- CHECK pins it to auth.uid(). It is deliberately NOT updatable: row ownership
-- must not be transferable.

revoke insert, update on public.cafes from authenticated;

grant insert (id, name, contact_name, phone, neighborhood, delivery_address)
  on public.cafes to authenticated;

grant update (name, contact_name, phone, neighborhood, delivery_address)
  on public.cafes to authenticated;

-- ── 2. next_invoice_seq: not a public sequence dispenser ─────────────────────
--
-- 005 created this SECURITY DEFINER function on the assumption that "only the
-- service-role client calls it, so it needs no grant". Postgres grants EXECUTE
-- on new functions to PUBLIC by default, so in fact every authenticated user
-- could call it over RPC and burn invoice numbers — leaving permanent gaps in
-- a financial sequence, at whatever rate they cared to send requests.
--
-- Locked down the same way migration 011 locks the dashboard aggregates.
-- search_path is already pinned to `public` on the function, so the definer's
-- rights cannot be redirected through a shadowing schema.

revoke all on function public.next_invoice_seq() from public;
revoke all on function public.next_invoice_seq() from anon;
revoke all on function public.next_invoice_seq() from authenticated;
grant execute on function public.next_invoice_seq() to service_role;

commit;
