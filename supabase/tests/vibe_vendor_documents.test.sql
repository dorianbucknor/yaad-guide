begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- c1 admin, c2 VIBE vendor, c3 MOVE vendor with nothing uploaded.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 'c1@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'c2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000c3', 'authenticated', 'authenticated', 'c3@example.com', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c1';
update public.profiles set role = 'vendor' where id in
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3');

insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('27000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c2', 'vibe', 'Kingston', 'draft'),
  ('27000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c3', 'move', 'Negril', 'draft');

-- Vendor c2 starts with nothing.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_like($$select public.submit_vendor_profile('27000000-0000-0000-0000-000000000002')$$,
  '%Government ID%Business registration%', 'a vibe profile with no documents lists what is missing');

reset role;
insert into public.vendor_documents (id, account_id, doc_type, storage_path) values
  ('28000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'government_id',
   '00000000-0000-0000-0000-0000000000c2/gov.pdf');
select lives_ok($$insert into public.vendor_documents (id, account_id, vendor_profile_id, doc_type, storage_path)
  values ('28000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c2',
  '27000000-0000-0000-0000-000000000002', 'business_registration', '00000000-0000-0000-0000-0000000000c2/reg.pdf')$$,
  'a business registration is accepted without an expiry date');
select lives_ok($$insert into public.vendor_documents (id, account_id, vendor_profile_id, doc_type, storage_path)
  values ('28000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c2',
  '27000000-0000-0000-0000-000000000002', 'venue_permit', '00000000-0000-0000-0000-0000000000c2/permit.pdf')$$,
  'a venue permit is accepted without an expiry date');
select throws_ok($$insert into public.vendor_documents (account_id, vendor_profile_id, doc_type, storage_path)
  values ('00000000-0000-0000-0000-0000000000c2', '27000000-0000-0000-0000-000000000002',
  'business_registration', '00000000-0000-0000-0000-0000000000c2/reg2.pdf')$$,
  '23505', null, 'a profile has one business registration');
select throws_ok($$insert into public.vendor_documents (account_id, vendor_profile_id, doc_type, storage_path)
  values ('00000000-0000-0000-0000-0000000000c3', null, 'business_registration',
  '00000000-0000-0000-0000-0000000000c3/reg.pdf')$$,
  '23514', null, 'a business registration must belong to a profile');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select lives_ok($$select public.submit_vendor_profile('27000000-0000-0000-0000-000000000002')$$,
  'a vibe profile with ID and registration can be submitted without a venue permit being required');
select is((select status from public.vendor_profiles where id = '27000000-0000-0000-0000-000000000002'),
  'pending', 'the vibe profile is pending');

-- Admin cannot approve until the documents are checked.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select throws_like($$select public.review_vendor_profile('27000000-0000-0000-0000-000000000002', 'approved', null)$$,
  '%the business registration%', 'approval needs the registration checked');
select lives_ok($$select public.verify_vendor_document('28000000-0000-0000-0000-000000000001', true)$$, 'admin checks the ID');
select lives_ok($$select public.verify_vendor_document('28000000-0000-0000-0000-000000000002', true)$$, 'admin checks the registration');
select is((select public.review_vendor_profile('27000000-0000-0000-0000-000000000002', 'approved', null)),
  'approved', 'a vibe profile is approved on ID plus registration, with no vehicle or JTB licence');

-- A MOVE profile still needs its own documents.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_like($$select public.submit_vendor_profile('27000000-0000-0000-0000-000000000003')$$,
  '%JTB license%', 'a move profile still needs the JTB licence');

select * from finish();
rollback;
