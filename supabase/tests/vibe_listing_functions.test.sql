begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- e1 admin, e2 VIBE vendor, e3 another VIBE vendor.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'authenticated', 'authenticated', 'e1@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000e2', 'authenticated', 'authenticated', 'e2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000e3', 'authenticated', 'authenticated', 'e3@example.com', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000e1';
update public.profiles set role = 'vendor' where id in
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e3');
insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('47000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e2', 'vibe', 'Kingston', 'approved'),
  ('47000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000e3', 'vibe', 'Negril', 'approved');
-- A: a bare draft listing. B: a draft listing for slot generation.
insert into public.vibe_listings (id, vendor_profile_id, subtype, title) values
  ('48000000-0000-0000-0000-00000000000a', '47000000-0000-0000-0000-000000000002', 'attraction', 'Rapids tour'),
  ('48000000-0000-0000-0000-00000000000b', '47000000-0000-0000-0000-000000000002', 'event', 'Friday night');

-- ----------------------------------------------------- readiness and tickets
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select is((select public.vibe_listing_is_ready('48000000-0000-0000-0000-00000000000a')), false,
  'a bare listing is not ready');
select throws_ok($$select public.submit_vibe_listing('48000000-0000-0000-0000-00000000000a')$$, 'P0001', null,
  'an unready listing cannot be submitted');

select throws_ok($$select public.save_vibe_ticket_type('48000000-0000-0000-0000-00000000000a', null,
  'Free', null, 0, null, null, 0, false)$$, 'P0001', 'Confirm that this ticket is free.',
  'a free ticket without confirmation is refused');
select lives_ok($$select public.save_vibe_ticket_type('48000000-0000-0000-0000-00000000000a', null,
  'Free', 'Under 3', 0, null, null, 0, true)$$, 'a confirmed free ticket is saved');
select is((select free_confirmed_at is not null from public.vibe_ticket_types where name = 'Free'), true,
  'the confirmation time is stored');
select throws_ok($$select public.save_vibe_ticket_type('48000000-0000-0000-0000-00000000000a', null,
  'Free2', null, 0, 10, null, 0, true)$$, '23514', null, 'a discount on a free ticket is refused');
select lives_ok($$select public.save_vibe_ticket_type('48000000-0000-0000-0000-00000000000a',
  (select id from public.vibe_ticket_types where name = 'Free'), 'Free', 'Under 3', 5, null, null, 0, false)$$,
  'a free ticket can become a paid one');
select is((select free_confirmed_at is null from public.vibe_ticket_types where name = 'Free'), true,
  'the confirmation is cleared once the ticket is paid');
select lives_ok($$select public.save_vibe_ticket_type('48000000-0000-0000-0000-00000000000a', null,
  'Adult', 'Ages 13 and up', 20, 25, 10, 1, false)$$, 'a paid ticket with a discount is saved');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ok($$select public.save_vibe_ticket_type('48000000-0000-0000-0000-00000000000a', null,
  'Mine', null, 5, null, null, 0, false)$$, 'P0002', null, 'another vendor cannot add tickets to it');
select throws_ok($$select public.submit_vibe_listing('48000000-0000-0000-0000-00000000000a')$$, 'P0002', null,
  'another vendor cannot submit it');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
update public.vibe_listings set description = 'Raft down the river', area = 'Ocho Rios',
  address_line1 = '1 Main Road', town = 'Ocho Rios', parish = 'St. Ann', latitude = 18.4, longitude = -77.1
  where id = '48000000-0000-0000-0000-00000000000a';
insert into public.vibe_photos (listing_id, storage_path, is_cover) values
  ('48000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-0000000000e2/vibe/48000000-0000-0000-0000-00000000000a/c.jpg', true);
select is((select public.vibe_listing_is_ready('48000000-0000-0000-0000-00000000000a')), false,
  'a listing without a slot or schedule is still not ready');
insert into public.vibe_slots (listing_id, starts_at, capacity)
  values ('48000000-0000-0000-0000-00000000000a', now() + interval '3 days', 20);
select is((select public.vibe_listing_is_ready('48000000-0000-0000-0000-00000000000a')), true,
  'a complete listing is ready');

-- --------------------------------------------------------- submit and review
select lives_ok($$select public.submit_vibe_listing('48000000-0000-0000-0000-00000000000a')$$,
  'a ready listing can be submitted');
select is((select status from public.vibe_listings where id = '48000000-0000-0000-0000-00000000000a'),
  'in_review', 'the listing is in review');
select throws_ok($$select public.submit_vibe_listing('48000000-0000-0000-0000-00000000000a')$$, 'P0001', null,
  'a listing in review cannot be submitted again');
