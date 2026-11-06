-- The only write paths for vendor status, review, activation, verification
-- and transfers. Each function checks the caller itself.

-- Submit a draft or rejected profile for review.
create function public.submit_vendor_profile(p_profile_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.vendor_profiles;
  v_missing text[] := '{}';
  v_vehicle record;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_profile from public.vendor_profiles
  where id = p_profile_id and account_id = v_uid
  for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if v_profile.status = 'pending' then
    return 'pending';
  end if;
  if v_profile.status = 'approved' then
    raise exception 'profile is already approved';
  end if;

  if not exists (
    select 1 from public.vendor_documents
    where account_id = v_uid and doc_type = 'government_id'
  ) then
    v_missing := array_append(v_missing, 'Government ID'::text);
  end if;

  select count(*) into v_count from public.vendor_documents
  where vendor_profile_id = p_profile_id and doc_type = 'jtb_license';
  if v_count = 0 then
    v_missing := array_append(v_missing, 'JTB license'::text);
  elsif exists (
    select 1 from public.vendor_documents
    where vendor_profile_id = p_profile_id and doc_type = 'jtb_license'
      and expires_on < current_date
  ) then
    v_missing := array_append(v_missing, 'JTB license (expired)'::text);
  end if;

  select count(*) into v_count from public.vendor_vehicles
  where vendor_profile_id = p_profile_id;
  if v_count = 0 then
    v_missing := array_append(v_missing, 'A vehicle'::text);
  elsif not exists (
    select 1 from public.vendor_vehicles
    where vendor_profile_id = p_profile_id and is_active
  ) then
    v_missing := array_append(v_missing, 'An active vehicle'::text);
  end if;

  for v_vehicle in
    select id, plate from public.vendor_vehicles where vendor_profile_id = p_profile_id
  loop
    if not exists (
      select 1 from public.vendor_documents
      where vehicle_id = v_vehicle.id and doc_type = 'insurance'
    ) then
      v_missing := array_append(v_missing, ('Insurance certificate for ' || v_vehicle.plate)::text);
    elsif exists (
      select 1 from public.vendor_documents
      where vehicle_id = v_vehicle.id and doc_type = 'insurance' and expires_on < current_date
    ) then
      v_missing := array_append(v_missing, ('Insurance certificate for ' || v_vehicle.plate || ' (expired)')::text);
    end if;

    if not exists (
      select 1 from public.vendor_documents
      where vehicle_id = v_vehicle.id and doc_type = 'fitness'
    ) then
      v_missing := array_append(v_missing, ('Fitness certificate for ' || v_vehicle.plate)::text);
    elsif exists (
      select 1 from public.vendor_documents
      where vehicle_id = v_vehicle.id and doc_type = 'fitness' and expires_on < current_date
    ) then
      v_missing := array_append(v_missing, ('Fitness certificate for ' || v_vehicle.plate || ' (expired)')::text);
    end if;
  end loop;

  if array_length(v_missing, 1) is not null then
    raise exception 'Missing: %', array_to_string(v_missing, ', ');
  end if;

  update public.vendor_profiles
  set status = 'pending', submitted_at = now(), review_note = null
  where id = p_profile_id;
  return 'pending';
end;
$$;

-- Admin decision on a pending profile.
create function public.review_vendor_profile(
  p_profile_id uuid, p_decision text, p_note text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.vendor_profiles;
begin
  if not public.is_admin() then
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

  update public.vendor_profiles
  set status = p_decision,
      review_note = nullif(trim(coalesce(p_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_profile_id;
  return p_decision;
end;
$$;

-- Switch the active vehicle. A first-time (draft or rejected) profile needs the
-- certificates present and unexpired; an approved profile also needs them verified.
create function public.set_active_vehicle(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.vendor_profiles;
  v_vehicle public.vendor_vehicles;
  v_type text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_vehicle from public.vendor_vehicles where id = p_vehicle_id;
  if not found then
    raise exception 'vehicle not found' using errcode = 'P0002';
  end if;

  select * into v_profile from public.vendor_profiles
  where id = v_vehicle.vendor_profile_id and account_id = v_uid
  for update;
  if not found then
    raise exception 'vehicle not found' using errcode = 'P0002';
  end if;
  if v_profile.status = 'pending' then
    raise exception 'the profile is locked while it is under review';
  end if;
  if exists (
    select 1 from public.vehicle_transfers
    where vehicle_id = p_vehicle_id and status in ('requested', 'owner_agreed')
  ) then
    raise exception 'the vehicle has an open transfer request';
  end if;

  foreach v_type in array array['insurance', 'fitness'] loop
    if not exists (
      select 1 from public.vendor_documents
      where vehicle_id = p_vehicle_id and doc_type = v_type
        and expires_on >= current_date
        and (verified or v_profile.status <> 'approved')
    ) then
      raise exception 'the % certificate must be present, unexpired and verified', v_type;
    end if;
  end loop;

  update public.vendor_vehicles set is_active = false
  where vendor_profile_id = v_vehicle.vendor_profile_id and is_active and id <> p_vehicle_id;
  update public.vendor_vehicles set is_active = true where id = p_vehicle_id;
end;
$$;

create function public.verify_vendor_document(p_document_id uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.vendor_documents set verified = p_verified where id = p_document_id;
  if not found then
    raise exception 'document not found' using errcode = 'P0002';
  end if;
end;
$$;

-- A rejected government ID rejects every submitted profile of the account.
create function public.reject_account_identity(p_account_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
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

-- The caller's MOVE profile asks to take over the vehicle with this plate.
create function public.request_vehicle_transfer(p_plate text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_plate text := upper(regexp_replace(trim(coalesce(p_plate, '')), '\s+', '', 'g'));
  v_to uuid;
  v_vehicle public.vendor_vehicles;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select id into v_to from public.vendor_profiles
  where account_id = v_uid and category = 'move';
  if v_to is null then
    raise exception 'create your MOVE profile first';
  end if;

  select * into v_vehicle from public.vendor_vehicles where plate = v_plate;
  if not found then
    raise exception 'no vehicle with that plate is registered';
  end if;
  if v_vehicle.vendor_profile_id = v_to then
    raise exception 'you already own this vehicle';
  end if;
  if exists (
    select 1 from public.vehicle_transfers
    where vehicle_id = v_vehicle.id and status in ('requested', 'owner_agreed')
  ) then
    raise exception 'a transfer for this vehicle is already open';
  end if;

  insert into public.vehicle_transfers (vehicle_id, from_profile_id, to_profile_id, requested_by)
  values (v_vehicle.id, v_vehicle.vendor_profile_id, v_to, v_uid)
  returning id into v_id;
  return v_id;
end;
$$;

-- The current owner agrees or declines, once.
create function public.respond_vehicle_transfer(p_transfer_id uuid, p_agree boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transfer public.vehicle_transfers;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_transfer from public.vehicle_transfers where id = p_transfer_id for update;
  if not found then
    raise exception 'transfer not found' using errcode = 'P0002';
  end if;
  if not public.owns_profile(v_transfer.from_profile_id) then
    raise exception 'only the current owner can answer this request' using errcode = '42501';
  end if;
  if v_transfer.status <> 'requested' then
    raise exception 'this request was already answered';
  end if;

  update public.vehicle_transfers
  set status = case when p_agree then 'owner_agreed' else 'owner_declined' end,
      owner_responded_at = now()
  where id = p_transfer_id;
end;
$$;

-- The requester cancels an open request. The row is removed; the audit log keeps it.
create function public.withdraw_vehicle_transfer(p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transfer public.vehicle_transfers;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_transfer from public.vehicle_transfers where id = p_transfer_id for update;
  if not found then
    raise exception 'transfer not found' using errcode = 'P0002';
  end if;
  if v_transfer.requested_by <> auth.uid() then
    raise exception 'only the requester can withdraw' using errcode = '42501';
  end if;
  if v_transfer.status not in ('requested', 'owner_agreed') then
    raise exception 'this request is already closed';
  end if;

  delete from public.vehicle_transfers where id = p_transfer_id;
end;
$$;

-- Admin decision on a transfer the current owner agreed to.
create function public.review_vehicle_transfer(
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
  if not public.is_admin() then
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
    update public.vendor_documents set verified = false
    where vehicle_id = v_transfer.vehicle_id;
  end if;

  update public.vehicle_transfers
  set status = p_decision,
      note = nullif(trim(coalesce(p_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_transfer_id;
end;
$$;

revoke all on function
  public.submit_vendor_profile(uuid),
  public.review_vendor_profile(uuid, text, text),
  public.set_active_vehicle(uuid),
  public.verify_vendor_document(uuid, boolean),
  public.reject_account_identity(uuid, text),
  public.request_vehicle_transfer(text),
  public.respond_vehicle_transfer(uuid, boolean),
  public.withdraw_vehicle_transfer(uuid),
  public.review_vehicle_transfer(uuid, text, text)
  from public, anon;
grant execute on function
  public.submit_vendor_profile(uuid),
  public.review_vendor_profile(uuid, text, text),
  public.set_active_vehicle(uuid),
  public.verify_vendor_document(uuid, boolean),
  public.reject_account_identity(uuid, text),
  public.request_vehicle_transfer(text),
  public.respond_vehicle_transfer(uuid, boolean),
  public.withdraw_vehicle_transfer(uuid),
  public.review_vehicle_transfer(uuid, text, text)
  to authenticated;
