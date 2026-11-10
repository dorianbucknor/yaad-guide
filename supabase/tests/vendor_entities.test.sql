begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- e1 and e2 are vendors, e9 a second account for the cross-account checks.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'authenticated', 'authenticated', 'e1@example.com', '{"first_name":"Ee","last_name":"One"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'authenticated', 'authenticated', 'e2@example.com', '{"first_name":"Ee","last_name":"Two"}');

insert into public.vendor_profiles (id, account_id, category, business_name, primary_region) values
  ('e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', 'vibe', 'Dolphin Cove Ltd', 'St. Ann');

select lives_ok($$insert into public.vendor_profiles (account_id, category, business_name, primary_region)
  values ('00000000-0000-0000-0000-0000000000e1', 'vibe', 'Cove Events', 'St. Ann')$$,
  'one account can own a second VIBE entity');
select throws_ok($$insert into public.vendor_profiles (account_id, category, business_name, primary_region)
  values ('00000000-0000-0000-0000-0000000000e1', 'vibe', 'dolphin cove ltd', 'St. Ann')$$,
  '23505', null, 'the same business name under one account is refused, whatever the case');
select lives_ok($$insert into public.vendor_profiles (account_id, category, business_name, primary_region)
  values ('00000000-0000-0000-0000-0000000000e2', 'vibe', 'Dolphin Cove Ltd', 'Negril')$$,
  'another account may use the same business name');

select lives_ok($$insert into public.vendor_profiles (account_id, category, business_name, primary_region)
  values ('00000000-0000-0000-0000-0000000000e1', 'stay', 'Villa One', 'Negril'),
         ('00000000-0000-0000-0000-0000000000e1', 'stay', 'Villa Two', 'Negril')$$,
  'one account can own several STAY entities');
select lives_ok($$insert into public.vendor_profiles (account_id, category, primary_region)
  values ('00000000-0000-0000-0000-0000000000e1', 'move', 'Kingston')$$,
  'an account can have a MOVE profile');
select throws_ok($$insert into public.vendor_profiles (account_id, category, primary_region)
  values ('00000000-0000-0000-0000-0000000000e1', 'move', 'Portland')$$,
  '23505', null, 'a second MOVE profile on one account is refused');

-- RLS: account e2 cannot put a listing under account e1's entity.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select throws_ok($$insert into public.vibe_listings (vendor_profile_id, subtype, title)
  values ('e1000000-0000-0000-0000-000000000001', 'attraction', 'Not mine')$$,
  '42501', null, 'another account cannot create a listing under my entity');

reset role;
select is((select count(*)::int from public.vendor_profiles where account_id = '00000000-0000-0000-0000-0000000000e1' and category = 'vibe'),
  2, 'the first account holds two VIBE entities');
select is((select count(*)::int from public.vibe_listings where title = 'Not mine'), 0, 'no listing was created under the other account');

select * from finish();
rollback;
