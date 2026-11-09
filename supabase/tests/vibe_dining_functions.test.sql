begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- One approved VIBE vendor. Every listing below has the shared fields and a cover photo, so the
-- only thing that changes is what its booking mode (or, for the event, the old rule) asks for.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'm1@example.com', '{}');
update public.profiles set role = 'vendor' where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('77000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'vibe', 'Kingston', 'approved');

insert into public.vibe_listings (id, vendor_profile_id, subtype, title, description, area, address_line1, town, parish, latitude, longitude)
select id, '77000000-0000-0000-0000-0000000000a1', subtype, title, 'Good food', 'Kingston', '1 Main Road', 'Kingston', 'Kingston', 18.0, -76.8
from (values
  ('78000000-0000-0000-0000-000000000001'::uuid, 'dining', 'No details yet'),
  ('78000000-0000-0000-0000-000000000002'::uuid, 'dining', 'Listing only'),
  ('78000000-0000-0000-0000-000000000003'::uuid, 'dining', 'Prepaid tasting'),
  ('78000000-0000-0000-0000-000000000004'::uuid, 'dining', 'Slotted reservations'),
  ('78000000-0000-0000-0000-000000000005'::uuid, 'dining', 'Hours only'),
  ('78000000-0000-0000-0000-000000000006'::uuid, 'event', 'Reggae night')
) as l(id, subtype, title);

insert into public.vibe_photos (listing_id, storage_path, is_cover)
select id, '00000000-0000-0000-0000-0000000000a1/vibe/' || id::text || '/cover.jpg', true
from public.vibe_listings where vendor_profile_id = '77000000-0000-0000-0000-0000000000a1';

-- 1: a dining listing with no dining details is never ready
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000001')), false,
  'a dining listing with no dining details is not ready');

-- 2: listing only needs nothing more
insert into public.vibe_dining_profiles (listing_id, venue_type, dine_in, booking_mode)
  values ('78000000-0000-0000-0000-000000000002', 'cookshop', true, 'listing_only');
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000002')), true,
  'a listing-only dining listing is ready on the shared fields alone');

-- 3: prepaid needs a ticket and a slot
insert into public.vibe_dining_profiles (listing_id, venue_type, dine_in, booking_mode)
  values ('78000000-0000-0000-0000-000000000003', 'restaurant', true, 'prepaid');
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000003')), false,
  'a prepaid dining listing is not ready with no ticket and no slot');
insert into public.vibe_ticket_types (listing_id, name, price) values ('78000000-0000-0000-0000-000000000003', 'Tasting menu', 60);
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000003')), false,
  'a prepaid dining listing is not ready with a ticket but no slot');
insert into public.vibe_slots (listing_id, starts_at, capacity) values ('78000000-0000-0000-0000-000000000003', now() + interval '3 days', 12);
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000003')), true,
  'a prepaid dining listing is ready with a ticket and a slot');

-- 4: slotted reservations need a slot, not a ticket
insert into public.vibe_dining_profiles (listing_id, venue_type, dine_in, booking_mode, reservation_style)
  values ('78000000-0000-0000-0000-000000000004', 'restaurant', true, 'reservation', 'slotted');
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000004')), false,
  'a slotted reservation listing is not ready with no slot');
insert into public.vibe_slots (listing_id, starts_at, capacity) values ('78000000-0000-0000-0000-000000000004', now() + interval '3 days', 8);
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000004')), true,
  'a slotted reservation listing is ready with a slot and no ticket');

-- 5: reservations on opening hours need an hours row
insert into public.vibe_dining_profiles (listing_id, venue_type, dine_in, booking_mode, reservation_style)
  values ('78000000-0000-0000-0000-000000000005', 'cookshop', true, 'reservation', 'hours_only');
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000005')), false,
  'an hours-only reservation listing is not ready with no hours');
insert into public.vibe_slots (listing_id, starts_at, capacity) values ('78000000-0000-0000-0000-000000000005', now() + interval '3 days', 8);
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000005')), false,
  'a slot does not stand in for opening hours');
insert into public.vibe_business_hours (listing_id, weekday, opens_minutes, closes_minutes)
  values ('78000000-0000-0000-0000-000000000005', 1, 540, 1260);
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000005')), true,
  'an hours-only reservation listing is ready with opening hours');

-- 6: events and attractions are unaffected
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000006')), false,
  'an event with no ticket and no slot is not ready');
insert into public.vibe_ticket_types (listing_id, name, price) values ('78000000-0000-0000-0000-000000000006', 'Entry', 20);
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000006')), false,
  'an event with a ticket but no slot is not ready');
insert into public.vibe_slots (listing_id, starts_at, capacity) values ('78000000-0000-0000-0000-000000000006', now() + interval '3 days', 50);
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000006')), true,
  'an event with a ticket and a slot is ready');

-- the shared fields still matter for dining
update public.vibe_listings set address_line1 = null where id = '78000000-0000-0000-0000-000000000002';
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000002')), false,
  'a dining listing without an address is not ready, whatever its mode');
update public.vendor_profiles set status = 'pending' where id = '77000000-0000-0000-0000-0000000000a1';
select is((select public.vibe_listing_is_ready('78000000-0000-0000-0000-000000000003')), false,
  'a dining listing under an unapproved profile is not ready');

select * from finish();
rollback;
