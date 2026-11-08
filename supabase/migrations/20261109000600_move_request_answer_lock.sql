-- Closes a race: a decline did not lock anything and neither update checked the status,
-- so an accept and a decline sent from two tabs could overwrite each other. Both functions
-- now lock the request row and only change a row that is still pending.

create or replace function public.accept_move_request(p_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.move_requests;
  l public.move_listings;
  v_buffer interval := make_interval(mins => public.move_trip_buffer_minutes());
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into r from public.move_requests where id = p_id for update;
  if not found or not public.owns_profile(r.vendor_profile_id) then
    raise exception 'We couldn''t find that.' using errcode = 'P0002';
  end if;

  -- One accept at a time per listing, so two overlapping requests cannot both win.
  select * into l from public.move_listings where id = r.listing_id for update;
  select * into r from public.move_requests where id = p_id;

  if r.status <> 'pending' then
    raise exception 'This request has already been answered.';
  end if;
  if r.respond_by < now() then
    raise exception 'This request has expired.';
  end if;
  if r.pickup_at <= now() then
    raise exception 'This trip has already started.';
  end if;
  if not public.account_is_active((select account_id from public.vendor_profiles where id = r.vendor_profile_id)) then
    raise exception 'Your account is scheduled for deletion.';
  end if;
  if l.status <> 'live' then
    raise exception 'Your listing isn''t live.';
  end if;
  if l.paused then
    raise exception 'Your listing is paused. Resume it to accept requests.';
  end if;
  if exists (
    select 1 from public.move_requests o
    where o.vendor_profile_id = r.vendor_profile_id
      and o.status = 'accepted'
      and o.id <> r.id
      and tstzrange(o.pickup_at - v_buffer, o.pickup_at + make_interval(mins => o.trip_minutes) + v_buffer)
          && tstzrange(r.pickup_at, r.pickup_at + make_interval(mins => r.trip_minutes))
  ) then
    raise exception 'This trip overlaps one you already accepted.';
  end if;

  update public.move_requests
  set status = 'accepted', responded_at = now(), vendor_note = nullif(btrim(p_note), '')
  where id = p_id and status = 'pending';
  if not found then
    raise exception 'This request has already been answered.';
  end if;
end;
$$;

create or replace function public.decline_move_request(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.move_requests;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into r from public.move_requests where id = p_id for update;
  if not found or not public.owns_profile(r.vendor_profile_id) then
    raise exception 'We couldn''t find that.' using errcode = 'P0002';
  end if;
  if p_reason is null or p_reason not in ('dates_blocked', 'too_far', 'vehicle_unavailable', 'other') then
    raise exception 'Choose a reason for declining.';
  end if;
  if r.status <> 'pending' then
    raise exception 'This request has already been answered.';
  end if;
  if r.respond_by < now() then
    raise exception 'This request has expired.';
  end if;

  update public.move_requests
  set status = 'declined', responded_at = now(), decline_reason = p_reason
  where id = p_id and status = 'pending';
  if not found then
    raise exception 'This request has already been answered.';
  end if;
end;
$$;
