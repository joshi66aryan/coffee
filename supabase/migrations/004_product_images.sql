-- Add image_url column to products
alter table public.products add column if not exists image_url text;

-- Create storage bucket for product images (public read, admin write)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Allow anyone to read product images (public catalog)
create policy "public_read_product_images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Only authenticated admins can upload / update / delete product images
create policy "admin_insert_product_images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "admin_update_product_images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "admin_delete_product_images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
