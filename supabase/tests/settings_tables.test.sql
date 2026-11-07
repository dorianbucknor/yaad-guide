begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'a1@example.com', '{"first_name":"Ann","last_name":"One"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'a2@example.com', '{"first_name":"Ann","last_name":"Two"}');

insert into public.notification_preferences (account_id, category, channel, enabled) values
  ('00000000-0000-0000-0000-0000000000a1', 'bookings', 'sms', true),
  ('00000000-0000-0000-0000-0000000000a2', 'bookings', 'sms', true);

-- Act as a1.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"role":"traveler"}}', true);

select is((select count(*)::int from public.notification_preferences), 1, 'a person reads only their own preference rows');
select is((select count(*)::int from public.notification_preferences where account_id = '00000000-0000-0000-0000-0000000000a2'), 0, 'another person''s rows are invisible');
select throws_ok($$insert into public.notification_preferences (account_id, category, channel, enabled)
  values ('00000000-0000-0000-0000-0000000000a2', 'offers', 'email', true)$$,
  '42501', null, 'cannot insert for another account');
select throws_ok($$update public.notification_preferences set category = 'offers' where category = 'bookings'$$,
  '42501', null, 'cannot change the category of a row');
select lives_ok($$update public.notification_preferences set enabled = false where category = 'bookings' and channel = 'sms'$$,
  'can switch a preference off');
select is((select enabled from public.notification_preferences where category = 'bookings' and channel = 'sms'), false, 'the switch is saved');
select throws_ok($$insert into public.notification_preferences (account_id, category, channel, enabled)
  values ('00000000-0000-0000-0000-0000000000a1', 'account_security', 'email', false)$$,
  '23514', null, 'account security email cannot be stored as disabled');
select throws_ok($$insert into public.notification_preferences (account_id, category, channel, enabled)
  values ('00000000-0000-0000-0000-0000000000a1', 'spam', 'email', true)$$,
  '23514', null, 'an unknown category is rejected');
select lives_ok($$insert into public.notification_preferences (account_id, category, channel, enabled)
  values ('00000000-0000-0000-0000-0000000000a1', 'offers', 'email', true)$$,
  'can insert their own preference');
select throws_ok($$update public.profiles set archived_at = now() where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '42501', null, 'clients cannot write archived_at');

-- Back to superuser.
reset role;
select is((select enabled from public.notification_preferences
  where account_id = '00000000-0000-0000-0000-0000000000a2'), true, 'another person''s row was not touched');

update public.profiles set profile_status = 'archived' where id = '00000000-0000-0000-0000-0000000000a1';
select is((select (raw_app_meta_data ->> 'archived')::boolean from auth.users where id = '00000000-0000-0000-0000-0000000000a1'),
  true, 'archiving sets the token flag');
update public.profiles set profile_status = 'active' where id = '00000000-0000-0000-0000-0000000000a1';
select is((select (raw_app_meta_data ->> 'archived')::boolean from auth.users where id = '00000000-0000-0000-0000-0000000000a1'),
  false, 'restoring clears the token flag');
select throws_ok($$update public.profiles set profile_status = 'gone' where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '23514', null, 'an unknown status is still rejected');

select * from finish();
rollback;
