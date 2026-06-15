-- Scope storage access to project owners (path: {project_id}/audience|dealership/...)

drop policy if exists "uploads_insert" on storage.objects;
drop policy if exists "uploads_select" on storage.objects;
drop policy if exists "uploads_delete" on storage.objects;

create policy "uploads_select_own"
on storage.objects for select
using (
  bucket_id = 'uploads'
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(name))[1]
      and p.user_id = auth.uid()
  )
);

create policy "uploads_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'uploads'
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(name))[1]
      and p.user_id = auth.uid()
  )
);

create policy "uploads_update_own"
on storage.objects for update
using (
  bucket_id = 'uploads'
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(name))[1]
      and p.user_id = auth.uid()
  )
);

create policy "uploads_delete_own"
on storage.objects for delete
using (
  bucket_id = 'uploads'
  and exists (
    select 1 from public.projects p
    where p.id::text = (storage.foldername(name))[1]
      and p.user_id = auth.uid()
  )
);
