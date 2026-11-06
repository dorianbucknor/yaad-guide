begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

-- Accounts: c1 owner, c2 requester, c3 two profiles, c9 admin.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 'c1@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'c2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000c3', 'authenticated', 'authenticated', 'c3@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000c9', 'authenticated', 'authenticated', 'root@example.com', '{}');

insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'move', 'St. Ann', 'draft'),
  ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c2', 'move', 'Kingston', 'draft'),
  ('11000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c3', 'move', 'Kingston', 'pending'),
  ('11000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000c3', 'stay', 'Kingston', 'approved');

insert into public.vendor_vehicles (id, vendor_profile_id, vehicle_type, make, model, year, plate, passenger_capacity) values
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'SUV', 'Toyota', 'Noah', 2020, 'AB1234', 7),
  ('21000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'Sedan', 'Honda', 'Fit', 2019, 'CD5678', 4);

insert into public.vendor_documents (account_id, vendor_profile_id, vehicle_id, doc_type, storage_path, expires_on) values
  ('00000000-0000-0000-0000-0000000000c1', null, null, 'government_id', 'c1/id.png', null),
  ('00000000-0000-0000-0000-0000000000c1', '11000000-0000-0000-0000-000000000001', null, 'jtb_license', 'c1/jtb.png', current_date + 365),
  ('00000000-0000-0000-0000-0000000000c1', null, '21000000-0000-0000-0000-000000000001', 'insurance', 'c1/ins.png', current_date + 365),
  ('00000000-0000-0000-0000-0000000000c1', null, '21000000-0000-0000-0000-000000000001', 'fitness', 'c1/fit.png', current_date + 365),
  ('00000000-0000-0000-0000-0000000000c3', null, null, 'government_id', 'c3/id.png', null);
update public.vendor_documents set verified = true where account_id = '00000000-0000-0000-0000-0000000000c3';

-- ---------------------------------------------------------------- c1
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);

select throws_ilike($$select public.submit_vendor_profile('11000000-0000-0000-0000-000000000001')$$,
  '%Missing%', 'submit is refused while a vehicle lacks its certificates');
delete from public.vendor_vehicles where id = '21000000-0000-0000-0000-000000000002';
select throws_ilike($$select public.submit_vendor_profile('11000000-0000-0000-0000-000000000001')$$,
  '%active vehicle%', 'submit is refused without an active vehicle');
select lives_ok($$select public.set_active_vehicle('21000000-0000-0000-0000-000000000001')$$,
  'a draft profile can activate a vehicle with unexpired certificates');
select is((select public.submit_vendor_profile('11000000-0000-0000-0000-000000000001')), 'pending',
  'a complete profile submits');
select is((select public.submit_vendor_profile('11000000-0000-0000-0000-000000000001')), 'pending',
  'a second submit is a no-op');
select throws_ok($$select public.review_vendor_profile('11000000-0000-0000-0000-000000000001', 'approved', null)$$,
  '42501', null, 'a vendor cannot review');

-- ---------------------------------------------------------------- c2
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ilike($$select public.submit_vendor_profile('11000000-0000-0000-0000-000000000001')$$,
  '%not found%', 'a non-owner cannot submit');

-- An expired license blocks a resubmit.
reset role;
update public.vendor_profiles set status = 'rejected' where id = '11000000-0000-0000-0000-000000000001';
update public.vendor_documents set expires_on = current_date - 1 where doc_type = 'jtb_license';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ilike($$select public.submit_vendor_profile('11000000-0000-0000-0000-000000000001')$$,
  '%expired%', 'an expired JTB license blocks submit');
reset role;
update public.vendor_documents set expires_on = current_date + 365 where doc_type = 'jtb_license';
update public.vendor_profiles set status = 'draft' where id = '11000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select is((select public.submit_vendor_profile('11000000-0000-0000-0000-000000000001')), 'pending',
  'submit works again once the license is valid');

-- --------------------------------------------------------------- admin
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c9","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select throws_ilike($$select public.review_vendor_profile('11000000-0000-0000-0000-000000000001', 'rejected', '  ')$$,
  '%reason%', 'a rejection needs a reason');
select is((select public.review_vendor_profile('11000000-0000-0000-0000-000000000001', 'approved', null)), 'approved',
  'admin approves a pending profile');
