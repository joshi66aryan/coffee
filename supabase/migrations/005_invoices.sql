-- ── Sequential invoice numbers (INV-001, INV-002, ...) ─────────────────────────

create sequence if not exists public.invoice_number_seq;

-- Returns the next sequence value only — formatting (zero-padding, prefix)
-- happens in application code so it stays unit-testable.
-- Only ever called via the service-role client (order placement), which
-- bypasses grants entirely — no explicit grant needed.
create or replace function public.next_invoice_seq()
returns bigint
language sql
security definer
set search_path = public
as $$
  select nextval('public.invoice_number_seq');
$$;


-- ── Invoices ─────────────────────────────────────────────────────────────────

create table if not exists public.invoices (
  id             uuid        primary key default gen_random_uuid(),
  order_id       uuid        not null references public.orders(id) on delete cascade,
  invoice_number text        not null unique,
  pdf_path       text        not null,
  generated_at   timestamptz not null default now(),
  unique (order_id)
);

alter table public.invoices enable row level security;

-- Café users can read invoices for their own orders
create policy "invoices_select_own"
  on public.invoices for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = invoices.order_id
        and orders.cafe_id = auth.uid()
    )
  );

-- Writes happen via the service-role client at order-placement time — no insert policy needed.


-- ── Storage bucket for invoice PDFs (private — financial data) ────────────────

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- Objects are stored at `${cafe_id}/${order_id}.pdf` so RLS can scope reads by
-- folder, the same way a café only ever sees its own invoice PDFs.
create policy "cafe_read_own_invoices"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin writes/reads via the service-role client (bypasses RLS) — no extra policy needed.
