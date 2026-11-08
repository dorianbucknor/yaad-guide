begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- c1 admin, c2 and c3 and c5 MOVE vendors with live listings, c4 a traveler.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 'c1@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'c2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000c3', 'authenticated', 'authenticated', 'c3@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000c4', 'authenticated', 'authenticated', 'c4@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000c5', 'authenticated', 'authenticated', 'c5@example.com', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000c1';
update public.profiles set role = 'vendor' where id in
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3',
   '00000000-0000-0000-0000-0000000000c5');

insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('1a000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c2', 'move', 'Kingston', 'approved'),
  ('1a000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c3', 'move', 'Negril', 'approved'),
  ('1a000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000c5', 'move', 'St. Ann', 'approved');
insert into public.move_listings (id, vendor_profile_id) values
  ('1b000000-0000-0000-0000-000000000002', '1a000000-0000-0000-0000-000000000002'),
  ('1b000000-0000-0000-0000-000000000003', '1a000000-0000-0000-0000-000000000003'),
  ('1b000000-0000-0000-0000-000000000005', '1a000000-0000-0000-0000-000000000005');
update public.move_listings set status = 'live', approved_at = now();

create temp table pl as
  select (select id from public.places where slug = 'mbj') as a,
         (select id from public.places where slug = 'negril') as b;

-- Requests for vendor c2: r1 and r2 overlap, r3 is clear of them, r4 is overdue, r5 for the traveler.
insert into public.move_requests (id, listing_id, vendor_profile_id, traveler_id, traveler_first_name,
  pickup_place_id, dropoff_place_id, pickup_at, trip_minutes, party_size, respond_by) values
  ('1c000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000002', '1a000000-0000-0000-0000-000000000002',
   null, 'Ana', (select a from pl), (select b from pl), now() + interval '2 days', 120, 2, now() + interval '1 day'),
  ('1c000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000002', '1a000000-0000-0000-0000-000000000002',
   null, 'Ben', (select a from pl), (select b from pl), now() + interval '2 days 30 minutes', 120, 2, now() + interval '1 day'),
  ('1c000000-0000-0000-0000-000000000003', '1b000000-0000-0000-0000-000000000002', '1a000000-0000-0000-0000-000000000002',
   null, 'Cy', (select a from pl), (select b from pl), now() + interval '3 days', 120, 2, now() + interval '1 day'),
  ('1c000000-0000-0000-0000-000000000004', '1b000000-0000-0000-0000-000000000002', '1a000000-0000-0000-0000-000000000002',
   null, 'Di', (select a from pl), (select b from pl), now() + interval '4 days', 120, 2, now() - interval '1 hour'),
  ('1c000000-0000-0000-0000-000000000005', '1b000000-0000-0000-0000-000000000002', '1a000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-0000000000c4', 'Eve', (select a from pl), (select b from pl), now() + interval '5 days', 120, 2, now() + interval '1 day'),
  ('1c000000-0000-0000-0000-000000000006', '1b000000-0000-0000-0000-000000000002', '1a000000-0000-0000-0000-000000000002',
   null, 'Flo', (select a from pl), (select b from pl), now() + interval '6 days', 120, 2, now() + interval '1 day'),
  ('1c000000-0000-0000-0000-000000000007', '1b000000-0000-0000-0000-000000000002', '1a000000-0000-0000-0000-000000000002',
   null, 'Gus', (select a from pl), (select b from pl), now() + interval '7 days', 120, 2, now() + interval '1 day');

-- Response-rate fixtures: c3 has five received (four answered in time, one expired); c5 only three.
insert into public.move_requests (listing_id, vendor_profile_id, traveler_first_name, pickup_place_id, dropoff_place_id,
  pickup_at, party_size, respond_by, status, responded_at, created_at) values
  ('1b000000-0000-0000-0000-000000000003', '1a000000-0000-0000-0000-000000000003', 'A', (select a from pl), (select b from pl),
   now() + interval '9 days', 2, now() - interval '9 days', 'accepted', now() - interval '9 days 2 hours', now() - interval '10 days'),
  ('1b000000-0000-0000-0000-000000000003', '1a000000-0000-0000-0000-000000000003', 'B', (select a from pl), (select b from pl),
   now() + interval '9 days', 2, now() - interval '8 days', 'declined', now() - interval '8 days 2 hours', now() - interval '9 days'),
  ('1b000000-0000-0000-0000-000000000003', '1a000000-0000-0000-0000-000000000003', 'C', (select a from pl), (select b from pl),
   now() + interval '9 days', 2, now() - interval '7 days', 'accepted', now() - interval '7 days 2 hours', now() - interval '8 days'),
  ('1b000000-0000-0000-0000-000000000003', '1a000000-0000-0000-0000-000000000003', 'D', (select a from pl), (select b from pl),
   now() + interval '9 days', 2, now() - interval '6 days', 'accepted', now() - interval '6 days 2 hours', now() - interval '7 days'),
  ('1b000000-0000-0000-0000-000000000003', '1a000000-0000-0000-0000-000000000003', 'E', (select a from pl), (select b from pl),
   now() + interval '9 days', 2, now() - interval '5 days', 'expired', null, now() - interval '6 days'),
  ('1b000000-0000-0000-0000-000000000005', '1a000000-0000-0000-0000-000000000005', 'F', (select a from pl), (select b from pl),
   now() + interval '9 days', 2, now() - interval '5 days', 'accepted', now() - interval '5 days 2 hours', now() - interval '6 days'),
  ('1b000000-0000-0000-0000-000000000005', '1a000000-0000-0000-0000-000000000005', 'G', (select a from pl), (select b from pl),
   now() + interval '9 days', 2, now() - interval '4 days', 'accepted', now() - interval '4 days 2 hours', now() - interval '5 days'),
  ('1b000000-0000-0000-0000-000000000005', '1a000000-0000-0000-0000-000000000005', 'H', (select a from pl), (select b from pl),
   now() + interval '9 days', 2, now() - interval '3 days', 'accepted', now() - interval '3 days 2 hours', now() - interval '4 days');