select throws_ok($$select public.review_vibe_listing('48000000-0000-0000-0000-00000000000a', 'approve', null)$$,
  '42501', null, 'a vendor cannot review a listing');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select throws_ok($$select public.review_vibe_listing('48000000-0000-0000-0000-00000000000a', 'reject', '')$$,
  'P0001', null, 'a rejection needs a note');
select lives_ok($$select public.review_vibe_listing('48000000-0000-0000-0000-00000000000a', 'reject', 'Add a clearer photo')$$,
  'an admin can reject with a note');
select is((select status from public.vibe_listings where id = '48000000-0000-0000-0000-00000000000a'),
  'draft', 'a rejected listing goes back to draft');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select lives_ok($$select public.submit_vibe_listing('48000000-0000-0000-0000-00000000000a')$$, 'the vendor resubmits');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select lives_ok($$select public.review_vibe_listing('48000000-0000-0000-0000-00000000000a', 'approve', null)$$,
  'an admin can approve');
select is((select status from public.vibe_listings where id = '48000000-0000-0000-0000-00000000000a'),
  'live', 'an approved listing is live');

-- ------------------------------------------------------------------- flags
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select lives_ok($$select public.save_vibe_ticket_type('48000000-0000-0000-0000-00000000000a',
  (select id from public.vibe_ticket_types where name = 'Adult'), 'Adult', 'Ages 13 and up', 30, 25, 10, 1, false)$$,
  'a live listing price can change');
select is((select count(*)::int from public.vibe_listing_flags
  where listing_id = '48000000-0000-0000-0000-00000000000a' and kind = 'price' and resolved_at is null), 1,
  'a price change on a live listing opens a flag');
select lives_ok($$select public.save_vibe_ticket_type('48000000-0000-0000-0000-00000000000a',
  (select id from public.vibe_ticket_types where name = 'Adult'), 'Adult', 'Ages 13 and up', 35, 25, 10, 1, false)$$,
  'the price changes again');
select is((select count(*)::int from public.vibe_listing_flags
  where listing_id = '48000000-0000-0000-0000-00000000000a' and kind = 'price' and resolved_at is null), 1,
  'a second change does not open a second flag');
insert into public.vibe_photos (listing_id, storage_path) values
  ('48000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-0000000000e2/vibe/48000000-0000-0000-0000-00000000000a/d.jpg');
select is((select count(*)::int from public.vibe_listing_flags
  where listing_id = '48000000-0000-0000-0000-00000000000a' and kind = 'photo' and resolved_at is null), 1,
  'a new photo on a live listing opens a photo flag');
select throws_ok($$select public.resolve_vibe_listing_flag((select id from public.vibe_listing_flags limit 1))$$,
  '42501', null, 'a vendor cannot resolve a flag');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select lives_ok($$select public.resolve_vibe_listing_flag((select id from public.vibe_listing_flags
  where kind = 'price' and resolved_at is null limit 1))$$, 'an admin can resolve a flag');

-- -------------------------------------------------------- slot generation (B)
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
-- A Friday rule at 23:30 Jamaica time falls on the next UTC day.
insert into public.vibe_schedule_rules (listing_id, weekday, start_minutes, capacity)
  values ('48000000-0000-0000-0000-00000000000b', 5, 1410, 10);
