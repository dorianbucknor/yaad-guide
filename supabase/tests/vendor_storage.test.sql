begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'authenticated', 'authenticated', 'd1@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000d2', 'authenticated', 'authenticated', 'd2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000d9', 'authenticated', 'authenticated', 'root@example.com', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000d9';
insert into public.vendor_profiles (id, account_id, category, primary_region) values
  ('12000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'move', 'St. Ann'),
  ('12000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d2', 'move', 'Kingston');

select is((select public from storage.buckets where id = 'vendor-documents'), false,
  'the vendor-documents bucket is private');
select is((select file_size_limit from storage.buckets where id = 'vendor-documents'), 5242880::bigint,
  'the bucket limits files to 5 MB');
select is((select allowed_mime_types from storage.buckets where id = 'vendor-documents'),
  array['application/pdf', 'image/jpeg', 'image/png'], 'the bucket allows PDF, JPG and PNG');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);

select lives_ok($$insert into storage.objects (bucket_id, name) values ('vendor-documents', '00000000-0000-0000-0000-0000000000d1/doc1.png')$$,
  'a vendor uploads into their own folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('vendor-documents', '00000000-0000-0000-0000-0000000000d2/doc1.png')$$,
  '42501', null, 'a vendor cannot upload into another folder');

update storage.objects set metadata = '{"swapped":true}'::jsonb
  where bucket_id = 'vendor-documents' and name = '00000000-0000-0000-0000-0000000000d1/doc1.png';
select is((select metadata from storage.objects where name = '00000000-0000-0000-0000-0000000000d1/doc1.png'),
  null, 'a vendor cannot overwrite a file they already uploaded');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select is((select count(*) from storage.objects where bucket_id = 'vendor-documents'), 0::bigint,
  'a vendor cannot see another vendor''s files');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d9","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select is((select count(*) from storage.objects where bucket_id = 'vendor-documents'), 1::bigint,
  'an admin can see every vendor file');

reset role;
update public.vendor_profiles set status = 'pending' where id = '12000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ok($$insert into storage.objects (bucket_id, name) values ('vendor-documents', '00000000-0000-0000-0000-0000000000d1/doc2.png')$$,
  '42501', null, 'a vendor cannot upload while a profile is under review');
select is((select count(*) from storage.objects where bucket_id = 'vendor-documents'), 1::bigint,
  'a vendor can still read their own file while under review');

select * from finish();
rollback;