-- Vendor c2.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);

select is((select count(*) from public.move_requests), 7::bigint, 'a vendor reads their own requests');
select throws_ok($$update public.move_requests set status = 'accepted'$$,
  '42501', null, 'a vendor cannot change a request directly');
select throws_ok($$insert into public.move_requests (listing_id, vendor_profile_id, pickup_place_id, dropoff_place_id,
  pickup_at, party_size, respond_by) values ('1b000000-0000-0000-0000-000000000002', '1a000000-0000-0000-0000-000000000002',
  (select a from pl), (select b from pl), now() + interval '1 day', 1, now() + interval '1 hour')$$,
  '42501', null, 'a vendor cannot create a request');

select lives_ok($$select public.accept_move_request('1c000000-0000-0000-0000-000000000001', 'Meet at arrivals')$$,
  'a vendor can accept a pending request');
select is((select status || ':' || vendor_note from public.move_requests where id = '1c000000-0000-0000-0000-000000000001'),
  'accepted:Meet at arrivals', 'the request is accepted with the note');
select isnt((select responded_at from public.move_requests where id = '1c000000-0000-0000-0000-000000000001'),
  null, 'the response time is recorded');
select throws_ok($$select public.accept_move_request('1c000000-0000-0000-0000-000000000001', null)$$,
  'P0001', null, 'an answered request cannot be accepted again');
select throws_ok($$select public.accept_move_request('1c000000-0000-0000-0000-000000000002', null)$$,
  'P0001', null, 'a request overlapping an accepted trip is refused');
select lives_ok($$select public.accept_move_request('1c000000-0000-0000-0000-000000000003', null)$$,
  'a request clear of the buffer is accepted');
select throws_ok($$select public.accept_move_request('1c000000-0000-0000-0000-000000000004', null)$$,
  'P0001', null, 'an overdue request cannot be accepted');
select throws_ok($$select public.decline_move_request('1c000000-0000-0000-0000-000000000005', 'because')$$,
  'P0001', null, 'a decline needs one of the listed reasons');
select lives_ok($$select public.decline_move_request('1c000000-0000-0000-0000-000000000005', 'too_far')$$,
  'a vendor can decline with a reason');
select is((select status || ':' || decline_reason from public.move_requests where id = '1c000000-0000-0000-0000-000000000005'),
  'declined:too_far', 'the request is declined with the reason');

-- A paused listing refuses to accept.
update public.move_listings set paused = true;
select throws_ok($$select public.accept_move_request('1c000000-0000-0000-0000-000000000006', null)$$,
  'P0001', null, 'a paused listing cannot accept');
update public.move_listings set paused = false;

-- Another vendor cannot see or answer c2's requests.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select is((select count(*) from public.move_requests where vendor_profile_id = '1a000000-0000-0000-0000-000000000002'),
  0::bigint, 'another vendor cannot read the requests');
select throws_ok($$select public.accept_move_request('1c000000-0000-0000-0000-000000000006', null)$$,
  'P0002', null, 'another vendor cannot accept them');
select is((select public.move_response_rate('1a000000-0000-0000-0000-000000000003')), 0.8::numeric,
  'the response rate is answered in time over received');
select is((select public.move_response_rate('1a000000-0000-0000-0000-000000000002')), null,
  'a vendor cannot read another vendor''s rate');

-- Vendor c5 has too few requests for a rate.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c5","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select is((select public.move_response_rate('1a000000-0000-0000-0000-000000000005')), null,
  'there is no rate under five requests');

-- The traveler sees only their own request.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated","app_metadata":{"role":"traveler"}}', true);
select is((select count(*) from public.move_requests), 1::bigint, 'a traveler sees only their own request');

-- The admin can read requests.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select cmp_ok((select count(*) from public.move_requests), '>=', 7::bigint, 'an admin reads requests');

-- An archived account cannot accept.
reset role;
update public.profiles set profile_status = 'archived', archived_at = now()
  where id = '00000000-0000-0000-0000-0000000000c2';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ok($$select public.accept_move_request('1c000000-0000-0000-0000-000000000007', null)$$,
  'P0001', null, 'an archived account cannot accept');
reset role;
update public.profiles set profile_status = 'active', archived_at = null
  where id = '00000000-0000-0000-0000-0000000000c2';

-- Expiry: callable by the service role only.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ok($$select public.expire_move_requests()$$, '42501', null, 'a vendor cannot run the expiry job');
reset role;
set local role service_role;
select is((select public.expire_move_requests()), 1, 'the expiry job closes the one overdue request');
reset role;
select is((select status from public.move_requests where id = '1c000000-0000-0000-0000-000000000004'),
  'expired', 'the overdue request is expired');

select * from finish();
rollback;
