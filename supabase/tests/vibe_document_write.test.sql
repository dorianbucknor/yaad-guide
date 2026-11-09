begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- This file writes documents AS the vendor, not as the superuser: the other document tests insert
-- as the superuser, which skips the row-level security that decides whether a vendor may upload.
--
-- b1 owns a draft VIBE profile and a draft MOVE profile. b2 is another vendor. b3 has a VIBE
-- profile that is already with an admin (pending).
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated', 'w1@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'w2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000b3', 'authenticated', 'authenticated', 'w3@example.com', '{}');
update public.profiles set role = 'vendor' where id in
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b3');
insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('87000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'vibe', 'Kingston', 'draft'),
  ('87000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'move', 'Kingston', 'draft'),
  ('87000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b2', 'vibe', 'Negril', 'draft'),
  ('87000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000b3', 'vibe', 'Portland', 'pending');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);

select lives_ok($$insert into public.vendor_documents (id, account_id, vendor_profile_id, doc_type, storage_path)
  values ('88000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1',
  '87000000-0000-0000-0000-000000000001', 'business_registration', '00000000-0000-0000-0000-0000000000b1/reg.pdf')$$,
  'a vendor can upload a business registration to their own draft profile');
select lives_ok($$insert into public.vendor_documents (id, account_id, vendor_profile_id, doc_type, storage_path)
  values ('88000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1',
  '87000000-0000-0000-0000-000000000001', 'venue_permit', '00000000-0000-0000-0000-0000000000b1/permit.pdf')$$,
  'a vendor can upload a venue permit to their own draft profile');
select lives_ok($$insert into public.vendor_documents (id, account_id, vendor_profile_id, doc_type, storage_path)
  values ('88000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b1', null, 'government_id',
  '00000000-0000-0000-0000-0000000000b1/gov.pdf')$$,
  'a vendor can still upload their government ID');
select lives_ok($$insert into public.vendor_documents (id, account_id, vendor_profile_id, doc_type, storage_path, expires_on)
  values ('88000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000b1',
  '87000000-0000-0000-0000-000000000002', 'jtb_license', '00000000-0000-0000-0000-0000000000b1/jtb.pdf', '2030-01-01')$$,
  'a MOVE vendor can still upload a JTB licence');

select is((select count(*)::int from public.vendor_documents where account_id = '00000000-0000-0000-0000-0000000000b1'), 4,
  'the vendor reads back all four documents');

-- replacing and removing their own document
select lives_ok($$update public.vendor_documents set storage_path = '00000000-0000-0000-0000-0000000000b1/reg2.pdf'
  where id = '88000000-0000-0000-0000-000000000001'$$, 'a vendor can replace their business registration');
select is((select storage_path from public.vendor_documents where id = '88000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-0000000000b1/reg2.pdf', 'the replacement was saved');
select lives_ok($$delete from public.vendor_documents where id = '88000000-0000-0000-0000-000000000002'$$,
  'a vendor can remove their venue permit');

-- not into somebody else's profile
select throws_ok($$insert into public.vendor_documents (account_id, vendor_profile_id, doc_type, storage_path)
  values ('00000000-0000-0000-0000-0000000000b1', '87000000-0000-0000-0000-000000000003', 'business_registration',
  '00000000-0000-0000-0000-0000000000b1/steal.pdf')$$,
  '42501', null, 'a vendor cannot add a registration to another vendor''s profile');

-- not while it is with an admin
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ok($$insert into public.vendor_documents (account_id, vendor_profile_id, doc_type, storage_path)
  values ('00000000-0000-0000-0000-0000000000b3', '87000000-0000-0000-0000-000000000004', 'business_registration',
  '00000000-0000-0000-0000-0000000000b3/late.pdf')$$,
  '42501', null, 'a vendor cannot change documents while the profile is pending review');

select * from finish();
rollback;
