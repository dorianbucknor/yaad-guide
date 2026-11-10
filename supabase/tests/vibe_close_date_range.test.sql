begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f2', 'authenticated', 'authenticated', 'f2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000f3', 'authenticated', 'authenticated', 'f3@example.com', '{}');
update public.profiles set role = 'vendor' where id in
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f3');
insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('57000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f2', 'vibe', 'Kingston', 'approved'),
  ('57000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000f3', 'vibe', 'Negril', 'approved');
insert into public.vibe_listings (id, vendor_profile_id, subtype, title) values
  ('58000000-0000-0000-0000-00000000000a', '57000000-0000-0000-0000-000000000002', 'event', 'Friday night');
insert into public.vibe_slots (listing_id, starts_at, capacity, booked) values
  ('58000000-0000-0000-0000-00000000000a', '2030-03-10 15:00-05', 10, 0),
  ('58000000-0000-0000-0000-00000000000a', '2030-03-11 15:00-05', 10, 3),
  ('58000000-0000-0000-0000-00000000000a', '2030-03-12 15:00-05', 10, 0);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);

select throws_ok($$select public.set_vibe_dates_closed('58000000-0000-0000-0000-00000000000a', '2030-03-10', '2030-03-12', true)$$,
  'P0001', null, 'a range that includes a booked day is refused');
select is((select count(*)::int from public.vibe_blocked_dates), 0, 'a refused range closes nothing');
select throws_ok($$select public.set_vibe_dates_closed('58000000-0000-0000-0000-00000000000a', '2030-03-12', '2030-03-10', true)$$,
  'P0001', 'The last day can''t be before the first.', 'a backwards range is refused');
select throws_ok($$select public.set_vibe_dates_closed('58000000-0000-0000-0000-00000000000a', '2030-03-01', '2030-09-01', true)$$,
  'P0001', 'Pick at most three months at a time.', 'a very long range is refused');
select lives_ok($$select public.set_vibe_dates_closed('58000000-0000-0000-0000-00000000000a', '2030-03-12', '2030-03-14', true)$$,
  'a range of free days closes');
select is((select count(*)::int from public.vibe_blocked_dates), 3, 'every day in the range is recorded');
select is((select status from public.vibe_slots where starts_at = '2030-03-12 15:00-05'), 'closed', 'the slot on a closed day closes');
select lives_ok($$select public.set_vibe_dates_closed('58000000-0000-0000-0000-00000000000a', '2030-03-12', '2030-03-14', false)$$,
  'the range reopens');
select is((select count(*)::int from public.vibe_blocked_dates), 0, 'reopening forgets the days');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ok($$select public.set_vibe_dates_closed('58000000-0000-0000-0000-00000000000a', '2030-03-12', '2030-03-12', true)$$,
  'P0002', null, 'another vendor cannot close the dates');

select * from finish();
rollback;
