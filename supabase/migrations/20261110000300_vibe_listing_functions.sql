-- VIBE listing functions: readiness, submit and review, flags, ticket saving, and slots.
-- Every status change and every free-ticket confirmation goes through these functions;
-- vendors cannot write those columns directly.

-- ------------------------------------------------------------- readiness

create function public.vibe_listing_is_ready(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vibe_listings l
    join public.vendor_profiles p on p.id = l.vendor_profile_id
    where l.id = p_listing_id
      and p.status = 'approved'
      and coalesce(btrim(l.description), '') <> ''
      and coalesce(btrim(l.area), '') <> ''
      and coalesce(btrim(l.address_line1), '') <> ''
      and coalesce(btrim(l.town), '') <> ''
      and l.parish is not null
      and l.latitude is not null
      and l.longitude is not null
      and exists (select 1 from public.vibe_ticket_types t where t.listing_id = l.id)
      and exists (select 1 from public.vibe_photos ph where ph.listing_id = l.id and ph.is_cover)
      and (
        exists (select 1 from public.vibe_slots s
                where s.listing_id = l.id and s.status = 'open' and s.starts_at > now())
        or (l.auto_generate_slots
            and exists (select 1 from public.vibe_schedule_rules r where r.listing_id = l.id))
      )
  );
$$;

-- ------------------------------------------------------------- submit, review

create function public.submit_vibe_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.owns_vibe_listing(p_listing_id) then
    raise exception 'We couldn''t find that.' using errcode = 'P0002';
  end if;
  select status into v_status from public.vibe_listings where id = p_listing_id;
  if v_status <> 'draft' then
    raise exception 'This listing is already in review or live.';
  end if;
  if not public.vibe_listing_is_ready(p_listing_id) then
    raise exception 'Your listing isn''t ready yet. Finish the missing steps first.';
  end if;
  update public.vibe_listings set status = 'in_review' where id = p_listing_id;
end;
$$;

