begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- d1 admin, d2 VIBE vendor (owner), d3 another VIBE vendor, d4 MOVE vendor.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'authenticated', 'authenticated', 'd1@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000d2', 'authenticated', 'authenticated', 'd2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000d3', 'authenticated', 'authenticated', 'd3@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000d4', 'authenticated', 'authenticated', 'd4@example.com', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000d1';
update public.profiles set role = 'vendor' where id in
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d3',
   '00000000-0000-0000-0000-0000000000d4');
insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('37000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d2', 'vibe', 'Kingston', 'approved'),
  ('37000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000d3', 'vibe', 'Negril', 'approved'),
  ('37000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000d4', 'move', 'Negril', 'approved');

-- ------------------------------------------------------------ owner writes
insert into public.vibe_listings (id, vendor_profile_id, subtype, title, address_line1, town, parish) values
  ('38000000-0000-0000-0000-000000000002', '37000000-0000-0000-0000-000000000002', 'attraction',
   'Blue Hole tour', '1 Main Road', 'Ocho Rios', 'St. Ann');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select lives_ok($$insert into public.vibe_listings (vendor_profile_id, subtype, title)
  values ('37000000-0000-0000-0000-000000000002', 'event', 'Reggae night')$$, 'an owner can create a listing');
select throws_ok($$insert into public.vibe_listings (vendor_profile_id, subtype, title)
  values ('37000000-0000-0000-0000-000000000003', 'event', 'Not mine')$$, '42501', null,
  'an owner cannot create a listing under someone else''s profile');
select is((select count(*)::int from public.vibe_listings where id = '38000000-0000-0000-0000-000000000002'), 1,
  'the owner reads their listing');
select is((select booking_cutoff_minutes from public.vibe_listings where title = 'Blue Hole tour'), 60, 'the cutoff defaults to 60 minutes');
select is((select auto_generate_slots from public.vibe_listings where title = 'Blue Hole tour'), true, 'auto generation defaults to on');
select throws_ok($$update public.vibe_listings set status = 'live' where title = 'Blue Hole tour'$$, '42501', null,
  'an owner cannot write the status');
select throws_ok($$update public.vibe_listings set booking_cutoff_minutes = 10081 where title = 'Blue Hole tour'$$, '23514', null,
  'a cutoff over seven days is rejected');
select throws_ok($$update public.vibe_listings set booking_cutoff_minutes = -1 where title = 'Blue Hole tour'$$, '23514', null,
  'a negative cutoff is rejected');
select lives_ok($$update public.vibe_listings set booking_cutoff_minutes = 0 where title = 'Blue Hole tour'$$, 'a cutoff of zero is allowed');
select throws_ok($$update public.vibe_listings set latitude = 18.2 where title = 'Blue Hole tour'$$, '23514', null,
  'a pin needs both coordinates');
select throws_ok($$update public.vibe_listings set latitude = 40.7, longitude = -74.0 where title = 'Blue Hole tour'$$, '23514', null,
  'a pin outside Jamaica is rejected');
select lives_ok($$update public.vibe_listings set latitude = 18.4, longitude = -77.1 where title = 'Blue Hole tour'$$, 'a pin in Jamaica is accepted');
select lives_ok($$insert into public.vibe_schedule_rules (listing_id, weekday, start_minutes, capacity)
  values ('38000000-0000-0000-0000-000000000002', 2, 600, 40)$$, 'an owner can add a schedule rule');
select lives_ok($$insert into public.vibe_slots (listing_id, starts_at, capacity)
  values ('38000000-0000-0000-0000-000000000002', now() + interval '3 days', 20)$$, 'an owner can add a slot');
select is((select source from public.vibe_slots), 'one_off', 'a slot added by hand is a one-off');
select lives_ok($$update public.vibe_slots set capacity = 25$$, 'an owner can change a slot capacity');
select is((select edited from public.vibe_slots), true, 'a hand edit marks the slot as edited');
select throws_ok($$insert into public.vibe_photos (listing_id, storage_path)
  values ('38000000-0000-0000-0000-000000000002', 'x/vibe/38000000-0000-0000-0000-000000000002/../y.jpg')$$,
  '23514', null, 'a photo path with dot segments is rejected');
