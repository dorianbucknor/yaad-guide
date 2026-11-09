SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.account_is_active (
  p_account_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select not exists (
    select 1 from public.profiles
    where id = p_account_id and profile_status = 'archived'
  );
$function$;

CREATE OR REPLACE FUNCTION public.account_unlocked (
  p_account_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select p_account_id = (select auth.uid())
    and not exists (
      select 1 from public.vendor_profiles
      where account_id = p_account_id and status = 'pending'
    );
$function$;

CREATE OR REPLACE FUNCTION public.accounts_due_for_purge (
  p_older_than interval
)
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select id from public.profiles
  where profile_status = 'archived' and archived_at < now() - p_older_than;
$function$;

CREATE OR REPLACE FUNCTION public.archive_account()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.audit_row_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_old jsonb;
  v_new jsonb;
  v_id text;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_id := old.id::text;
  elsif tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_id := new.id::text;
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_id := new.id::text;
  end if;

  insert into public.audit_log (table_name, row_id, action, actor_id, old_values, new_values)
  values (tg_table_name, v_id, tg_op, auth.uid(), v_old, v_new);

  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.authorize (
  p_permission text
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role = p.role
    where p.id = (select auth.uid()) and rp.permission = p_permission
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_add_to_profile (
  p_profile_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.vendor_profiles
    where id = p_profile_id
      and account_id = (select auth.uid())
      and status in ('draft', 'rejected', 'approved')
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_edit_profile (
  p_profile_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.vendor_profiles
    where id = p_profile_id
      and account_id = (select auth.uid())
      and status in ('draft', 'rejected')
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_write_document (
  p_account_id uuid,
  p_doc_type   text,
  p_profile_id uuid,
  p_vehicle_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select p_account_id = (select auth.uid())
    and case p_doc_type
      when 'government_id' then public.account_unlocked(p_account_id)
      when 'jtb_license' then public.can_add_to_profile(p_profile_id)
      else public.can_add_to_profile(public.vehicle_profile(p_vehicle_id))
    end;
$function$;

CREATE OR REPLACE FUNCTION public.cap_vehicle_photos()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if (select count(*) from public.vehicle_photos where vehicle_id = new.vehicle_id) >= 8 then
    raise exception 'A vehicle can have up to 8 photos.';
  end if;
  if new.kind = 'extra'
     and (select count(*) from public.vehicle_photos
          where vehicle_id = new.vehicle_id and kind = 'extra') >= 4 then
    raise exception 'You can add up to 4 extra photos.';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_vendor_role()
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.drop_rates_for_removed_place()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  delete from public.move_flat_rates
  where listing_id = old.listing_id
    and (place_a_id = old.place_id or place_b_id = old.place_id);
  return old;
end;
$function$;

CREATE OR REPLACE FUNCTION public.expire_move_requests()
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_count integer;
begin
  update public.move_requests set status = 'expired'
  where status = 'pending' and respond_by < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.flag_flat_rate_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  perform public.raise_listing_flag(coalesce(new.listing_id, old.listing_id), 'price');
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.flag_formula_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if new.base_fare is distinct from old.base_fare
     or new.per_km is distinct from old.per_km
     or new.hourly_rate is distinct from old.hourly_rate
     or new.currency is distinct from old.currency then
    perform public.raise_listing_flag(new.id, 'price');
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.flag_photo_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_vehicle uuid := coalesce(new.vehicle_id, old.vehicle_id);
begin
  perform public.raise_listing_flag(l.id, 'photo')
  from public.vendor_vehicles v
  join public.move_listings l on l.vendor_profile_id = v.vendor_profile_id
  where v.id = v_vehicle;
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.is_transfer_party (
  p_vehicle_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.vehicle_transfers t
    where t.vehicle_id = p_vehicle_id
      and t.status in ('requested', 'owner_agreed')
      and (t.requested_by = (select auth.uid())
           or public.owns_profile(t.from_profile_id)
           or public.owns_profile(t.to_profile_id))
  );
$function$;

CREATE OR REPLACE FUNCTION public.listing_is_ready (
  p_listing_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.move_listings l
    join public.vendor_profiles p on p.id = l.vendor_profile_id
    join public.profiles pr on pr.id = p.account_id
    where l.id = p_listing_id
      and p.status = 'approved'
      and p.photo_verified_at is not null
      and pr.profile_photo_link is not null
      and exists (
        select 1 from public.vendor_vehicles v
        where v.vendor_profile_id = p.id
          and v.is_active
          and v.luggage_large + v.luggage_carry_on > 0
          and (select count(distinct ph.kind) from public.vehicle_photos ph
               where ph.vehicle_id = v.id
                 and ph.kind in ('front', 'rear', 'interior', 'luggage')) = 4
      )
      and (l.island_wide or exists (
        select 1 from public.move_listing_places lp where lp.listing_id = l.id))
      and (exists (select 1 from public.move_flat_rates fr where fr.listing_id = l.id)
           or (l.base_fare is not null and l.per_km is not null))
      and exists (select 1 from public.move_availability_rules r where r.listing_id = l.id)
  );
$function$;

CREATE OR REPLACE FUNCTION public.move_response_rate (
  p_profile_id uuid
)
  RETURNS numeric
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_received integer;
  v_in_time integer;
begin
  if not (public.owns_profile(p_profile_id) or public.authorize('listings.review')) then
    return null;
  end if;

  select count(*), count(*) filter (where responded_at is not null and responded_at <= respond_by)
  into v_received, v_in_time
  from public.move_requests
  where vendor_profile_id = p_profile_id
    and created_at >= now() - interval '90 days'
    and (status <> 'pending' or respond_by < now());

  if v_received < 5 then
    return null;
  end if;
  return round(v_in_time::numeric / v_received, 4);
end;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_vendor_plate()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.plate := upper(regexp_replace(new.plate, '[^A-Za-z0-9]', '', 'g'));
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.owns_listing (
  p_listing_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.move_listings l
    join public.vendor_profiles p on p.id = l.vendor_profile_id
    where l.id = p_listing_id and p.account_id = (select auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.owns_profile (
  p_profile_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.vendor_profiles
    where id = p_profile_id and account_id = (select auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION public.profile_photo_changed()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if new.profile_photo_link is distinct from old.profile_photo_link then
    update public.vendor_profiles set photo_verified_at = null where account_id = new.id;
    perform public.raise_listing_flag(l.id, 'profile_photo')
    from public.vendor_profiles p
    join public.move_listings l on l.vendor_profile_id = p.id
    where p.account_id = new.id;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.raise_listing_flag (
  p_listing_id uuid,
  p_kind       text
)
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  insert into public.listing_flags (listing_id, kind)
  select id, p_kind from public.move_listings where id = p_listing_id and status = 'live'
  on conflict (listing_id, kind) where resolved_at is null do nothing;
$function$;

CREATE OR REPLACE FUNCTION public.reject_account_identity (
  p_account_id uuid,
  p_note       text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.request_vehicle_transfer (
  p_plate text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_uid uuid := auth.uid();
  v_plate text := upper(regexp_replace(coalesce(p_plate, ''), '[^A-Za-z0-9]', '', 'g'));
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
$function$;

CREATE OR REPLACE FUNCTION public.require_covered_places()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not exists (select 1 from public.move_listings where id = new.listing_id and island_wide)
     and (select count(*) from public.move_listing_places
          where listing_id = new.listing_id
            and place_id in (new.place_a_id, new.place_b_id)) < 2 then
    raise exception 'Add both places to your coverage before setting a rate between them.';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.require_move_profile()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not exists (
    select 1 from public.vendor_profiles
    where id = new.vendor_profile_id and category = 'move'
  ) then
    raise exception 'Only a MOVE vendor profile can have a MOVE listing.';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reset_document_verified()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if (new.storage_path is distinct from old.storage_path
      or new.expires_on is distinct from old.expires_on)
     and not public.authorize('documents.verify') then
    new.verified := false;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_listing_flag (
  p_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.authorize('listings.review') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  update public.listing_flags
  set resolved_at = now(), resolved_by = auth.uid()
  where id = p_id and resolved_at is null;
  if not found then
    raise exception 'We couldn''t find that.' using errcode = 'P0002';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.respond_vehicle_transfer (
  p_transfer_id uuid,
  p_agree       boolean
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.restore_account()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.review_listing (
  p_listing_id uuid,
  p_decision   text,
  p_note       text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.authorize('listings.review') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if p_decision not in ('approve', 'reject') then
    raise exception 'Choose approve or reject.';
  end if;
  if p_decision = 'reject' and coalesce(btrim(p_note), '') = '' then
    raise exception 'Add a note explaining what to fix.';
  end if;
  if not exists (select 1 from public.move_listings where id = p_listing_id and status = 'in_review') then
    raise exception 'This listing isn''t waiting for review.';
  end if;

  if p_decision = 'approve' then
    update public.move_listings
    set status = 'live', approved_at = now(), reviewed_by = auth.uid(), review_note = null
    where id = p_listing_id;
  else
    update public.move_listings
    set status = 'draft', reviewed_by = auth.uid(), review_note = btrim(p_note)
    where id = p_listing_id;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.review_vehicle_transfer (
  p_transfer_id uuid,
  p_decision    text,
  p_note        text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_vehicle_luggage (
  p_vehicle_id uuid,
  p_large      integer,
  p_carry_on   integer
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.can_add_to_profile(public.vehicle_profile(p_vehicle_id)) then
    raise exception 'We couldn''t find that.' using errcode = 'P0002';
  end if;
  if p_large not between 0 and 20 or p_carry_on not between 0 and 20 then
    raise exception 'Luggage counts must be between 0 and 20.';
  end if;
  update public.vendor_vehicles
  set luggage_large = p_large, luggage_carry_on = p_carry_on
  where id = p_vehicle_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.scrub_audit_for_account (
  p_account_id uuid
)
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  update public.audit_log
  set old_values = null, new_values = null
  where (table_name = 'profiles' and row_id = p_account_id::text)
     or (table_name in ('vendor_profiles', 'vendor_documents')
         and (old_values ->> 'account_id' = p_account_id::text
              or new_values ->> 'account_id' = p_account_id::text))
     or (table_name = 'vendor_vehicles'
         and coalesce(old_values ->> 'vendor_profile_id', new_values ->> 'vendor_profile_id') in (
           select row_id from public.audit_log
           where table_name = 'vendor_profiles'
             and (old_values ->> 'account_id' = p_account_id::text
                  or new_values ->> 'account_id' = p_account_id::text)
           union
           select id::text from public.vendor_profiles where account_id = p_account_id));
$function$;

CREATE OR REPLACE FUNCTION public.set_active_vehicle (
  p_vehicle_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_fields()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_listing_for_review (
  p_listing_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.owns_listing(p_listing_id) then
    raise exception 'We couldn''t find that.' using errcode = 'P0002';
  end if;
  select status into v_status from public.move_listings where id = p_listing_id;
  if v_status <> 'draft' then
    raise exception 'This listing is already in review or live.';
  end if;
  if not public.listing_is_ready(p_listing_id) then
    raise exception 'Your listing isn''t ready yet. Finish the missing steps first.';
  end if;
  update public.move_listings set status = 'in_review' where id = p_listing_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_archived_to_app_metadata()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('archived', new.profile_status = 'archived')
  where id = new.id;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_profile_phone()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_role_to_app_metadata()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', new.role)
  where id = new.id;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.vehicle_profile (
  p_vehicle_id uuid
)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select vendor_profile_id from public.vendor_vehicles where id = p_vehicle_id;
$function$;

CREATE OR REPLACE FUNCTION public.verify_profile_photo (
  p_profile_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.authorize('documents.verify') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  update public.vendor_profiles set photo_verified_at = now() where id = p_profile_id;
  if not found then
    raise exception 'We couldn''t find that.' using errcode = 'P0002';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.verify_vendor_document (
  p_document_id uuid,
  p_verified    boolean
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.authorize('documents.verify') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.vendor_documents set verified = p_verified where id = p_document_id;
  if not found then
    raise exception 'document not found' using errcode = 'P0002';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.withdraw_vehicle_transfer (
  p_transfer_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "service_role";

