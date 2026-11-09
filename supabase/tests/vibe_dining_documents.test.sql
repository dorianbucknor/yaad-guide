begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- f1 admin, f2 VIBE vendor without a health permit, f3 VIBE vendor with one.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'authenticated', 'authenticated', 'f1@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000f2', 'authenticated', 'authenticated', 'f2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000f3', 'authenticated', 'authenticated', 'f3@example.com', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000f1';
update public.profiles set role = 'vendor' where id in
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f3');

insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('57000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f2', 'vibe', 'Kingston', 'draft'),
  ('57000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000f3', 'vibe', 'Negril', 'draft');

-- Both vendors have the two required documents; only f3 adds the health permit.
insert into public.vendor_documents (id, account_id, vendor_profile_id, doc_type, storage_path) values
  ('58000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f2', null, 'government_id',
   '00000000-0000-0000-0000-0000000000f2/gov.pdf'),
  ('58000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f2',
   '57000000-0000-0000-0000-000000000002', 'business_registration', '00000000-0000-0000-0000-0000000000f2/reg.pdf'),
  ('58000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000f3', null, 'government_id',
   '00000000-0000-0000-0000-0000000000f3/gov.pdf'),
  ('58000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000f3',
   '57000000-0000-0000-0000-000000000003', 'business_registration', '00000000-0000-0000-0000-0000000000f3/reg.pdf');

select lives_ok($$insert into public.vendor_documents (id, account_id, vendor_profile_id, doc_type, storage_path)
  values ('58000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000f3',
  '57000000-0000-0000-0000-000000000003', 'health_permit', '00000000-0000-0000-0000-0000000000f3/health.pdf')$$,
  'a health permit is accepted without an expiry date');
select is((select expires_on from public.vendor_documents where id = '58000000-0000-0000-0000-000000000005'), null,
  'the health permit has no expiry date');
select lives_ok($$update public.vendor_documents set expires_on = '2030-01-01' where id = '58000000-0000-0000-0000-000000000005'$$,
  'an expiry date can be added later');
select throws_ok($$insert into public.vendor_documents (account_id, vendor_profile_id, doc_type, storage_path)
  values ('00000000-0000-0000-0000-0000000000f3', '57000000-0000-0000-0000-000000000003',
  'health_permit', '00000000-0000-0000-0000-0000000000f3/health2.pdf')$$,
  '23505', null, 'a profile has one health permit');
select throws_ok($$insert into public.vendor_documents (account_id, vendor_profile_id, doc_type, storage_path)
  values ('00000000-0000-0000-0000-0000000000f2', null, 'health_permit',
  '00000000-0000-0000-0000-0000000000f2/health.pdf')$$,
  '23514', null, 'a health permit must belong to a profile');

-- The permit never gates submitting or approving.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select lives_ok($$select public.submit_vendor_profile('57000000-0000-0000-0000-000000000002')$$,
  'a profile without a health permit can be submitted');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select lives_ok($$select public.submit_vendor_profile('57000000-0000-0000-0000-000000000003')$$,
  'a profile with a health permit can be submitted');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select lives_ok($$select public.verify_vendor_document(id, true) from public.vendor_documents
  where doc_type in ('government_id', 'business_registration')
    and account_id in ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f3')$$,
  'admin checks the required documents');
select is((select public.review_vendor_profile('57000000-0000-0000-0000-000000000002', 'approved', null)), 'approved',
  'a profile is approved without a health permit');
select is((select public.review_vendor_profile('57000000-0000-0000-0000-000000000003', 'approved', null)), 'approved',
  'a profile is approved with an unchecked health permit on file');

-- A dining vendor can upload their own health permit (as the vendor, not the superuser).
reset role;
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f4', 'authenticated', 'authenticated', 'f4@example.com', '{}');
update public.profiles set role = 'vendor' where id = '00000000-0000-0000-0000-0000000000f4';
insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('57000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000f4', 'vibe', 'Portland', 'draft');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f4","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select lives_ok($$insert into public.vendor_documents (account_id, vendor_profile_id, doc_type, storage_path)
  values ('00000000-0000-0000-0000-0000000000f4', '57000000-0000-0000-0000-000000000004', 'health_permit',
  '00000000-0000-0000-0000-0000000000f4/health.pdf')$$,
  'a vendor can upload their own health permit');

select * from finish();
rollback;
