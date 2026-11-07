-- Account settings: an archived profile status and stored notification preferences.

alter table public.profiles drop constraint profiles_profile_status_check;
alter table public.profiles add constraint profiles_profile_status_check
  check (profile_status in ('active', 'suspended', 'deactivated', 'archived'));

alter table public.profiles add column archived_at timestamptz;

-- Keep app_metadata.archived in step with the status, like the role, so the proxy can read it.
create function public.sync_archived_to_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('archived', new.profile_status = 'archived')
  where id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_archived_to_app_metadata() from public, anon, authenticated;

create trigger profiles_sync_archived
  after update of profile_status on public.profiles
  for each row
  when (old.profile_status is distinct from new.profile_status)
  execute function public.sync_archived_to_app_metadata();

create table public.notification_preferences (
  account_id uuid not null references auth.users (id) on delete cascade,
  category text not null
    check (category in ('account_security', 'bookings', 'vendor_review', 'document_expiry', 'offers')),
  channel text not null check (channel in ('email', 'sms')),
  enabled boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (account_id, category, channel),
  constraint notification_preferences_security_email_locked
    check (not (category = 'account_security' and channel = 'email' and enabled = false))
);

alter table public.notification_preferences enable row level security;

create trigger notification_preferences_set_updated
  before update on public.notification_preferences
  for each row execute function public.set_updated_fields();

revoke all on public.notification_preferences from anon, authenticated;
grant select on public.notification_preferences to authenticated;
grant insert (account_id, category, channel, enabled)
  on public.notification_preferences to authenticated;
grant update (enabled) on public.notification_preferences to authenticated;

create policy notification_preferences_select_own on public.notification_preferences
  for select to authenticated
  using (account_id = (select auth.uid()));

create policy notification_preferences_insert_own on public.notification_preferences
  for insert to authenticated
  with check (account_id = (select auth.uid()));

create policy notification_preferences_update_own on public.notification_preferences
  for update to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));
