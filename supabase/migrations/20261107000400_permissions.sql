-- Permissions: roles map to named permissions, and every admin-only check asks
-- authorize(permission), which reads the caller's live role from profiles (not
-- the token), so a demoted admin loses access at once. Rows here change only
-- through migrations. Permissions for later features (listings, bookings,
-- payouts, refunds, sponsored slots, fees, reviews, users, roles) are added by
-- the migration that builds each feature.

create table public.permissions (
  key text primary key,
  description text not null
);

create table public.role_permissions (
  role text not null check (role in ('traveler', 'vendor', 'admin')),
  permission text not null references public.permissions (key) on delete cascade,
  primary key (role, permission)
);

alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
revoke all on public.permissions, public.role_permissions from anon, authenticated;

insert into public.permissions (key, description) values
  ('vendors.review', 'Read every vendor profile and vehicle; approve or reject a profile'),
  ('documents.verify', 'Read every vendor document and file; mark a document checked'),
  ('identity.reject', 'Reject an account''s government ID'),
  ('transfers.review', 'Approve or reject a vehicle transfer the owner agreed to'),
  ('audit.read', 'Read the audit log'),
  ('profiles.read_all', 'Read every user''s profile');

insert into public.role_permissions (role, permission)
  select 'admin', key from public.permissions;

create function public.authorize(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role = p.role
    where p.id = (select auth.uid()) and rp.permission = p_permission
  );
$$;

revoke all on function public.authorize(text) from public, anon;
grant execute on function public.authorize(text) to authenticated;

-- Policies that used the token's role or is_admin().
drop policy audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using (public.authorize('audit.read'));

drop policy profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.authorize('profiles.read_all'));

drop policy vendor_profiles_select on public.vendor_profiles;
create policy vendor_profiles_select on public.vendor_profiles
  for select to authenticated
  using (account_id = (select auth.uid()) or public.authorize('vendors.review'));

drop policy vendor_vehicles_select on public.vendor_vehicles;
create policy vendor_vehicles_select on public.vendor_vehicles
  for select to authenticated
  using (
    public.owns_profile(vendor_profile_id)
    or public.authorize('vendors.review')
    or public.is_transfer_party(id)
  );

drop policy vendor_documents_select on public.vendor_documents;
create policy vendor_documents_select on public.vendor_documents
  for select to authenticated
  using (
    account_id = (select auth.uid())
    or public.authorize('documents.verify')
    or public.owns_profile(coalesce(vendor_profile_id, public.vehicle_profile(vehicle_id)))
  );

drop policy vehicle_transfers_select on public.vehicle_transfers;
create policy vehicle_transfers_select on public.vehicle_transfers
  for select to authenticated
  using (
    requested_by = (select auth.uid())
    or public.owns_profile(from_profile_id)
    or public.owns_profile(to_profile_id)
    or public.authorize('transfers.review')
  );

drop policy vendor_documents_select_admin on storage.objects;
create policy vendor_documents_select_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'vendor-documents' and public.authorize('documents.verify'));

-- Functions that used is_admin().
create or replace function public.reset_document_verified()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.storage_path is distinct from old.storage_path
      or new.expires_on is distinct from old.expires_on)
     and not public.authorize('documents.verify') then
    new.verified := false;
  end if;
  return new;
end;
$$;

create or replace function public.review_vendor_profile(
  p_profile_id uuid, p_decision text, p_note text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.vendor_profiles;
  v_active uuid;
  v_missing text[] := '{}';
  v_type text;
begin
  if not public.authorize('vendors.review') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected';
  end if;
  if p_decision = 'rejected' and nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'a rejection needs a reason';
  end if;

  select * into v_profile from public.vendor_profiles where id = p_profile_id for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if v_profile.status = p_decision then
    return v_profile.status;
  end if;
  if v_profile.status <> 'pending' then
    raise exception 'only a pending profile can be reviewed';
  end if;

  if p_decision = 'approved' then
    select id into v_active from public.vendor_vehicles
    where vendor_profile_id = p_profile_id and is_active;

    if not exists (
      select 1 from public.vendor_documents
      where account_id = v_profile.account_id and doc_type = 'government_id' and verified
    ) then
      v_missing := array_append(v_missing, 'the government ID'::text);
    end if;
    if not exists (
      select 1 from public.vendor_documents
      where vendor_profile_id = p_profile_id and doc_type = 'jtb_license'
        and verified and expires_on >= current_date
    ) then
      v_missing := array_append(v_missing, 'the JTB license'::text);
    end if;
    if v_active is null then
      v_missing := array_append(v_missing, 'an active vehicle'::text);
    else
      foreach v_type in array array['insurance', 'fitness'] loop
        if not exists (
          select 1 from public.vendor_documents
          where vehicle_id = v_active and doc_type = v_type
            and verified and expires_on >= current_date
        ) then
          v_missing := array_append(v_missing, ('the ' || v_type || ' certificate')::text);
        end if;
      end loop;
    end if;

    if array_length(v_missing, 1) is not null then
      raise exception 'Check these first (checked and not expired): %',
        array_to_string(v_missing, ', ');
    end if;
  end if;

  update public.vendor_profiles
  set status = p_decision,
      review_note = nullif(trim(coalesce(p_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_profile_id;
  return p_decision;
end;
$$;

create or replace function public.verify_vendor_document(p_document_id uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.authorize('documents.verify') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.vendor_documents set verified = p_verified where id = p_document_id;
  if not found then
    raise exception 'document not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.reject_account_identity(p_account_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.authorize('identity.reject') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'a rejection needs a reason';
  end if;

  update public.vendor_profiles
  set status = 'rejected',
      review_note = trim(p_note),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where account_id = p_account_id and status in ('pending', 'approved');

  update public.vendor_documents set verified = false
  where account_id = p_account_id and doc_type = 'government_id';
end;
$$;

create or replace function public.review_vehicle_transfer(
  p_transfer_id uuid, p_decision text, p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transfer public.vehicle_transfers;
begin
  if not public.authorize('transfers.review') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected';
  end if;

  select * into v_transfer from public.vehicle_transfers where id = p_transfer_id for update;
  if not found then
    raise exception 'transfer not found' using errcode = 'P0002';
  end if;
  if v_transfer.status <> 'owner_agreed' then
    raise exception 'the current owner has not agreed to this transfer';
  end if;

  if p_decision = 'approved' then
    update public.vendor_vehicles
    set vendor_profile_id = v_transfer.to_profile_id, is_active = false
    where id = v_transfer.vehicle_id;
    -- The new owner uploads their own certificates; the old owner's files
    -- stay under the old owner's folder and are not reused.
    delete from public.vendor_documents where vehicle_id = v_transfer.vehicle_id;
  end if;

  update public.vehicle_transfers
  set status = p_decision,
      note = nullif(trim(coalesce(p_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_transfer_id;
end;
$$;

drop function public.is_admin();
