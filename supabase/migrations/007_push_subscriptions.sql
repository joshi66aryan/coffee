-- Web Push subscriptions, one row per browser/device a user has enabled
-- notifications on. Role is set server-side at subscribe time and is never
-- trusted from the client.
create table if not exists public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  role       text        not null check (role in ('admin', 'cafe')),
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth_key   text        not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Users manage their own subscriptions (server actions run as the
-- authenticated user for these writes, not the service-role client).
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);
