begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- A vendor writes their own listing, including the new switch and the cancellation policy.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 'toggle@example.com', '{}');
update public.profiles set role = 'vendor' where id = '00000000-0000-0000-0000-0000000000c1';
insert into public.vendor_profiles (id, account_id, category, primary_region, status) values
  ('89000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'move', 'Kingston', 'draft');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);

select lives_ok($$insert into public.move_listings (vendor_profile_id, currency, base_fare, per_km, cancellation_policy, distance_pricing_enabled)
  values ('89000000-0000-0000-0000-000000000001', 'usd', 10, 1.5, 'moderate', true)$$,
  'a vendor can create a listing with a cancellation policy and the distance switch');
select is((select distance_pricing_enabled from public.move_listings where vendor_profile_id = '89000000-0000-0000-0000-000000000001'),
  true, 'price by distance is on by default');
select lives_ok($$update public.move_listings set distance_pricing_enabled = false, cancellation_policy = 'flexible'
  where vendor_profile_id = '89000000-0000-0000-0000-000000000001'$$,
  'a vendor can switch price by distance off and change the cancellation policy');
select is((select base_fare from public.move_listings where vendor_profile_id = '89000000-0000-0000-0000-000000000001'),
  10.00::numeric, 'switching it off keeps the base fare');
select throws_ok($$update public.move_listings set status = 'live' where vendor_profile_id = '89000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'a vendor still cannot write the status column');

select * from finish();
rollback;
