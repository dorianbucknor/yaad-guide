-- MOVE booking requests. Booking (a later feature) will insert them; until then
-- development seeds them locally. Vendors answer through the two functions below
-- and cannot write the table directly.

create table public.move_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.move_listings (id) on delete cascade,
  vendor_profile_id uuid not null references public.vendor_profiles (id) on delete cascade,
  traveler_id uuid references auth.users (id) on delete set null,
  -- First name only, copied at request time, so the vendor never needs the traveler's profile.
  traveler_first_name text not null default '',
  pickup_place_id uuid not null references public.places (id) on delete restrict,
  dropoff_place_id uuid not null references public.places (id) on delete restrict,
  pickup_at timestamptz not null,
  -- Estimated trip length, used to keep accepted trips from overlapping.
  trip_minutes integer not null default 60 check (trip_minutes between 1 and 1440),
  party_size smallint not null check (party_size between 1 and 80),
  bags_large smallint not null default 0 check (bags_large between 0 and 40),
  bags_carry_on smallint not null default 0 check (bags_carry_on between 0 and 40),
  quoted_amount numeric(10, 2) check (quoted_amount >= 0),
  quoted_currency text check (quoted_currency in ('usd', 'jmd')),
  quote_source text check (quote_source in ('flat', 'formula')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired', 'completed', 'cancelled')),
  respond_by timestamptz not null,
  responded_at timestamptz,
  vendor_note text check (char_length(vendor_note) <= 300),
  decline_reason text check (decline_reason in ('dates_blocked', 'too_far', 'vehicle_unavailable', 'other')),
  created_at timestamptz not null default now(),
  check (pickup_place_id <> dropoff_place_id)
);

create index move_requests_vendor_status on public.move_requests (vendor_profile_id, status, pickup_at);
create index move_requests_traveler on public.move_requests (traveler_id);

alter table public.move_requests enable row level security;

create policy move_requests_select on public.move_requests
  for select to authenticated
  using (
    public.owns_profile(vendor_profile_id)
    or traveler_id = (select auth.uid())
    or (select public.authorize('listings.review'))
  );

revoke all on public.move_requests from anon, authenticated;
grant select on public.move_requests to authenticated;

create trigger move_requests_audit after insert or update or delete on public.move_requests
  for each row execute function public.audit_row_change();

-- --------------------------------------------------------------- settings
-- Keep in step with MOVE_CONFIG.tripBufferMinutes in src/lib/move/config.ts.

create function public.move_trip_buffer_minutes()
returns integer
language sql
immutable
set search_path = ''
as $$ select 30; $$;

-- ------------------------------------------------------- accept and decline

create function public.accept_move_request(p_id uuid, p_note text)
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

  select * into r from public.move_requests where id = p_id;
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
  where id = p_id;
end;
$$;

create function public.decline_move_request(p_id uuid, p_reason text)
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

  select * into r from public.move_requests where id = p_id;
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
  where id = p_id;
end;
$$;

-- ----------------------------------------------------------- expiry, rate

create function public.expire_move_requests()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.move_requests set status = 'expired'
  where status = 'pending' and respond_by < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Answered in time over received, last 90 days; null under five. Open requests
-- that are not yet due do not count. Vendors read their own rate; admins any.
create function public.move_response_rate(p_profile_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
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
$$;

revoke all on function public.move_trip_buffer_minutes() from public, anon;
revoke all on function public.accept_move_request(uuid, text) from public, anon;
revoke all on function public.decline_move_request(uuid, text) from public, anon;
revoke all on function public.expire_move_requests() from public, anon, authenticated;
revoke all on function public.move_response_rate(uuid) from public, anon;

grant execute on function public.move_trip_buffer_minutes() to authenticated;
grant execute on function public.accept_move_request(uuid, text) to authenticated;
grant execute on function public.decline_move_request(uuid, text) to authenticated;
grant execute on function public.expire_move_requests() to service_role;
grant execute on function public.move_response_rate(uuid) to authenticated;