create function public.review_vibe_listing(p_listing_id uuid, p_decision text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
  if not exists (select 1 from public.vibe_listings where id = p_listing_id and status = 'in_review') then
    raise exception 'This listing isn''t waiting for review.';
  end if;

  if p_decision = 'approve' then
    update public.vibe_listings
    set status = 'live', approved_at = now(), reviewed_by = auth.uid(), review_note = null
    where id = p_listing_id;
  else
    update public.vibe_listings
    set status = 'draft', reviewed_by = auth.uid(), review_note = btrim(p_note)
    where id = p_listing_id;
  end if;
end;
$$;

create function public.resolve_vibe_listing_flag(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.authorize('listings.review') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  update public.vibe_listing_flags
  set resolved_at = now(), resolved_by = auth.uid()
  where id = p_id and resolved_at is null;
  if not found then
    raise exception 'We couldn''t find that.' using errcode = 'P0002';
  end if;
end;
$$;

-- ----------------------------------------------------------------- flags
-- A changed price or photo on a live listing is flagged for an admin, not unpublished.

create function public.raise_vibe_listing_flag(p_listing_id uuid, p_kind text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.vibe_listing_flags (listing_id, kind)
  select id, p_kind from public.vibe_listings where id = p_listing_id and status = 'live'
  on conflict (listing_id, kind) where resolved_at is null do nothing;
$$;

create function public.flag_vibe_ticket_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.price is not distinct from old.price
     and new.discount_percent is not distinct from old.discount_percent then
    return new;
  end if;
  perform public.raise_vibe_listing_flag(coalesce(new.listing_id, old.listing_id), 'price');
  return coalesce(new, old);
end;
$$;

create function public.flag_vibe_currency_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.raise_vibe_listing_flag(new.id, 'price');
  return new;
end;
$$;

create function public.flag_vibe_photo_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.raise_vibe_listing_flag(coalesce(new.listing_id, old.listing_id), 'photo');
  return coalesce(new, old);
end;
$$;

create trigger vibe_ticket_types_flag after insert or update or delete on public.vibe_ticket_types
  for each row execute function public.flag_vibe_ticket_change();
create trigger vibe_listings_flag_currency after update of currency on public.vibe_listings
  for each row when (new.currency is distinct from old.currency)
  execute function public.flag_vibe_currency_change();
create trigger vibe_photos_flag after insert or delete on public.vibe_photos
  for each row execute function public.flag_vibe_photo_change();

-- ------------------------------------------------------------ ticket types
-- The only way to write a ticket type, so a free ticket cannot skip its confirmation.

create function public.save_vibe_ticket_type(
  p_listing_id uuid,
  p_id uuid,
  p_name text,
  p_description text,
  p_price numeric,
  p_discount_percent numeric,
  p_max_per_booking integer,
  p_sort_order integer,
  p_confirm_free boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_confirmed timestamptz;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.owns_vibe_listing(p_listing_id) then
    raise exception 'We couldn''t find that.' using errcode = 'P0002';
  end if;

  if p_price = 0 then
    if p_id is not null then
      select free_confirmed_at into v_confirmed
      from public.vibe_ticket_types where id = p_id and listing_id = p_listing_id;
    end if;
    if v_confirmed is null then
      if not coalesce(p_confirm_free, false) then
        raise exception 'Confirm that this ticket is free.';
      end if;
      v_confirmed := now();
    end if;
  else
    v_confirmed := null;
  end if;

  if p_id is null then
    insert into public.vibe_ticket_types
      (listing_id, name, description, price, discount_percent, free_confirmed_at, max_per_booking, sort_order)
    values
      (p_listing_id, p_name, nullif(btrim(p_description), ''), p_price, p_discount_percent, v_confirmed,
       p_max_per_booking, coalesce(p_sort_order, 0))
    returning id into v_id;
  else
    update public.vibe_ticket_types
    set name = p_name,
        description = nullif(btrim(p_description), ''),
        price = p_price,
        discount_percent = p_discount_percent,
        free_confirmed_at = v_confirmed,
        max_per_booking = p_max_per_booking,
        sort_order = coalesce(p_sort_order, 0)
    where id = p_id and listing_id = p_listing_id
    returning id into v_id;
    if v_id is null then
      raise exception 'We couldn''t find that.' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

-- ----------------------------------------------------------------- slots
-- Weekly rules become bookable slots for a rolling 90 days (mirrors slotWindowDays in
-- src/lib/vibe/config.ts). Jamaica is UTC-5 all year, so America/Jamaica is exact.

create function public.generate_vibe_slots_for(p_listing_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auto boolean;
  v_today date;
  v_count integer;
begin
  select auto_generate_slots into v_auto from public.vibe_listings where id = p_listing_id;
  if not found or not v_auto then
    return 0;
  end if;

  -- Booked and hand-edited slots are never touched.
  delete from public.vibe_slots
  where listing_id = p_listing_id and source = 'rule' and booked = 0 and not edited and starts_at > now();

  v_today := (now() at time zone 'America/Jamaica')::date;

  insert into public.vibe_slots (listing_id, starts_at, capacity, source)
  select p_listing_id,
         (g.d + r.start_minutes * interval '1 minute') at time zone 'America/Jamaica',
         r.capacity,
         'rule'
  from public.vibe_schedule_rules r
  cross join generate_series(v_today::timestamp, (v_today + 90)::timestamp, interval '1 day') as g(d)
  where r.listing_id = p_listing_id
    and extract(dow from g.d) = r.weekday
    and (r.valid_from is null or g.d::date >= r.valid_from)
    and (r.valid_until is null or g.d::date <= r.valid_until)
    and not exists (
      select 1 from public.vibe_blocked_dates b where b.listing_id = p_listing_id and b.day = g.d::date)
    and (g.d + r.start_minutes * interval '1 minute') at time zone 'America/Jamaica' > now()
  on conflict (listing_id, starts_at) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function public.generate_vibe_slots(p_listing_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if not public.owns_vibe_listing(p_listing_id) then
      raise exception 'We couldn''t find that.' using errcode = 'P0002';
    end if;
  elsif coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  return public.generate_vibe_slots_for(p_listing_id);
end;
$$;

-- The daily job: extends the window for every live listing.
create function public.generate_all_vibe_slots()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing record;
  v_total integer := 0;
begin
  for v_listing in
    select id from public.vibe_listings where status = 'live' and auto_generate_slots and not paused
  loop
    v_total := v_total + public.generate_vibe_slots_for(v_listing.id);
  end loop;
  return v_total;
end;
$$;

create function public.regenerate_vibe_slots_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.generate_vibe_slots_for(coalesce(new.listing_id, old.listing_id));
  return coalesce(new, old);
end;
$$;

create function public.regenerate_vibe_slots_on_enable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.generate_vibe_slots_for(new.id);
  return new;
end;
$$;

create trigger vibe_schedule_rules_generate after insert or update or delete on public.vibe_schedule_rules
  for each row execute function public.regenerate_vibe_slots_trigger();
create trigger vibe_listings_generate after update of auto_generate_slots on public.vibe_listings
  for each row when (new.auto_generate_slots and not old.auto_generate_slots)
  execute function public.regenerate_vibe_slots_on_enable();

-- Removes the unbooked slots that rules created (past ones stay).
create function public.clear_vibe_auto_slots(p_listing_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.owns_vibe_listing(p_listing_id) then
    raise exception 'We couldn''t find that.' using errcode = 'P0002';
  end if;
  delete from public.vibe_slots
  where listing_id = p_listing_id and source = 'rule' and booked = 0 and starts_at > now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Closes or reopens every slot on one Jamaica day. A day with bookings cannot be closed.
create function public.set_vibe_date_closed(p_listing_id uuid, p_day date, p_closed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from timestamptz := p_day::timestamp at time zone 'America/Jamaica';
  v_to timestamptz := (p_day + 1)::timestamp at time zone 'America/Jamaica';
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.owns_vibe_listing(p_listing_id) then
    raise exception 'We couldn''t find that.' using errcode = 'P0002';
  end if;

  if p_closed then
    if exists (select 1 from public.vibe_slots
               where listing_id = p_listing_id and starts_at >= v_from and starts_at < v_to and booked > 0) then
      raise exception 'This day has bookings, so it can''t be closed.';
    end if;
    insert into public.vibe_blocked_dates (listing_id, day) values (p_listing_id, p_day)
    on conflict (listing_id, day) do nothing;
  else
    delete from public.vibe_blocked_dates where listing_id = p_listing_id and day = p_day;
  end if;

  update public.vibe_slots
  set status = case when p_closed then 'closed' else 'open' end
  where listing_id = p_listing_id and starts_at >= v_from and starts_at < v_to;
end;
$$;

-- ---------------------------------------------------------------- grants

revoke all on function public.vibe_listing_is_ready(uuid) from public, anon;
revoke all on function public.submit_vibe_listing(uuid) from public, anon;
revoke all on function public.review_vibe_listing(uuid, text, text) from public, anon;
revoke all on function public.resolve_vibe_listing_flag(uuid) from public, anon;
revoke all on function public.save_vibe_ticket_type(uuid, uuid, text, text, numeric, numeric, integer, integer, boolean)
  from public, anon;
revoke all on function public.generate_vibe_slots(uuid) from public, anon;
revoke all on function public.clear_vibe_auto_slots(uuid) from public, anon;
revoke all on function public.set_vibe_date_closed(uuid, date, boolean) from public, anon;

grant execute on function public.vibe_listing_is_ready(uuid) to authenticated;
grant execute on function public.submit_vibe_listing(uuid) to authenticated;
grant execute on function public.review_vibe_listing(uuid, text, text) to authenticated;
grant execute on function public.resolve_vibe_listing_flag(uuid) to authenticated;
grant execute on function public.save_vibe_ticket_type(uuid, uuid, text, text, numeric, numeric, integer, integer, boolean)
  to authenticated;
grant execute on function public.generate_vibe_slots(uuid) to authenticated, service_role;
grant execute on function public.clear_vibe_auto_slots(uuid) to authenticated;
grant execute on function public.set_vibe_date_closed(uuid, date, boolean) to authenticated;

-- Internal helpers and triggers: nobody calls these directly.
revoke all on function public.raise_vibe_listing_flag(uuid, text) from public, anon, authenticated;
revoke all on function public.flag_vibe_ticket_change() from public, anon, authenticated;
revoke all on function public.flag_vibe_currency_change() from public, anon, authenticated;
revoke all on function public.flag_vibe_photo_change() from public, anon, authenticated;
revoke all on function public.generate_vibe_slots_for(uuid) from public, anon, authenticated;
revoke all on function public.regenerate_vibe_slots_trigger() from public, anon, authenticated;
revoke all on function public.regenerate_vibe_slots_on_enable() from public, anon, authenticated;

-- The daily job runs with the service role only.
revoke all on function public.generate_all_vibe_slots() from public, anon, authenticated;
grant execute on function public.generate_all_vibe_slots() to service_role;
