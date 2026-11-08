begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- g1 admin, g2 and g3 MOVE vendors, g4 a STAY vendor.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'g1@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'g2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated', 'g3@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated', 'g4@example.com', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set role = 'vendor' where id in
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3',
   '00000000-0000-0000-0000-0000000000a4');

insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('15000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'move', 'Kingston', 'approved'),
  ('15000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a3', 'move', 'Negril', 'approved'),
  ('15000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a4', 'stay', 'Negril', 'approved');
insert into public.vendor_vehicles (id, vendor_profile_id, vehicle_type, make, model, year, plate, passenger_capacity, is_active) values
  ('16000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000002', 'Sedan', 'Toyota', 'Axio', 2018, 'AB1234', 4, true);

-- Vendor g2.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);

select lives_ok($$insert into public.move_listings (vendor_profile_id, currency, description)
  values ('15000000-0000-0000-0000-000000000002', 'usd', 'Airport and north coast transfers')$$,
  'a vendor can create a listing for their own MOVE profile');
select throws_ok($$insert into public.move_listings (vendor_profile_id)
  values ('15000000-0000-0000-0000-000000000002')$$,
  '23505', null, 'a vendor cannot create a second listing');
select throws_ok($$update public.move_listings set status = 'live'$$,
  '42501', null, 'a vendor cannot set the status');
select throws_ok($$update public.move_listings set approved_at = now()$$,
  '42501', null, 'a vendor cannot set approved_at');
select throws_ok($$update public.move_listings set review_note = 'ok'$$,
  '42501', null, 'a vendor cannot write a review note');
select lives_ok($$update public.move_listings set paused = true, base_fare = 10, per_km = 1.5$$,
  'a vendor can pause and set the formula');
select throws_ok($$update public.move_listings set base_fare = -1$$,
  '23514', null, 'a negative fare is rejected');
select throws_ok($$update public.move_listings set description = repeat('x', 501)$$,
  '23514', null, 'a description over 500 characters is rejected');

create temp table l2 as select id from public.move_listings limit 1;
grant select on l2 to authenticated;

select lives_ok($$insert into public.move_listing_places (listing_id, place_id)
  select (select id from l2), id from public.places where slug in ('mbj', 'negril')$$,
  'a vendor can set their coverage');
select lives_ok($$insert into public.move_flat_rates (listing_id, place_a_id, place_b_id, price)
  select (select id from l2), least(a.id, b.id), greatest(a.id, b.id), 80
  from public.places a, public.places b where a.slug = 'mbj' and b.slug = 'negril'$$,
  'a vendor can add a flat rate between covered places');
select throws_ok($$insert into public.move_flat_rates (listing_id, place_a_id, place_b_id, price)
  select (select id from l2), greatest(a.id, b.id), least(a.id, b.id), 90
  from public.places a, public.places b where a.slug = 'mbj' and b.slug = 'negril'$$,
  '23514', null, 'a flat rate with reversed place order is rejected');
select throws_ok($$insert into public.move_flat_rates (listing_id, place_a_id, place_b_id, price)
  select (select id from l2), least(a.id, b.id), greatest(a.id, b.id), 120
  from public.places a, public.places b where a.slug = 'mbj' and b.slug = 'kingston'$$,
  'P0001', null, 'a flat rate for an uncovered place is rejected');
select throws_ok($$insert into public.move_flat_rates (listing_id, place_a_id, place_b_id, price)
  select (select id from l2), least(a.id, b.id), greatest(a.id, b.id), 0
  from public.places a, public.places b where a.slug = 'negril' and b.slug = 'mbj'$$,
  '23514', null, 'a zero price is rejected');

select lives_ok($$insert into public.move_availability_rules (listing_id, weekday, start_minutes, end_minutes)
  values ((select id from l2), 1, 480, 1080)$$, 'a vendor can add a weekly window');
select throws_ok($$insert into public.move_availability_rules (listing_id, weekday, start_minutes, end_minutes)
  values ((select id from l2), 1, 600, 600)$$, '23514', null, 'a window must end after it starts');
