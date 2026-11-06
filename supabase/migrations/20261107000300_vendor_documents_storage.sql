-- Private bucket for verification documents. Vendors reach only their own
-- <account id>/ folder; admins can read every file (signed URLs on the server).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-documents',
  'vendor-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy vendor_documents_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vendor-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy vendor_documents_select_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'vendor-documents' and public.is_admin());

-- Writes stop while any of the account's profiles is under review.
create policy vendor_documents_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vendor-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.account_unlocked((select auth.uid()))
  );

-- No update policy on purpose: a file is never overwritten in place, so a
-- verified document cannot be swapped for different bytes at the same path.
-- A replacement is a new file under a new name.

create policy vendor_documents_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vendor-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.account_unlocked((select auth.uid()))
  );
