begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- f1 admin, f2 and f3 MOVE vendors.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'authenticated', 'authenticated', 'f1@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000f2', 'authenticated', 'authenticated', 'f2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000f3', 'authenticated', 'authenticated', 'f3@example.com', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000f1';
update public.profiles set role = 'vendor' where id in
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f3');

insert into public.vendor_profiles (id, account_id, category, primary_region) values
  ('14000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f2', 'move', 'Kingston'),
  ('14000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000f3', 'move', 'Negril');

select cmp_ok((select count(*) from public.places), '>=', 25::bigint, 'at least 25 places are seeded');
select ok(exists (
  select 1 from public.places
  where slug = 'mbj' and lat between 17.5 and 18.7 and lng between -78.5 and -76.0
), 'MBJ is seeded with Jamaican coordinates');
select is((select count(*) from public.places where slug in ('negril', 'montego-bay', 'kin')),
  3::bigint, 'Negril, Montego Bay and KIN are seeded');
select is((select count(*) from public.places where lat not between 17.5 and 18.7
  or lng not between -78.5 and -76.0), 0::bigint, 'every place sits inside Jamaica');

-- Anonymous visitors can read places.
set local role anon;
select cmp_ok((select count(*) from public.places), '>=', 25::bigint, 'anon reads places');
reset role;

-- A vendor.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated","app_metadata":{"role":"vendor"}}', true);
select throws_ok($$insert into public.places (slug, name, kind, parish, lat, lng)
  values ('test-place', 'Test', 'town', 'Hanover', 18.4, -78.1)$$,
  '42501', null, 'a vendor cannot add a place');
update public.places set name = 'Hacked' where slug = 'mbj';
select isnt((select name from public.places where slug = 'mbj'), 'Hacked', 'a vendor cannot edit a place');
select lives_ok($$insert into public.place_suggestions (vendor_profile_id, name, note)
  values ('14000000-0000-0000-0000-000000000002', 'Robins Bay', 'Near Port Maria')$$,
  'a vendor can suggest a place for their own profile');
select throws_ok($$insert into public.place_suggestions (vendor_profile_id, name)
  values ('14000000-0000-0000-0000-000000000003', 'Someone Else')$$,
  '42501', null, 'a vendor cannot suggest for another vendor''s profile');
select is((select count(*) from public.place_suggestions), 1::bigint, 'a vendor sees only their own suggestions');
select is((select public.authorize('listings.review')), false, 'a vendor lacks listings.review');
update public.place_suggestions set status = 'added';
select is((select status from public.place_suggestions limit 1), 'open', 'a vendor cannot resolve a suggestion');

-- The admin.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated","app_metadata":{"role":"admin"}}', true);
select is((select public.authorize('places.manage')), true, 'an admin holds places.manage');
select lives_ok($$insert into public.places (slug, name, kind, parish, lat, lng)
  values ('robins-bay', 'Robins Bay', 'town', 'St. Mary', 18.3900, -76.7500)$$,
  'an admin can add a place');
update public.place_suggestions set status = 'added';
select is((select status from public.place_suggestions limit 1), 'added', 'an admin can resolve a suggestion');

select * from finish();
rollback;
