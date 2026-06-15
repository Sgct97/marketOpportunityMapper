-- Storage bucket for uploaded CSV/XLSX files
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

-- RLS: authenticated users via path; service role bypasses when DISABLE_AUTH
create policy "uploads_insert"
on storage.objects for insert
with check (bucket_id = 'uploads');

create policy "uploads_select"
on storage.objects for select
using (bucket_id = 'uploads');

create policy "uploads_delete"
on storage.objects for delete
using (bucket_id = 'uploads');
