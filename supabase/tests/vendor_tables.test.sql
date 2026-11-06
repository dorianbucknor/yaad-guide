begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Users: b1 and b2 vendors, b9 admin.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated', 'v1@example.com', '{"first_name":"Vee","last_name":"One"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'v2@example.com', '{"first_name":"Vee","last_name":"Two"}'),
  ('00000000-0000-0000-0000-0000000000b9', 'authenticated', 'authenticated', 'admin@example.com', '{}');

-- Fixtures as superuser: a profile and a vehicle for each vendor.
insert into public.vendor_profiles (id, account_id, category, primary_region) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'move', 'St. Ann'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b2', 'move', 'Kingston');
insert into public.vendor_vehicles (id, vendor_profile_id, vehicle_type, make, model, year, plate, passenger_capacity) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'SUV', 'Toyota', 'Noah', 2020, 'ab 1234', 7),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Sedan', 'Honda', 'Fit', 2019, 'CD5678', 4);

select is((select plate from public.vendor_vehicles where id = '20000000-0000-0000-0000-000000000001'),
  'AB1234', 'plate is normalized on insert');
select throws_ok($$insert into public.vendor_vehicles (vendor_profile_id, vehicle_type, make, model, year, plate, passenger_capacity)
  values ('10000000-0000-0000-0000-000000000002', 'Bus', 'X', 'Y', 2020, ' ab1234 ', 20)$$,
  '23505', null, 'a plate in another spelling is a duplicate');
select throws_ok($$insert into public.vendor_vehicles (vendor_profile_id, vehicle_type, make, model, year, plate, passenger_capacity)
  values ('10000000-0000-0000-0000-000000000002', 'Bus', 'X', 'Y', 2020, 'ab-12.34', 20)$$,
  '23505', null, 'dashes and dots do not make a different plate');

update public.vendor_vehicles set is_active = true where id = '20000000-0000-0000-0000-000000000001';
select throws_ok($$insert into public.vendor_vehicles (vendor_profile_id, vehicle_type, make, model, year, plate, passenger_capacity, is_active)
  values ('10000000-0000-0000-0000-000000000001', 'Bus', 'X', 'Y', 2020, 'ZZ1', 20, true)$$,
  '23505', null, 'a profile cannot have two active vehicles');
select throws_ok($$insert into public.vendor_profiles (account_id, category, primary_region)
  values ('00000000-0000-0000-0000-0000000000b1', 'move', 'Kingston')$$,
  '23505', null, 'one profile per account and category');

select throws_ok($$insert into public.vendor_documents (account_id, vehicle_id, doc_type, storage_path)
  values ('00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-000000000001', 'government_id', '00000000-0000-0000-0000-0000000000b1/y.png')$$,
  '23514', null, 'a government ID cannot carry a vehicle');
select throws_ok($$insert into public.vendor_documents (account_id, doc_type, storage_path, expires_on)
  values ('00000000-0000-0000-0000-0000000000b1', 'insurance', '00000000-0000-0000-0000-0000000000b1/y.png', '2027-01-01')$$,
  '23514', null, 'insurance needs a vehicle');
select throws_ok($$insert into public.vendor_documents (account_id, vendor_profile_id, doc_type, storage_path)
  values ('00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-000000000001', 'jtb_license', '00000000-0000-0000-0000-0000000000b1/y.png')$$,
  '23514', null, 'a JTB license needs an expiry date');

-- Act as vendor b1.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);

select is((select count(*) from public.vendor_profiles), 1::bigint, 'vendor reads only their own profile');
select is((select count(*) from public.vendor_vehicles), 1::bigint, 'vendor reads only their own vehicles');
select lives_ok($$update public.vendor_profiles set business_name = 'Vee Tours' where id = '10000000-0000-0000-0000-000000000001'$$,
  'vendor edits a draft profile');
select throws_ok($$update public.vendor_profiles set status = 'approved' where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'vendor cannot write status');
select throws_ok($$update public.vendor_vehicles set is_active = true where id = '20000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'vendor cannot write is_active');
select throws_ok($$insert into public.vendor_vehicles (vendor_profile_id, vehicle_type, make, model, year, plate, passenger_capacity)
  values ('10000000-0000-0000-0000-000000000002', 'Bus', 'X', 'Y', 2020, 'QQ1', 20)$$,
  '42501', null, 'vendor cannot add a vehicle to another account''s profile');
select lives_ok($$insert into public.vendor_documents (id, account_id, doc_type, storage_path)
  values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'government_id', '00000000-0000-0000-0000-0000000000b1/30000000-0000-0000-0000-000000000001.png')$$,
  'vendor records their government ID');
select throws_ok($$insert into public.vendor_documents (account_id, doc_type, storage_path)
  values ('00000000-0000-0000-0000-0000000000b1', 'government_id', '00000000-0000-0000-0000-0000000000b2/stolen.png')$$,
  '23514', null, 'a document row cannot point into another account''s folder');
select throws_ok($$update public.vendor_documents set verified = true where id = '30000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'vendor cannot mark a document verified');

-- A pending profile is locked.
reset role;
update public.vendor_profiles set status = 'pending' where id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);

update public.vendor_profiles set business_name = 'Changed' where id = '10000000-0000-0000-0000-000000000001';
select is((select business_name from public.vendor_profiles where id = '10000000-0000-0000-0000-000000000001'),
  'Vee Tours', 'a pending profile cannot be edited');
update public.vendor_vehicles set make = 'Changed' where id = '20000000-0000-0000-0000-000000000001';
select is((select make from public.vendor_vehicles where id = '20000000-0000-0000-0000-000000000001'),
  'Toyota', 'a pending profile''s vehicle cannot be edited');
select throws_ok($$insert into public.vendor_documents (account_id, vendor_profile_id, doc_type, storage_path, expires_on)
  values ('00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-000000000001', 'jtb_license', '00000000-0000-0000-0000-0000000000b1/y.png', '2027-01-01')$$,
  '42501', null, 'a pending profile cannot add documents');

-- Admin reads everything.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b9","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select is((select count(*) from public.vendor_profiles), 2::bigint, 'admin reads all profiles');
select is((select count(*) from public.vendor_vehicles), 2::bigint, 'admin reads all vehicles');

reset role;
select ok(exists (
  select 1 from public.audit_log
  where table_name = 'vendor_profiles'
    and row_id = '10000000-0000-0000-0000-000000000001' and action = 'UPDATE'
    and new_values ->> 'status' = 'pending'
), 'profile status change is audited'
);
select ok(exists (
  select 1 from public.audit_log where table_name = 'vendor_vehicles' and action = 'INSERT'
), 'vehicle insert is audited');

select * from finish();
rollback;