select throws_ok($$insert into public.move_availability_rules (listing_id, weekday, start_minutes, end_minutes)
  values ((select id from l2), 7, 480, 1080)$$, '23514', null, 'weekday 7 is rejected');

select lives_ok($$insert into public.move_blocked_ranges (listing_id, starts_at, ends_at, note)
  values ((select id from l2), '2026-12-20 05:00+00', '2026-12-27 05:00+00', 'Family trip')$$,
  'a vendor can block several days');
select throws_ok($$insert into public.move_blocked_ranges (listing_id, starts_at, ends_at)
  values ((select id from l2), '2026-12-20 05:00+00', '2026-12-19 05:00+00')$$,
  '23514', null, 'a block must end after it starts');

select lives_ok($$select public.save_vehicle_luggage('16000000-0000-0000-0000-000000000002', 3, 2)$$,
  'a vendor can set luggage capacity on their vehicle');
select is((select luggage_large from public.vendor_vehicles where id = '16000000-0000-0000-0000-000000000002'),
  3::smallint, 'the luggage capacity is saved');
select throws_ok($$select public.save_vehicle_luggage('16000000-0000-0000-0000-000000000002', 21, 0)$$,
  'P0001', null, 'luggage over 20 is rejected');

select lives_ok($$insert into public.vehicle_photos (vehicle_id, kind, storage_path, position)
  values ('16000000-0000-0000-0000-000000000002', 'front', '00000000-0000-0000-0000-0000000000a2/16000000-0000-0000-0000-000000000002/front.jpg', 0)$$,
  'a vendor can add a photo to their vehicle');
select throws_ok($$insert into public.vehicle_photos (vehicle_id, kind, storage_path, position)
  values ('16000000-0000-0000-0000-000000000002', 'front', '00000000-0000-0000-0000-0000000000a2/16000000-0000-0000-0000-000000000002/front2.jpg', 1)$$,
  '23505', null, 'a second front photo is rejected');
select throws_ok($$update public.vendor_profiles set photo_verified_at = now()$$,
  '42501', null, 'a vendor cannot verify their own profile photo');
select throws_ok($$insert into public.listing_flags (listing_id, kind) values ((select id from l2), 'price')$$,
  '42501', null, 'a vendor cannot write flags');

-- Removing a place from coverage removes the flat rates that use it.
delete from public.move_listing_places
  where place_id = (select id from public.places where slug = 'negril');
select is((select count(*) from public.move_flat_rates), 0::bigint,
  'removing a place from coverage removes its flat rates');

-- Vendor g3 sees and touches nothing of g2.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select is((select count(*) from public.move_listings), 0::bigint, 'another vendor sees no listing');
select throws_ok($$insert into public.move_listing_places (listing_id, place_id)
  select (select id from l2), id from public.places where slug = 'mbj'$$,
  '42501', null, 'another vendor cannot edit coverage');
select throws_ok($$insert into public.vehicle_photos (vehicle_id, kind, storage_path, position)
  values ('16000000-0000-0000-0000-000000000002', 'rear', '00000000-0000-0000-0000-0000000000a3/16000000-0000-0000-0000-000000000002/rear.jpg', 0)$$,
  '42501', null, 'another vendor cannot add photos to the vehicle');
select throws_ok($$select public.save_vehicle_luggage('16000000-0000-0000-0000-000000000002', 1, 1)$$,
  'P0002', null, 'another vendor cannot change the luggage capacity');

-- A STAY vendor cannot own a MOVE listing.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ok($$insert into public.move_listings (vendor_profile_id)
  values ('15000000-0000-0000-0000-000000000004')$$,
  'P0001', null, 'a STAY profile cannot own a MOVE listing');

-- The admin reads; anon cannot.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select is((select count(*) from public.move_listings), 1::bigint, 'an admin reads listings');
reset role;
set local role anon;
select throws_ok($$select * from public.move_listings$$, '42501', null, 'anon cannot read listings');

select * from finish();
rollback;
