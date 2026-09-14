-- ── Freezing a café ──────────────────────────────────────────────────────────
--
-- `rejected` already stops a café ordering, but it means "this application was
-- never accepted" and the café's own screens say so. There was no way to pause
-- an account that *was* approved — for an unpaid balance, say — and no way to
-- put it back afterwards without it reading as a fresh approval.
--
-- `suspended` is that state: previously active, currently barred, reversible.
-- Everything that gates on `status = 'active'` (lib/cafe/require-cafe.ts, the
-- order path in lib/cafe/order-actions.ts) already refuses it without changes,
-- because they all test for active rather than listing the ways to be inactive.
--
-- Deleting a café is deliberately *not* part of this. orders.cafe_id is
-- `on delete restrict` (002), so a café that has ever ordered cannot be removed
-- without taking the revenue record with it, and the admin action leans on that
-- rather than working around it: it refuses, and points at suspension instead.
--
-- The constraint is inline in 001 and therefore auto-named `cafes_status_check`.
-- Dropped by that name and rebuilt, rather than added alongside, so there is one
-- constraint governing this column rather than two that must agree.
begin;

alter table public.cafes drop constraint if exists cafes_status_check;

alter table public.cafes
  add constraint cafes_status_check
  check (status in ('pending', 'active', 'rejected', 'suspended'));

commit;
