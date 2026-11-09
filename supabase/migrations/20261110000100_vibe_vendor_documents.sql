-- VIBE vendors upload a business registration (required to go live) and, optionally,
-- a venue permit (earns the Trusted badge). Submitting and reviewing a vendor profile
-- now depends on its category: MOVE keeps the JTB licence and vehicle rules, VIBE needs
-- the account's government ID plus the business registration.

-- ------------------------------------------------------------ document types

alter table public.vendor_documents drop constraint vendor_documents_doc_type_check;
alter table public.vendor_documents drop constraint vendor_documents_shape;
alter table public.vendor_documents drop constraint vendor_documents_expiry;

alter table public.vendor_documents add constraint vendor_documents_doc_type_check
  check (doc_type in ('government_id', 'jtb_license', 'insurance', 'fitness',
    'business_registration', 'venue_permit'));

alter table public.vendor_documents add constraint vendor_documents_shape check (
  (doc_type = 'government_id' and vendor_profile_id is null and vehicle_id is null)
  or (doc_type in ('jtb_license', 'business_registration', 'venue_permit')
      and vendor_profile_id is not null and vehicle_id is null)
  or (doc_type in ('insurance', 'fitness') and vendor_profile_id is null and vehicle_id is not null)
);

-- Expiry is optional for the two VIBE documents.
alter table public.vendor_documents add constraint vendor_documents_expiry check (
  doc_type in ('government_id', 'business_registration', 'venue_permit') or expires_on is not null
);

create unique index vendor_documents_one_registration
  on public.vendor_documents (vendor_profile_id) where doc_type = 'business_registration';
create unique index vendor_documents_one_venue_permit
  on public.vendor_documents (vendor_profile_id) where doc_type = 'venue_permit';

-- ------------------------------------------------------------------ submit

create or replace function public.submit_vendor_profile(p_profile_id uuid)
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

  if v_profile.category = 'vibe' then
    if not exists (
      select 1 from public.vendor_documents
      where vendor_profile_id = p_profile_id and doc_type = 'business_registration'
    ) then
      v_missing := array_append(v_missing, 'Business registration'::text);
    end if;
  else
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
  end if;

  if array_length(v_missing, 1) is not null then
    raise exception 'Missing: %', array_to_string(v_missing, ', ');
  end if;

  update public.vendor_profiles
  set status = 'pending', submitted_at = now(), review_note = null
  where id = p_profile_id;
  return 'pending';
end;
$$;

-- ------------------------------------------------------------------ review

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
    if not exists (
      select 1 from public.vendor_documents
      where account_id = v_profile.account_id and doc_type = 'government_id' and verified
    ) then
      v_missing := array_append(v_missing, 'the government ID'::text);
    end if;

    if v_profile.category = 'vibe' then
      if not exists (
        select 1 from public.vendor_documents
        where vendor_profile_id = p_profile_id and doc_type = 'business_registration' and verified
      ) then
        v_missing := array_append(v_missing, 'the business registration'::text);
      end if;
    else
      select id into v_active from public.vendor_vehicles
      where vendor_profile_id = p_profile_id and is_active;

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