select lives_ok($$insert into public.vibe_photos (listing_id, storage_path, is_cover)
  values ('38000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-0000000000d2/vibe/38000000-0000-0000-0000-000000000002/a.jpg', true)$$,
  'an owner can add a photo in the listing folder');

-- ----------------------------------------------------- others cannot see it
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select is((select count(*)::int from public.vibe_listings where id = '38000000-0000-0000-0000-000000000002'), 0,
  'another vendor cannot read the listing');
select is((select count(*)::int from public.vibe_listings where address_line1 is not null
  and id = '38000000-0000-0000-0000-000000000002'), 0, 'another vendor cannot read its address');
select is((select count(*)::int from public.vibe_slots where listing_id = '38000000-0000-0000-0000-000000000002'), 0,
  'another vendor cannot read its slots');
select throws_ok($$insert into public.vibe_slots (listing_id, starts_at, capacity)
  values ('38000000-0000-0000-0000-000000000002', now() + interval '5 days', 5)$$,
  '42501', null, 'another vendor cannot add slots to it');

set local role anon;
select throws_ok($$select id from public.vibe_listings$$, '42501', null, 'an anonymous user cannot read listings');
select throws_ok($$select latitude from public.vibe_listings$$, '42501', null,
  'an anonymous user cannot read coordinates');

-- admin reads (review permission)
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select is((select count(*)::int from public.vibe_listings where id = '38000000-0000-0000-0000-000000000002'), 1,
  'an admin can read the listing');

-- ---------------------------------------------------------- table rules
reset role;
select throws_ok($$insert into public.vibe_listings (vendor_profile_id, subtype, title)
  values ('37000000-0000-0000-0000-000000000004', 'event', 'Not allowed')$$, 'P0001', null,
  'a move profile cannot own a vibe listing');
select throws_ok($$insert into public.vibe_slots (listing_id, starts_at, capacity, booked)
  values ('38000000-0000-0000-0000-000000000002', now() + interval '9 days', 3, 5)$$,
  '23514', null, 'booked cannot exceed capacity');
insert into public.vibe_slots (id, listing_id, starts_at, capacity, booked) values
  ('39000000-0000-0000-0000-000000000001', '38000000-0000-0000-0000-000000000002', now() + interval '10 days', 5, 2);
select throws_ok($$update public.vibe_slots set capacity = 1 where id = '39000000-0000-0000-0000-000000000001'$$,
  'P0001', null, 'capacity cannot drop below the bookings already taken');
select throws_ok($$insert into public.vibe_ticket_types (listing_id, name, price)
  values ('38000000-0000-0000-0000-000000000002', 'Free', 0)$$, '23514', null,
  'a free ticket needs a confirmation time');
select throws_ok($$insert into public.vibe_ticket_types (listing_id, name, price, free_confirmed_at, discount_percent)
  values ('38000000-0000-0000-0000-000000000002', 'Free', 0, now(), 10)$$, '23514', null,
  'a free ticket cannot carry a discount');
select throws_ok($$insert into public.vibe_ticket_types (listing_id, name, price, discount_percent)
  values ('38000000-0000-0000-0000-000000000002', 'Adult', 10, 100)$$, '23514', null,
  'a discount of 100 percent is rejected');
select throws_ok($$insert into public.vibe_ticket_types (listing_id, name, price, discount_percent)
  values ('38000000-0000-0000-0000-000000000002', 'Adult', 10, 0)$$, '23514', null,
  'a discount of zero is rejected (leave it empty instead)');
select lives_ok($$insert into public.vibe_ticket_types (listing_id, name, description, price, discount_percent)
  values ('38000000-0000-0000-0000-000000000002', 'Adult', 'Ages 13 and up', 10, 25)$$,
  'a paid ticket with a discount is accepted');
select lives_ok($$insert into public.vibe_ticket_types (listing_id, name, price, free_confirmed_at)
  values ('38000000-0000-0000-0000-000000000002', 'Child', 0, now())$$,
  'a confirmed free ticket is accepted');
select throws_ok($$insert into public.vibe_ticket_types (listing_id, name, description, price)
  values ('38000000-0000-0000-0000-000000000002', 'Long', repeat('x', 201), 5)$$, '23514', null,
  'a ticket description over 200 characters is rejected');

select * from finish();
rollback;
