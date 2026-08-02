-- Allow admin users to SELECT all café rows (needed for Realtime to deliver
-- INSERT events to the admin's browser client, since Realtime filters by RLS).
create policy "admin_select_all_cafes"
  on public.cafes for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Enable Realtime on the cafes table
alter publication supabase_realtime add table public.cafes;