select ok((select count(*) from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b') between 12 and 14,
  'a weekly rule fills about 13 Fridays in the 90-day window');
select is((select count(*)::int from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b'
  and extract(dow from starts_at at time zone 'America/Jamaica') <> 5), 0,
  'every slot is on a Jamaica Friday');
select is((select count(*)::int from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b'
  and (extract(hour from starts_at at time zone 'America/Jamaica') <> 23
    or extract(minute from starts_at at time zone 'America/Jamaica') <> 30)), 0,
  'every slot starts at 23:30 Jamaica time');
select ok((select count(*) from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b'
  and (starts_at at time zone 'UTC')::date <> (starts_at at time zone 'America/Jamaica')::date) > 0,
  'the UTC date differs from the Jamaica date for 23:30 slots');
select is((select count(*)::int from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b'
  and source <> 'rule'), 0, 'generated slots are marked as rule slots');

-- A Monday rule at 00:30 keeps its own local day.
insert into public.vibe_schedule_rules (listing_id, weekday, start_minutes, capacity)
  values ('48000000-0000-0000-0000-00000000000b', 1, 30, 6);
select is((select count(*)::int from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b'
  and capacity = 6 and (extract(dow from starts_at at time zone 'America/Jamaica') <> 1
    or extract(hour from starts_at at time zone 'America/Jamaica') <> 0)), 0,
  'a 00:30 rule lands on its own Jamaica Monday');

-- Booked and hand-edited slots survive regeneration.
reset role;
update public.vibe_slots set booked = 2 where id = (select id from public.vibe_slots
  where listing_id = '48000000-0000-0000-0000-00000000000b' and capacity = 10 order by starts_at limit 1);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
update public.vibe_slots set capacity = 7 where id = (select id from public.vibe_slots
  where listing_id = '48000000-0000-0000-0000-00000000000b' and capacity = 10 and booked = 0
  order by starts_at limit 1 offset 1);
update public.vibe_schedule_rules set capacity = 12
  where listing_id = '48000000-0000-0000-0000-00000000000b' and weekday = 5;
select is((select count(*)::int from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b'
  and booked = 2 and capacity = 10), 1, 'a booked slot survives a rule change');
select is((select count(*)::int from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b'
  and edited and capacity = 7), 1, 'a hand-edited slot survives a rule change');
select ok((select count(*) from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b'
  and not edited and booked = 0 and capacity = 12) >= 10, 'the other Friday slots take the new capacity');

-- Closing a day: refused when booked, otherwise blocks regeneration.
select throws_ok($$select public.set_vibe_date_closed('48000000-0000-0000-0000-00000000000b',
  (select (starts_at at time zone 'America/Jamaica')::date from public.vibe_slots
   where listing_id = '48000000-0000-0000-0000-00000000000b' and booked = 2), true)$$,
  'P0001', null, 'a day with bookings cannot be closed');
select lives_ok($$select public.set_vibe_date_closed('48000000-0000-0000-0000-00000000000b',
  (select (starts_at at time zone 'America/Jamaica')::date from public.vibe_slots
   where listing_id = '48000000-0000-0000-0000-00000000000b' and capacity = 12 order by starts_at limit 1 offset 3), true)$$,
  'a day without bookings can be closed');
select is((select count(*)::int from public.vibe_blocked_dates where listing_id = '48000000-0000-0000-0000-00000000000b'), 1,
  'the closed day is remembered');
select is((select count(*)::int from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b'
  and status = 'closed'), 1, 'its slot is closed');
select lives_ok($$select public.clear_vibe_auto_slots('48000000-0000-0000-0000-00000000000b')$$,
  'the vendor can clear unbooked auto slots');
select is((select count(*)::int from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b'), 1,
  'only the booked slot remains');
update public.vibe_schedule_rules set capacity = 11
  where listing_id = '48000000-0000-0000-0000-00000000000b' and weekday = 5;
select is((select count(*)::int from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b'
  and (starts_at at time zone 'America/Jamaica')::date in
  (select day from public.vibe_blocked_dates where listing_id = '48000000-0000-0000-0000-00000000000b')), 0,
  'regeneration skips a closed date');
select lives_ok($$select public.set_vibe_date_closed('48000000-0000-0000-0000-00000000000b',
  (select day from public.vibe_blocked_dates limit 1), false)$$, 'a closed day can be reopened');
select is((select count(*)::int from public.vibe_blocked_dates where listing_id = '48000000-0000-0000-0000-00000000000b'), 0,
  'reopening forgets the closed day');

-- Auto generation off: no new slots from rules until it is switched back on.
update public.vibe_listings set auto_generate_slots = false where id = '48000000-0000-0000-0000-00000000000b';
select lives_ok($$select public.clear_vibe_auto_slots('48000000-0000-0000-0000-00000000000b')$$, 'clear with auto off');
insert into public.vibe_schedule_rules (listing_id, weekday, start_minutes, capacity)
  values ('48000000-0000-0000-0000-00000000000b', 3, 600, 8);
select is((select count(*)::int from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b'
  and extract(dow from starts_at at time zone 'America/Jamaica') = 3), 0,
  'no slots are generated while auto generation is off');
select lives_ok($$insert into public.vibe_slots (listing_id, starts_at, capacity)
  values ('48000000-0000-0000-0000-00000000000b', now() + interval '20 days', 4)$$,
  'a slot can still be added by hand while auto generation is off');
update public.vibe_listings set auto_generate_slots = true where id = '48000000-0000-0000-0000-00000000000b';
select ok((select count(*) from public.vibe_slots where listing_id = '48000000-0000-0000-0000-00000000000b'
  and extract(dow from starts_at at time zone 'America/Jamaica') = 3) > 0,
  'switching auto generation back on fills the slots');

-- The nightly job is for the service role only.
select throws_ok($$select public.generate_all_vibe_slots()$$, '42501', null,
  'a vendor cannot run the nightly generation');
reset role;
select lives_ok($$select public.generate_all_vibe_slots()$$, 'the nightly generation runs for the service');

select * from finish();
rollback;
