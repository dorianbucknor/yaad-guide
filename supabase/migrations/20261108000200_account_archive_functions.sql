-- Archive, restore and purge helpers for account deletion.

create function public.archive_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.profiles
  set profile_status = 'archived', archived_at = now()
  where id = auth.uid() and profile_status = 'active';

  if not found then
    raise exception 'This account can''t be deleted right now.';
  end if;
end;
$$;

create function public.restore_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.profiles
  set profile_status = 'active', archived_at = null
  where id = auth.uid() and profile_status = 'archived';

  if not found then
    raise exception 'This account isn''t scheduled for deletion.';
  end if;
end;
$$;

-- The rule for any future public listing policy: archived accounts are hidden.
create function public.account_is_active(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles
    where id = p_account_id and profile_status = 'archived'
  );
$$;

create function public.accounts_due_for_purge(p_older_than interval)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.profiles
  where profile_status = 'archived' and archived_at < now() - p_older_than;
$$;

-- Blanks personal values in audit rows about an account; ids stay for traceability.
create function public.scrub_audit_for_account(p_account_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.audit_log
  set old_values = null, new_values = null
  where (table_name = 'profiles' and row_id = p_account_id::text)
     or (table_name = 'vendor_profiles' and row_id in (
          select id::text from public.vendor_profiles where account_id = p_account_id))
     or (table_name = 'vendor_vehicles' and row_id in (
          select v.id::text from public.vendor_vehicles v
          join public.vendor_profiles p on p.id = v.vendor_profile_id
          where p.account_id = p_account_id))
     or (table_name = 'vendor_documents' and row_id in (
          select id::text from public.vendor_documents where account_id = p_account_id));
$$;

revoke all on function public.archive_account() from public, anon;
revoke all on function public.restore_account() from public, anon;
revoke all on function public.account_is_active(uuid) from public, anon;
revoke all on function public.accounts_due_for_purge(interval) from public, anon, authenticated;
revoke all on function public.scrub_audit_for_account(uuid) from public, anon, authenticated;

grant execute on function public.archive_account() to authenticated;
grant execute on function public.restore_account() to authenticated;
grant execute on function public.account_is_active(uuid) to authenticated;
grant execute on function public.accounts_due_for_purge(interval) to service_role;
grant execute on function public.scrub_audit_for_account(uuid) to service_role;
