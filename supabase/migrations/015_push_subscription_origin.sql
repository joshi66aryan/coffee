-- ── Which deployment a push subscription belongs to ──────────────────────────
--
-- One Supabase project sits behind both local development and production, so
-- push_subscriptions is shared between them — and every send fans out to every
-- row matching the role, with nothing recording where the row came from. A
-- laptop running `npm run dev` therefore notifies real cafés' phones about test
-- orders it just placed in their name, and a real order rings a developer's
-- localhost tab. The pair of notifications for one order is how this surfaced;
-- the test order reaching a café is the part that matters.
--
-- The origin the browser subscribed on is the missing fact, so it is recorded
-- at subscribe time (lib/push/actions.ts, from getSiteOrigin) and the send path
-- keeps local and deployed subscriptions apart (lib/push/send.ts).
--
-- Null on every row created before this migration. Deliberately not
-- backfilled: the correct value would have to be guessed, and guessing wrong
-- silences a café's notifications with the toggle still reading ON — the exact
-- failure this app has already been bitten by. Unknown is instead treated as
-- "not local", so production keeps notifying those rows exactly as it does
-- today and only a dev server changes behaviour.
--
-- ⚠️  This migration must be applied BEFORE the code that ships with it.
--     subscribeToPush starts writing `origin` and the send path starts
--     selecting it; against a table without the column, PostgREST fails both —
--     nobody can enable notifications and nobody is notified.
--
-- Forgeable by the client, and that is fine: 013 took `role` away precisely
-- because a café could name it and be notified about every order on the
-- platform. This column cannot reach anyone else's rows (RLS still scopes every
-- write to auth.uid()), and the only thing a café can do by lying about it is
-- stop its own notifications arriving.
begin;

alter table public.push_subscriptions
  add column if not exists origin text;

comment on column public.push_subscriptions.origin is
  'Origin the browser subscribed on, e.g. https://www.example.com or http://localhost:3000. Null on rows predating migration 015, which the send path treats as non-local.';

-- Grants have been column-scoped on this table since 013, so a new column is
-- not writable by the app until it is named here.
grant insert (origin) on public.push_subscriptions to authenticated;
grant update (origin) on public.push_subscriptions to authenticated;

commit;
