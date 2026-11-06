-- Profiles: one row per auth user. Roles live here and are mirrored into
-- auth.users.raw_app_meta_data so they appear in the JWT.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'traveler'
    check (role in ('traveler', 'vendor', 'admin')),
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  phone_verified_at timestamptz,
  profile_photo_link text,
  profile_status text not null default 'active'
    check (profile_status in ('active', 'suspended', 'deactivated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint profiles_photo_in_own_folder
    check (profile_photo_link is null or profile_photo_link like id::text || '/%')
);

alter table public.profiles enable row level security;

-- Create the profile when an auth user is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full text := nullif(trim(coalesce(v_meta ->> 'full_name', v_meta ->> 'name', '')), '');
  v_first text := nullif(trim(coalesce(v_meta ->> 'first_name', v_meta ->> 'given_name', '')), '');
  v_last text := nullif(trim(coalesce(v_meta ->> 'last_name', v_meta ->> 'family_name', '')), '');
begin
  if v_first is null and v_full is not null then
    v_first := split_part(v_full, ' ', 1);
    v_last := coalesce(
      v_last,
      nullif(trim(substr(v_full, length(split_part(v_full, ' ', 1)) + 1)), '')
    );
  end if;

  insert into public.profiles (id, first_name, last_name, phone, phone_verified_at)
  values (
    new.id,
    coalesce(v_first, ''),
    coalesce(v_last, ''),
    nullif(new.phone, ''),
    new.phone_confirmed_at
  );

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'traveler')
  where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mirror the verified phone from auth.users; clients never write these columns.
create function public.sync_profile_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set phone = nullif(new.phone, ''),
      phone_verified_at = case
        when coalesce(new.phone, '') <> '' then new.phone_confirmed_at
        else null
      end
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_phone_changed
  after update of phone, phone_confirmed_at on auth.users
  for each row
  when (old.phone is distinct from new.phone
    or old.phone_confirmed_at is distinct from new.phone_confirmed_at)
  execute function public.sync_profile_phone();

-- Keep app_metadata.role in step with profiles.role.
create function public.sync_role_to_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', new.role)
  where id = new.id;
  return new;
end;
$$;

create trigger profiles_sync_role
  after update of role on public.profiles
  for each row
  when (old.role is distinct from new.role)
  execute function public.sync_role_to_app_metadata();

-- Authoring columns are set by the database, never the client.
create function public.set_updated_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger profiles_set_updated
  before update on public.profiles
  for each row execute function public.set_updated_fields();

-- The only app path that changes a role: traveler -> vendor, for the caller.
create function public.claim_vendor_role()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.profiles
  set role = 'vendor'
  where id = auth.uid() and role = 'traveler';

  select role into v_role from public.profiles where id = auth.uid();
  return v_role;
end;
$$;

revoke all on function public.claim_vendor_role() from public, anon;
grant execute on function public.claim_vendor_role() to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_profile_phone() from public, anon, authenticated;
revoke all on function public.sync_role_to_app_metadata() from public, anon, authenticated;

-- RLS: own row, admins read all. Column grants limit what clients can write.
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, profile_photo_link)
  on public.profiles to authenticated;
