begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- b1 admin, b2 MOVE vendor with a fully prepared draft listing, b3 another vendor.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated', 'b1@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'b2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000b3', 'authenticated', 'authenticated', 'b3@example.com', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b1';
update public.profiles set role = 'vendor',
  profile_photo_link = '00000000-0000-0000-0000-0000000000b2/me.jpg'
  where id = '00000000-0000-0000-0000-0000000000b2';
update public.profiles set role = 'vendor' where id = '00000000-0000-0000-0000-0000000000b3';

insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('17000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b2', 'move', 'Kingston', 'approved'),
  ('17000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b3', 'move', 'Negril', 'approved');
insert into public.vendor_vehicles (id, vendor_profile_id, vehicle_type, make, model, year, plate, passenger_capacity,
  is_active, luggage_large, luggage_carry_on) values
  ('18000000-0000-0000-0000-000000000002', '17000000-0000-0000-0000-000000000002', 'Sedan', 'Toyota', 'Axio', 2018,
   'CD5678', 4, true, 3, 2);
insert into public.vehicle_photos (vehicle_id, kind, storage_path) values
  ('18000000-0000-0000-0000-000000000002', 'front', 'x/18000000-0000-0000-0000-000000000002/f.jpg'),
  ('18000000-0000-0000-0000-000000000002', 'rear', 'x/18000000-0000-0000-0000-000000000002/r.jpg'),
  ('18000000-0000-0000-0000-000000000002', 'interior', 'x/18000000-0000-0000-0000-000000000002/i.jpg'),
  ('18000000-0000-0000-0000-000000000002', 'luggage', 'x/18000000-0000-0000-0000-000000000002/l.jpg');
insert into public.move_listings (id, vendor_profile_id, currency, base_fare, per_km) values
  ('19000000-0000-0000-0000-000000000002', '17000000-0000-0000-0000-000000000002', 'usd', 10, 1.5);
insert into public.move_listing_places (listing_id, place_id)
  select '19000000-0000-0000-0000-000000000002', id from public.places where slug in ('mbj', 'negril');
insert into public.move_flat_rates (listing_id, place_a_id, place_b_id, price)
  select '19000000-0000-0000-0000-000000000002', least(a.id, b.id), greatest(a.id, b.id), 80
  from public.places a, public.places b where a.slug = 'mbj' and b.slug = 'negril';
insert into public.move_availability_rules (listing_id, weekday, start_minutes, end_minutes) values
  ('19000000-0000-0000-0000-000000000002', 1, 480, 1080);

-- Vendor b2: not ready until an admin has checked the profile photo.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select is((select public.listing_is_ready('19000000-0000-0000-0000-000000000002')), false,
  'a listing is not ready while the profile photo is unchecked');
select throws_ok($$select public.submit_listing_for_review('19000000-0000-0000-0000-000000000002')$$,
  'P0001', null, 'submitting an unready listing is refused');
