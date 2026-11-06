begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

-- Users: u1 email sign-up, u2 Google-style metadata, u3 full_name only, u4 admin.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'ada@example.com',
   '{"first_name":"Ada","last_name":"Lovelace"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'grace@example.com',
   '{"given_name":"Grace","family_name":"Hopper"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated', 'alan@example.com',
   '{"full_name":"Alan Mathison Turing"}'),
  ('00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated', 'root@example.com', '{}');

select is((select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'traveler', 'new profile defaults to traveler');
select is((select first_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'Ada', 'first_name from first_name metadata');
select is((select last_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'Lovelace', 'last_name from last_name metadata');
select is((select first_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  'Grace', 'first_name falls back to given_name');
select is((select last_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  'Hopper', 'last_name falls back to family_name');
select is((select first_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a3'),
  'Alan', 'first_name split from full_name');
select is((select last_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a3'),
  'Mathison Turing', 'last_name is the rest of full_name');
select is((select raw_app_meta_data ->> 'role' from auth.users where id = '00000000-0000-0000-0000-0000000000a1'),
  'traveler', 'role is copied to app_metadata on sign-up');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a4';
select is((select raw_app_meta_data ->> 'role' from auth.users where id = '00000000-0000-0000-0000-0000000000a4'),
  'admin', 'role change by SQL propagates to app_metadata');

update auth.users set phone = '+18765551234', phone_confirmed_at = now()
  where id = '00000000-0000-0000-0000-0000000000a1';
select is((select phone from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  '+18765551234', 'phone is mirrored to the profile');
select isnt((select phone_verified_at from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  null, 'phone_verified_at is mirrored to the profile');

-- Act as u1 (traveler).
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"role":"traveler"}}', true);

select lives_ok($$update public.profiles set first_name = 'Augusta' where id = '00000000-0000-0000-0000-0000000000a1'$$,
  'user can update first_name');
select is((select updated_by from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'updated_by is set by trigger');
select throws_ok($$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '42501', null, 'user cannot change role');
select throws_ok($$update public.profiles set phone = '+18760000000' where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '42501', null, 'user cannot write phone');
select throws_ok($$update public.profiles set phone_verified_at = now() where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '42501', null, 'user cannot write phone_verified_at');
select throws_ok($$update public.profiles set profile_status = 'active' where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '42501', null, 'user cannot write profile_status');

select is((select public.claim_vendor_role()), 'vendor', 'traveler claims vendor');
select is((select public.claim_vendor_role()), 'vendor', 'second claim is a no-op');

reset role;
select is((select raw_app_meta_data ->> 'role' from auth.users where id = '00000000-0000-0000-0000-0000000000a1'),
  'vendor', 'claim propagates to app_metadata');

-- Act as u4 (admin).
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated","app_metadata":{"role":"admin"}}', true);

select is((select public.claim_vendor_role()), 'admin', 'admin stays admin when claiming');
select is((select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a4'),
  'admin', 'admin profile role unchanged');
select is((select count(*) from public.profiles), 4::bigint, 'admin reads all profiles');

-- Back to u1.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);

select is((select count(*) from public.profiles), 1::bigint, 'user reads only their own profile');
select is((select count(*) from public.audit_log), 0::bigint, 'non-admin sees no audit rows');
select throws_ok($$insert into public.audit_log (table_name, row_id, action) values ('profiles', 'x', 'UPDATE')$$,
  '42501', null, 'non-admin cannot write audit_log');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-0000000000a1/avatar.webp')$$,
  'user can write inside their own avatar folder');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-0000000000a2/avatar.webp')$$,
  '42501', null, 'user cannot write inside another folder');

reset role;
select ok(exists (
  select 1 from public.audit_log
  where table_name = 'profiles'
    and row_id = '00000000-0000-0000-0000-0000000000a1'
    and action = 'UPDATE'
    and actor_id = '00000000-0000-0000-0000-0000000000a1'
    and old_values ->> 'first_name' = 'Ada'
    and new_values ->> 'first_name' = 'Augusta'
), 'profile update is audited with old and new values');

select * from finish();
rollback;
