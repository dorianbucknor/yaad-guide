begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 'c1@example.com', '{"first_name":"Cee","last_name":"One"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'c2@example.com', '{"first_name":"Cee","last_name":"Two"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'authenticated', 'authenticated', 'c3@example.com', '{"first_name":"Cee","last_name":"Three"}'),
  ('00000000-0000-0000-0000-0000000000c4', 'authenticated', 'authenticated', 'c4@example.com', '{"first_name":"Cee","last_name":"Four"}');

insert into public.vendor_profiles (id, account_id, category, primary_region) values
  ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'move', 'St. Ann');
update public.vendor_profiles set status = 'approved' where id = '10000000-0000-0000-0000-0000000000c1';

-- Act as c1.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated","app_metadata":{"role":"vendor"}}', true);

select lives_ok($$select public.archive_account()$$, 'an active account can be archived');
select is((select profile_status from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), 'archived', 'status is archived');
select isnt((select archived_at from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), null, 'archived_at is set');
select throws_ok($$select public.archive_account()$$, 'P0001', null, 'archiving twice raises');
select is((select status from public.vendor_profiles where id = '10000000-0000-0000-0000-0000000000c1'), 'approved', 'vendor profile status is untouched while archived');
select is(public.account_is_active('00000000-0000-0000-0000-0000000000c1'), false, 'an archived account is not active');

select lives_ok($$select public.restore_account()$$, 'an archived account can be restored');
select is((select profile_status from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), 'active', 'status is active again');
select is((select archived_at from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), null, 'archived_at is cleared');
select throws_ok($$select public.restore_account()$$, 'P0001', null, 'restoring an active account raises');
select is(public.account_is_active('00000000-0000-0000-0000-0000000000c1'), true, 'a restored account is active');
select is((select status from public.vendor_profiles where id = '10000000-0000-0000-0000-0000000000c1'), 'approved', 'vendor profile status is the same after restore');

-- Act as c2: nothing above touched this account, and app users cannot call purge helpers.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","app_metadata":{"role":"traveler"}}', true);
select is((select profile_status from public.profiles where id = '00000000-0000-0000-0000-0000000000c2'), 'active', 'another account was never touched');
select throws_ok($$select public.accounts_due_for_purge('7 days')$$, '42501', null, 'app users cannot list accounts due for purge');
select throws_ok($$select public.scrub_audit_for_account('00000000-0000-0000-0000-0000000000c3')$$, '42501', null, 'app users cannot scrub audit rows');

-- Fixtures as superuser: c3 archived eight days ago, c4 six days ago.
reset role;
update public.profiles set profile_status = 'archived', archived_at = now() - interval '8 days'
  where id = '00000000-0000-0000-0000-0000000000c3';
update public.profiles set profile_status = 'archived', archived_at = now() - interval '6 days'
  where id = '00000000-0000-0000-0000-0000000000c4';

set local role service_role;
select results_eq($$select * from public.accounts_due_for_purge('7 days')$$,
  $$values ('00000000-0000-0000-0000-0000000000c3'::uuid)$$,
  'only the account archived more than seven days ago is due');
select lives_ok($$select public.scrub_audit_for_account('00000000-0000-0000-0000-0000000000c3')$$, 'service role can scrub');
reset role;
select is((select count(*)::int from public.audit_log
  where table_name = 'profiles' and row_id = '00000000-0000-0000-0000-0000000000c3'
    and (old_values is not null or new_values is not null)), 0, 'audit values for the account are blanked');

select * from finish();
rollback;