select throws_ok($$select public.verify_profile_photo('17000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'a vendor cannot verify their own photo');

-- Admin checks the photo.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select lives_ok($$select public.verify_profile_photo('17000000-0000-0000-0000-000000000002')$$,
  'an admin can verify a profile photo');

-- Vendor b2 submits.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select is((select public.listing_is_ready('19000000-0000-0000-0000-000000000002')), true,
  'the listing is ready once everything is in place');
select lives_ok($$select public.submit_listing_for_review('19000000-0000-0000-0000-000000000002')$$,
  'a ready listing can be submitted');
select is((select status from public.move_listings), 'in_review', 'the listing is now in review');
select throws_ok($$select public.submit_listing_for_review('19000000-0000-0000-0000-000000000002')$$,
  'P0001', null, 'a listing already in review cannot be submitted again');
select throws_ok($$select public.review_listing('19000000-0000-0000-0000-000000000002', 'approve', null)$$,
  '42501', null, 'a vendor cannot review a listing');

-- Another vendor cannot submit it.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ok($$select public.submit_listing_for_review('19000000-0000-0000-0000-000000000002')$$,
  'P0002', null, 'another vendor cannot submit it');

-- Admin rejects, then approves.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select throws_ok($$select public.review_listing('19000000-0000-0000-0000-000000000002', 'reject', '')$$,
  'P0001', null, 'a rejection needs a note');
select lives_ok($$select public.review_listing('19000000-0000-0000-0000-000000000002', 'reject', 'Blurry front photo')$$,
  'an admin can reject with a note');
select is((select status || ':' || review_note from public.move_listings), 'draft:Blurry front photo',
  'a rejected listing goes back to draft with the note');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select lives_ok($$select public.submit_listing_for_review('19000000-0000-0000-0000-000000000002')$$,
  'the vendor can resubmit');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select lives_ok($$select public.review_listing('19000000-0000-0000-0000-000000000002', 'approve', null)$$,
  'an admin can approve');
select is((select status from public.move_listings), 'live', 'an approved listing is live');
select isnt((select approved_at from public.move_listings), null, 'approval time is recorded');

-- Live listing: price edits raise one flag and stay live.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
update public.move_flat_rates set price = 95;
select is((select count(*) from public.listing_flags where kind = 'price' and resolved_at is null), 1::bigint,
  'a price change on a live listing raises a flag');
update public.move_flat_rates set price = 99;
select is((select count(*) from public.listing_flags where kind = 'price' and resolved_at is null), 1::bigint,
  'a second price change does not add another open flag');
update public.move_listings set per_km = 2;
select is((select status from public.move_listings), 'live', 'the listing stays live after the change');

-- Photos: flag on change, caps.
select lives_ok($$insert into public.vehicle_photos (vehicle_id, kind, storage_path) values
  ('18000000-0000-0000-0000-000000000002', 'extra', 'x/18000000-0000-0000-0000-000000000002/e1.jpg')$$,
  'a vendor can add an extra photo');
select is((select count(*) from public.listing_flags where kind = 'photo' and resolved_at is null), 1::bigint,
  'a photo change on a live listing raises a flag');
insert into public.vehicle_photos (vehicle_id, kind, storage_path) values
  ('18000000-0000-0000-0000-000000000002', 'extra', 'x/18000000-0000-0000-0000-000000000002/e2.jpg'),
  ('18000000-0000-0000-0000-000000000002', 'extra', 'x/18000000-0000-0000-0000-000000000002/e3.jpg'),
  ('18000000-0000-0000-0000-000000000002', 'extra', 'x/18000000-0000-0000-0000-000000000002/e4.jpg');
select throws_ok($$insert into public.vehicle_photos (vehicle_id, kind, storage_path) values
  ('18000000-0000-0000-0000-000000000002', 'extra', 'x/18000000-0000-0000-0000-000000000002/e5.jpg')$$,
  'P0001', null, 'a fifth extra photo is rejected');
select is((select count(*) from public.vehicle_photos), 8::bigint, 'a vehicle holds at most eight photos');

-- Changing the profile photo clears the check and raises a flag.
reset role;
update public.profiles set profile_photo_link = '00000000-0000-0000-0000-0000000000b2/new.jpg'
  where id = '00000000-0000-0000-0000-0000000000b2';
select is((select photo_verified_at from public.vendor_profiles where id = '17000000-0000-0000-0000-000000000002'),
  null, 'a new profile photo needs a fresh admin check');
select is((select count(*) from public.listing_flags where kind = 'profile_photo' and resolved_at is null), 1::bigint,
  'a new profile photo flags the live listing');

-- Flags are resolved by admins only.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ok($$select public.resolve_listing_flag(id) from public.listing_flags limit 1$$,
  '42501', null, 'a vendor cannot resolve a flag');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select lives_ok($$select public.resolve_listing_flag(id) from public.listing_flags where kind = 'price'$$,
  'an admin can resolve a flag');
select is((select count(*) from public.listing_flags where kind = 'price' and resolved_at is null), 0::bigint,
  'the flag is closed');

-- The listing-photos bucket.
reset role;
select is((select public from storage.buckets where id = 'listing-photos'), true, 'the listing-photos bucket is public');
select is((select file_size_limit from storage.buckets where id = 'listing-photos'), 5242880::bigint,
  'the bucket limits files to 5 MB');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select lives_ok($$insert into storage.objects (bucket_id, name)
  values ('listing-photos', '00000000-0000-0000-0000-0000000000b2/18000000-0000-0000-0000-000000000002/f.jpg')$$,
  'a vendor uploads into their own folder');
select throws_ok($$insert into storage.objects (bucket_id, name)
  values ('listing-photos', '00000000-0000-0000-0000-0000000000b3/18000000-0000-0000-0000-000000000003/f.jpg')$$,
  '42501', null, 'a vendor cannot upload into another folder');

select * from finish();
rollback;
