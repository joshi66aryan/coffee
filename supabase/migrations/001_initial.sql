-- Café accounts — one row per auth user who is a café manager
create table if not exists public.cafes (
  id              uuid references auth.users(id) on delete cascade primary key,
  name            text        not null,
  contact_name    text        not null,
  phone           text        not null,
  neighborhood    text        not null,
  delivery_address text       not null,
  status          text        not null default 'pending'
                  check (status in ('pending', 'active', 'rejected')),
  credit_enabled  boolean     not null default false,
  created_at      timestamptz not null default now()
);

alter table public.cafes enable row level security;

-- Café user can read their own profile
create policy "cafe_select_own"
  on public.cafes for select
  to authenticated
  using (auth.uid() = id);

-- Café user can insert their own profile during onboarding
create policy "cafe_insert_own"
  on public.cafes for insert
  to authenticated
  with check (auth.uid() = id);

-- Café user can update their own contact/address fields
-- Status changes are admin-only (enforced via service-role client in server actions)
create policy "cafe_update_own"
  on public.cafes for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
