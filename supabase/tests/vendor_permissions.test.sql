begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- e1 admin, e2 vendor, e3 demoted admin (token still says admin), e4 vendor with the role later narrowed.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'authenticated', 'authenticated', 'e1@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000e2', 'authenticated', 'authenticated', 'e2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000e3', 'authenticated', 'authenticated', 'e3@example.com', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000e1';
update public.profiles set role = 'vendor' where id = '00000000-0000-0000-0000-0000000000e2';

insert into public.vendor_profiles (id, account_id, category, primary_region) values
  ('13000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e2', 'move', 'Kingston');

select is((select count(*) from public.permissions), 6::bigint, 'six permissions exist');
select is((select count(*) from public.role_permissions where role = 'admin'), 6::bigint,
  'admin holds all six');
select is((select count(*) from public.role_permissions where role in ('traveler', 'vendor')), 0::bigint,
  'travelers and vendors hold none');

-- Admin.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select is((select public.authorize('vendors.review')), true, 'an admin is authorized');
select is((select public.authorize('payouts.approve')), false, 'an unknown permission is never granted');
select is((select count(*) from public.vendor_profiles), 1::bigint, 'an admin reads other vendors'' profiles');
select cmp_ok((select count(*) from public.audit_log), '>', 0::bigint, 'an admin reads the audit log');

-- A vendor.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select is((select public.authorize('vendors.review')), false, 'a vendor is not authorized');
select throws_ok($$insert into public.role_permissions (role, permission) values ('vendor', 'vendors.review')$$,
  '42501', null, 'a vendor cannot grant themselves a permission');
select throws_ok($$select * from public.role_permissions$$,
  '42501', null, 'the permission tables are not readable by app users');

-- Demoted admin: the token still says admin, the profile does not.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select is((select public.authorize('vendors.review')), false, 'a demoted admin loses access with an unexpired token');
select is((select count(*) from public.vendor_profiles), 0::bigint, 'a demoted admin reads no vendor profiles');
select is((select count(*) from public.audit_log), 0::bigint, 'a demoted admin reads no audit rows');

-- A vendor role narrowed to one permission can use it and nothing else.
reset role;
insert into public.role_permissions (role, permission) values ('vendor', 'documents.verify');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select is((select public.authorize('documents.verify')), true, 'a role holding documents.verify is authorized for it');
select throws_ok($$select public.review_vendor_profile('13000000-0000-0000-0000-000000000002', 'approved', null)$$,
  '42501', null, 'documents.verify does not allow reviewing a profile');
select throws_ok($$select public.verify_vendor_document('13000000-0000-0000-0000-000000000099', true)$$,
  'P0002', null, 'documents.verify passes the check for verifying a document');

select * from finish();
rollback;
