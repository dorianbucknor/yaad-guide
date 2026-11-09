begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- 91 admin, 92 VIBE vendor (owner), 93 another VIBE vendor.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000091', 'authenticated', 'authenticated', 'k1@example.com', '{}'),
  ('00000000-0000-0000-0000-000000000092', 'authenticated', 'authenticated', 'k2@example.com', '{}'),
  ('00000000-0000-0000-0000-000000000093', 'authenticated', 'authenticated', 'k3@example.com', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000091';
update public.profiles set role = 'vendor' where id in
  ('00000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000093');
insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('67000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000092', 'vibe', 'Kingston', 'approved'),
  ('67000000-0000-0000-0000-000000000093', '00000000-0000-0000-0000-000000000093', 'vibe', 'Negril', 'approved');
-- D1 to D4: dining listings of the owner. E1: an event listing of the owner.
insert into public.vibe_listings (id, vendor_profile_id, subtype, title) values
  ('68000000-0000-0000-0000-0000000000d1', '67000000-0000-0000-0000-000000000092', 'dining', 'Jerk centre'),
  ('68000000-0000-0000-0000-0000000000d2', '67000000-0000-0000-0000-000000000092', 'dining', 'Harbour restaurant'),
  ('68000000-0000-0000-0000-0000000000d3', '67000000-0000-0000-0000-000000000092', 'dining', 'Cookshop'),
  ('68000000-0000-0000-0000-0000000000d4', '67000000-0000-0000-0000-000000000092', 'dining', 'Table for two'),
  ('68000000-0000-0000-0000-0000000000e1', '67000000-0000-0000-0000-000000000092', 'event', 'Reggae night');

-- ------------------------------------------------------------ owner writes
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000092","role":"authenticated","app_metadata":{"role":"vendor"}}', true);

select lives_ok($$insert into public.vibe_listings (vendor_profile_id, subtype, title)
  values ('67000000-0000-0000-0000-000000000092', 'dining', 'Chosen by the app')$$,
  'an owner can create a dining listing');
select lives_ok($$insert into public.vibe_dining_profiles (listing_id, venue_type, dine_in, cuisine_types, price_tier, booking_mode)
  values ('68000000-0000-0000-0000-0000000000d1', 'street_food', false, array['jerk', 'seafood'], '$', 'prepaid')$$,
  'an owner can add the dining details');
select is((select count(*)::int from public.vibe_dining_profiles where listing_id = '68000000-0000-0000-0000-0000000000d1'), 1,
  'the owner reads them');
select lives_ok($$insert into public.vibe_dining_profiles (listing_id, venue_type, dine_in, booking_mode, reservation_style)
  values ('68000000-0000-0000-0000-0000000000d3', 'cookshop', true, 'reservation', 'slotted')$$,
  'a reservation profile with a style is accepted');
select lives_ok($$insert into public.vibe_dining_profiles (listing_id, venue_type, dine_in, booking_mode)
  values ('68000000-0000-0000-0000-0000000000d4', 'restaurant', true, 'listing_only')$$,
  'a restaurant that offers dine-in is accepted');

-- shape rules
select throws_ok($$insert into public.vibe_dining_profiles (listing_id, venue_type, dine_in, takeout, booking_mode)
  values ('68000000-0000-0000-0000-0000000000d2', 'restaurant', false, false, 'listing_only')$$,
  '23514', null, 'a restaurant needs dine-in or takeout');
select throws_ok($$insert into public.vibe_dining_profiles (listing_id, venue_type, booking_mode)
  values ('68000000-0000-0000-0000-0000000000d2', 'cookshop', 'reservation')$$,
  '23514', null, 'a reservation needs a reservation style');
select throws_ok($$insert into public.vibe_dining_profiles (listing_id, venue_type, booking_mode, reservation_style)
  values ('68000000-0000-0000-0000-0000000000d2', 'cookshop', 'prepaid', 'slotted')$$,
  '23514', null, 'a prepaid listing cannot have a reservation style');
select throws_ok($$insert into public.vibe_dining_profiles (listing_id, venue_type, cuisine_types, booking_mode)
  values ('68000000-0000-0000-0000-0000000000d2', 'cookshop', array['a','b','c','d','e','f','g','h','i','j','k'], 'listing_only')$$,
  '23514', null, 'more than ten cuisine types are rejected');
select throws_ok($sql$insert into public.vibe_dining_profiles (listing_id, venue_type, price_tier, booking_mode)
  values ('68000000-0000-0000-0000-0000000000d2', 'cookshop', '$$$$', 'listing_only')$sql$,
  '23514', null, 'an unknown price tier is rejected');
select throws_ok($$insert into public.vibe_dining_profiles (listing_id, venue_type, booking_mode)
  values ('68000000-0000-0000-0000-0000000000e1', 'cookshop', 'listing_only')$$,
  'P0001', null, 'an event listing cannot get dining details');

-- the booking mode is locked once it is set
select throws_ok($$update public.vibe_dining_profiles set booking_mode = 'listing_only'
  where listing_id = '68000000-0000-0000-0000-0000000000d1'$$,
  'P0001', 'The booking mode can''t be changed after it''s set. Create a new listing instead.',
  'the booking mode cannot be changed after it is set');
select throws_ok($$update public.vibe_dining_profiles set reservation_style = 'hours_only'
  where listing_id = '68000000-0000-0000-0000-0000000000d3'$$,
  'P0001', null, 'the reservation style cannot be changed after it is set');
select lives_ok($sql$update public.vibe_dining_profiles set price_tier = '$$', cuisine_types = array['jerk']
  where listing_id = '68000000-0000-0000-0000-0000000000d1'$sql$,
  'the other details stay editable');
select lives_ok($$update public.vibe_dining_profiles set booking_mode = 'prepaid'
  where listing_id = '68000000-0000-0000-0000-0000000000d1'$$,
  'saving the same booking mode again is fine');
select throws_ok($$update public.vibe_dining_profiles set listing_id = '68000000-0000-0000-0000-0000000000d2'
  where listing_id = '68000000-0000-0000-0000-0000000000d1'$$,
  '42501', null, 'a profile cannot be moved to another listing');
select throws_ok($$delete from public.vibe_dining_profiles where listing_id = '68000000-0000-0000-0000-0000000000d1'$$,
  '42501', null, 'a profile cannot be deleted, so the lock cannot be dodged');

-- business hours
select lives_ok($$insert into public.vibe_business_hours (listing_id, weekday, opens_minutes, closes_minutes)
  values ('68000000-0000-0000-0000-0000000000d4', 1, 540, 1260)$$, 'an owner can add business hours');
select throws_ok($$insert into public.vibe_business_hours (listing_id, weekday, opens_minutes, closes_minutes)
  values ('68000000-0000-0000-0000-0000000000d4', 2, 600, 600)$$, '23514', null, 'closing at the opening time is rejected');
select throws_ok($$insert into public.vibe_business_hours (listing_id, weekday, opens_minutes, closes_minutes)
  values ('68000000-0000-0000-0000-0000000000d4', 2, 1080, 120)$$, '23514', null, 'an overnight range is rejected');
select throws_ok($$insert into public.vibe_business_hours (listing_id, weekday, opens_minutes, closes_minutes)
  values ('68000000-0000-0000-0000-0000000000d4', 1, 600, 900)$$, '23505', null, 'a second row for the same weekday is rejected');
select throws_ok($$insert into public.vibe_business_hours (listing_id, weekday, opens_minutes, closes_minutes)
  values ('68000000-0000-0000-0000-0000000000e1', 1, 540, 1260)$$, 'P0001', null, 'an event listing cannot have business hours');
select lives_ok($$update public.vibe_business_hours set closes_minutes = 1320
  where listing_id = '68000000-0000-0000-0000-0000000000d4'$$, 'the owner can change the closing time');
select throws_ok($$update public.vibe_business_hours set weekday = 3 where listing_id = '68000000-0000-0000-0000-0000000000d4'$$,
  '42501', null, 'the weekday of a row cannot be changed');

-- ----------------------------------------------------- others cannot see it
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000093","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select is((select count(*)::int from public.vibe_dining_profiles), 0, 'another vendor cannot read dining details');
select is((select count(*)::int from public.vibe_business_hours), 0, 'another vendor cannot read business hours');
select throws_ok($$insert into public.vibe_business_hours (listing_id, weekday, opens_minutes, closes_minutes)
  values ('68000000-0000-0000-0000-0000000000d4', 5, 540, 1260)$$, '42501', null, 'another vendor cannot add hours to it');
select lives_ok($sql$update public.vibe_dining_profiles set price_tier = '$$$'$sql$,
  'another vendor''s update runs but sees no rows (checked below)');

set local role anon;
select throws_ok($$select listing_id from public.vibe_dining_profiles$$, '42501', null, 'an anonymous user cannot read dining details');
select throws_ok($$select id from public.vibe_business_hours$$, '42501', null, 'an anonymous user cannot read business hours');

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000091","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select is((select count(*)::int from public.vibe_dining_profiles where listing_id = '68000000-0000-0000-0000-0000000000d1'), 1,
  'an admin can read dining details');
select is((select count(*)::int from public.vibe_business_hours), 1, 'an admin can read business hours');
select is((select price_tier from public.vibe_dining_profiles where listing_id = '68000000-0000-0000-0000-0000000000d1'), '$$',
  'the other vendor''s update changed nothing');

select * from finish();
rollback;
