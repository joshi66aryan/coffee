-- ── Products ─────────────────────────────────────────────────────────────────

create table if not exists public.products (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  category     text        not null,
  unit         text        not null,
  base_price   numeric(10,2) not null check (base_price >= 0),
  stock_status text        not null default 'in_stock'
               check (stock_status in ('in_stock', 'low', 'out_of_stock')),
  description  text,
  created_at   timestamptz not null default now()
);

alter table public.products enable row level security;

-- All authenticated users can browse the catalog
create policy "products_select_authenticated"
  on public.products for select
  to authenticated
  using (true);

-- Admin writes via service-role client (bypasses RLS) — no extra policy needed


-- ── Per-café pricing overrides ────────────────────────────────────────────────

create table if not exists public.cafe_product_prices (
  id           uuid        primary key default gen_random_uuid(),
  cafe_id      uuid        not null references public.cafes(id)    on delete cascade,
  product_id   uuid        not null references public.products(id) on delete cascade,
  custom_price numeric(10,2) not null check (custom_price >= 0),
  created_at   timestamptz not null default now(),
  unique (cafe_id, product_id)
);

alter table public.cafe_product_prices enable row level security;

-- Café users can see their own price overrides
create policy "cafe_product_prices_select_own"
  on public.cafe_product_prices for select
  to authenticated
  using (auth.uid() = cafe_id);


-- ── Orders ───────────────────────────────────────────────────────────────────

create table if not exists public.orders (
  id             uuid        primary key default gen_random_uuid(),
  cafe_id        uuid        not null references public.cafes(id) on delete restrict,
  status         text        not null default 'received'
                 check (status in ('received', 'confirmed', 'out_for_delivery', 'delivered')),
  total_amount   numeric(10,2) not null check (total_amount >= 0),
  payment_type   text        not null
                 check (payment_type in ('cash', 'credit')),
  payment_status text        not null default 'pending'
                 check (payment_status in ('paid', 'pending', 'due')),
  invoice_number text,
  delivery_date  date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.orders enable row level security;

-- Café users can read their own orders
create policy "orders_select_own"
  on public.orders for select
  to authenticated
  using (auth.uid() = cafe_id);

-- Café users can place new orders for themselves
create policy "orders_insert_own"
  on public.orders for insert
  to authenticated
  with check (auth.uid() = cafe_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();


-- ── Order items ───────────────────────────────────────────────────────────────

create table if not exists public.order_items (
  id                          uuid    primary key default gen_random_uuid(),
  order_id                    uuid    not null references public.orders(id)   on delete cascade,
  product_id                  uuid    not null references public.products(id) on delete restrict,
  quantity                    int     not null check (quantity > 0),
  unit_price_at_time_of_order numeric(10,2) not null check (unit_price_at_time_of_order >= 0)
);

alter table public.order_items enable row level security;

-- Café users can read items for their own orders
create policy "order_items_select_own"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.cafe_id = auth.uid()
    )
  );

-- Café users can insert items when placing an order
create policy "order_items_insert_own"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.cafe_id = auth.uid()
    )
  );
