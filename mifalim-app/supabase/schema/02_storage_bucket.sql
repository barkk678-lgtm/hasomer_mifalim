-- Creates the storage bucket used by the Files tab, plus policies allowing any
-- signed-in user to upload/read/delete within it. Run once in SQL Editor.

insert into storage.buckets (id, name, public)
values ('mifal-files', 'mifal-files', false)
on conflict (id) do nothing;

create policy "mifal-files: authenticated read" on storage.objects for select
  using (bucket_id = 'mifal-files' and auth.role() = 'authenticated');

create policy "mifal-files: authenticated upload" on storage.objects for insert
  with check (bucket_id = 'mifal-files' and auth.role() = 'authenticated');

create policy "mifal-files: authenticated delete" on storage.objects for delete
  using (bucket_id = 'mifal-files' and auth.role() = 'authenticated');