select is((select reviewed_by from public.vendor_profiles where id = '11000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-0000000000c9'::uuid, 'reviewer is recorded');
select is((select public.review_vendor_profile('11000000-0000-0000-0000-000000000001', 'approved', null)), 'approved',
  'a repeat review is a no-op');
select lives_ok($$select public.verify_vendor_document(id, true) from public.vendor_documents where account_id = '00000000-0000-0000-0000-0000000000c1'$$,
  'admin verifies documents');

-- Approved profile: a new vehicle needs verified certificates before it can be active.
reset role;
insert into public.vendor_vehicles (id, vendor_profile_id, vehicle_type, make, model, year, plate, passenger_capacity) values
  ('21000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001', 'Bus', 'Toyota', 'Coaster', 2018, 'EF9012', 20);
insert into public.vendor_documents (account_id, vehicle_id, doc_type, storage_path, expires_on) values
  ('00000000-0000-0000-0000-0000000000c1', '21000000-0000-0000-0000-000000000003', 'insurance', 'c1/ins3.png', current_date + 200),
  ('00000000-0000-0000-0000-0000000000c1', '21000000-0000-0000-0000-000000000003', 'fitness', 'c1/fit3.png', current_date + 200);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ilike($$select public.set_active_vehicle('21000000-0000-0000-0000-000000000003')$$,
  '%verified%', 'an approved profile cannot activate a vehicle with unverified certificates');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c9","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select public.verify_vendor_document(id, true) from public.vendor_documents where vehicle_id = '21000000-0000-0000-0000-000000000003';
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select lives_ok($$select public.set_active_vehicle('21000000-0000-0000-0000-000000000003')$$,
  'verified certificates allow activation');
select is((select count(*) from public.vendor_vehicles where vendor_profile_id = '11000000-0000-0000-0000-000000000001' and is_active),
  1::bigint, 'exactly one vehicle is active after switching');

-- ID rejection cascades to every profile of the account.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c9","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select lives_ok($$select public.reject_account_identity('00000000-0000-0000-0000-0000000000c3', 'ID is unreadable')$$,
  'admin rejects an account''s government ID');
select is((select count(*) from public.vendor_profiles where account_id = '00000000-0000-0000-0000-0000000000c3' and status = 'rejected'),
  2::bigint, 'both profiles of the account are rejected');
select is((select verified from public.vendor_documents where account_id = '00000000-0000-0000-0000-0000000000c3' and doc_type = 'government_id'),
  false, 'the rejected ID is no longer verified');

-- ------------------------------------------------------------ transfers
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select isnt((select public.request_vehicle_transfer(' ab 1234 ')), null, 'a vendor requests a vehicle by plate');
select throws_ilike($$select public.request_vehicle_transfer('AB1234')$$,
  '%already open%', 'a second request for the same vehicle is refused');
select throws_ilike($$select public.respond_vehicle_transfer((select id from public.vehicle_transfers limit 1), true)$$,
  '%owner%', 'the requester cannot answer for the owner');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c9","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select throws_ilike($$select public.review_vehicle_transfer((select id from public.vehicle_transfers limit 1), 'approved', null)$$,
  '%agreed%', 'admin cannot approve before the owner agrees');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select lives_ok($$select public.respond_vehicle_transfer((select id from public.vehicle_transfers limit 1), true)$$,
  'the owner agrees');
select throws_ilike($$select public.respond_vehicle_transfer((select id from public.vehicle_transfers limit 1), false)$$,
  '%already%', 'a second answer is refused');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c9","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select lives_ok($$select public.review_vehicle_transfer((select id from public.vehicle_transfers limit 1), 'approved', null)$$,
  'admin approves an agreed transfer');

-- Withdrawal: c1 asks for the vehicle back; only c1 can withdraw.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select isnt((select public.request_vehicle_transfer('AB1234')), null, 'the old owner can request the vehicle back');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ok($$select public.withdraw_vehicle_transfer((select id from public.vehicle_transfers where status = 'requested'))$$,
  '42501', null, 'only the requester can withdraw');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select lives_ok($$select public.withdraw_vehicle_transfer((select id from public.vehicle_transfers where status = 'requested'))$$,
  'the requester withdraws');
select is((select count(*) from public.vehicle_transfers where status = 'requested'), 0::bigint,
  'the withdrawn request is gone');

reset role;
select is((select vendor_profile_id from public.vendor_vehicles where id = '21000000-0000-0000-0000-000000000001'),
  '11000000-0000-0000-0000-000000000002'::uuid, 'the vehicle moved to the new profile');
select ok(not exists (
  select 1 from public.vendor_documents where vehicle_id = '21000000-0000-0000-0000-000000000001' and verified
), 'the vehicle''s documents need review again');
select ok(exists (
  select 1 from public.audit_log
  where table_name = 'vehicle_transfers' and action = 'UPDATE' and new_values ->> 'status' = 'approved'
), 'the transfer decision is audited');

select * from finish();
rollback;
