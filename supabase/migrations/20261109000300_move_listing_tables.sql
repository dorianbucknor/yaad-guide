-- MOVE listing: one listing per MOVE vendor profile, with coverage, flat rates,
-- weekly windows, blocked ranges, vehicle photos and review flags.
-- Status, review and verification columns are written only by the functions in
-- the next migration. Row-level security everywhere.

-- ------------------------------------------------------------ alterations

alter table public.vendor_vehicles
  add column luggage_large smallint not null default 0 check (luggage_large between 0 and 20),
  add column luggage_carry_on smallint not null default 0 check (luggage_carry_on between 0 and 20);

-- Set by an admin only (function in the next migration); not in any grant.
alter table public.vendor_profiles add column photo_verified_at timestamptz;

-- ---------------------------------------------------------------- tables

create table public.move_listings (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null unique references public.vendor_profiles (id) on delete cascade,
  currency text not null default 'usd' check (currency in ('usd', 'jmd')),
  island_wide boolean not null default false,
  base_fare numeric(10, 2) check (base_fare >= 0),
  per_km numeric(8, 2) check (per_km >= 0),
  hourly_rate numeric(10, 2) check (hourly_rate >= 0),
  description text check (char_length(description) <= 500),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'live')),
  paused boolean not null default false,
  approved_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table public.move_listing_places (
  listing_id uuid not null references public.move_listings (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete restrict,
  primary key (listing_id, place_id)
);

-- A flat rate applies in both directions; the pair is stored in id order.
create table public.move_flat_rates (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.move_listings (id) on delete cascade,
  place_a_id uuid not null references public.places (id) on delete restrict,
  place_b_id uuid not null references public.places (id) on delete restrict,
  price numeric(10, 2) not null check (price > 0),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  check (place_a_id < place_b_id),
  unique (listing_id, place_a_id, place_b_id)
);

-- Windows are Jamaica local time, in minutes since midnight (0 to 1440).
create table public.move_availability_rules (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.move_listings (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_minutes smallint not null check (start_minutes between 0 and 1439),
  end_minutes smallint not null check (end_minutes between 1 and 1440),
  created_at timestamptz not null default now(),
  check (end_minutes > start_minutes),
  unique (listing_id, weekday, start_minutes)
);

create table public.move_blocked_ranges (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.move_listings (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vendor_vehicles (id) on delete cascade,
  kind text not null check (kind in ('front', 'rear', 'interior', 'luggage', 'extra')),
  storage_path text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  -- The file sits in a folder named for the vehicle, never above it.
  check (storage_path like '%/' || vehicle_id::text || '/%' and storage_path not like '%..%')
);

-- The four required kinds appear once per vehicle; extras can repeat.
create unique index vehicle_photos_one_per_kind
  on public.vehicle_photos (vehicle_id, kind) where kind <> 'extra';

create table public.listing_flags (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.move_listings (id) on delete cascade,
  kind text not null check (kind in ('price', 'photo', 'profile_photo')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

create unique index listing_flags_one_open_per_kind
  on public.listing_flags (listing_id, kind) where resolved_at is null;

alter table public.move_listings enable row level security;
alter table public.move_listing_places enable row level security;
alter table public.move_flat_rates enable row level security;
alter table public.move_availability_rules enable row level security;
alter table public.move_blocked_ranges enable row level security;
alter table public.vehicle_photos enable row level security;
alter table public.listing_flags enable row level security;

-- -------------------------------------------------------- policy helpers

create function public.owns_listing(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.move_listings l
    join public.vendor_profiles p on p.id = l.vendor_profile_id
    where l.id = p_listing_id and p.account_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_listing(uuid) from public, anon;
grant execute on function public.owns_listing(uuid) to authenticated;

-- ------------------------------------------------------------- triggers

create function public.require_move_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.vendor_profiles
    where id = new.vendor_profile_id and category = 'move'
  ) then
    raise exception 'Only a MOVE vendor profile can have a MOVE listing.';
  end if;
  return new;
end;
$$;

-- Both places of a flat rate must be covered, unless the listing is island-wide.
create function public.require_covered_places()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.move_listings where id = new.listing_id and island_wide)
     and (select count(*) from public.move_listing_places
          where listing_id = new.listing_id
            and place_id in (new.place_a_id, new.place_b_id)) < 2 then
    raise exception 'Add both places to your coverage before setting a rate between them.';
  end if;
  return new;
end;
$$;

-- Dropping a place from coverage drops the flat rates that use it.
create function public.drop_rates_for_removed_place()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.move_flat_rates
  where listing_id = old.listing_id
    and (place_a_id = old.place_id or place_b_id = old.place_id);
  return old;
end;
$$;

revoke all on function public.require_move_profile() from public, anon, authenticated;
revoke all on function public.require_covered_places() from public, anon, authenticated;
revoke all on function public.drop_rates_for_removed_place() from public, anon, authenticated;

create trigger move_listings_require_move_profile before insert on public.move_listings
  for each row execute function public.require_move_profile();
create trigger move_flat_rates_require_covered before insert or update of place_a_id, place_b_id
  on public.move_flat_rates for each row execute function public.require_covered_places();
create trigger move_listing_places_drop_rates after delete on public.move_listing_places
  for each row execute function public.drop_rates_for_removed_place();

create trigger move_listings_set_updated before update on public.move_listings
  for each row execute function public.set_updated_fields();
create trigger move_flat_rates_set_updated before update on public.move_flat_rates
  for each row execute function public.set_updated_fields();

create trigger move_listings_audit after insert or update or delete on public.move_listings
  for each row execute function public.audit_row_change();
create trigger move_flat_rates_audit after insert or update or delete on public.move_flat_rates
  for each row execute function public.audit_row_change();
create trigger vehicle_photos_audit after insert or update or delete on public.vehicle_photos
  for each row execute function public.audit_row_change();
create trigger listing_flags_audit after insert or update or delete on public.listing_flags
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------- vehicle luggage
-- The vehicle update policy locks approved profiles, so luggage capacity (which
-- an approved vendor must be able to set) goes through this function.

create function public.save_vehicle_luggage(p_vehicle_id uuid, p_large integer, p_carry_on integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke all on function public.save_vehicle_luggage(uuid, integer, integer) from public, anon;
grant execute on function public.save_vehicle_luggage(uuid, integer, integer) to authenticated;

-- ------------------------------------------------------------- policies

create policy move_listings_select on public.move_listings
  for select to authenticated
  using (public.owns_listing(id) or (select public.authorize('listings.review')));
create policy move_listings_insert on public.move_listings
  for insert to authenticated with check (public.owns_profile(vendor_profile_id));
create policy move_listings_update on public.move_listings
  for update to authenticated
  using (public.owns_listing(id)) with check (public.owns_listing(id));

create policy move_listing_places_select on public.move_listing_places
  for select to authenticated
  using (public.owns_listing(listing_id) or (select public.authorize('listings.review')));
create policy move_listing_places_insert on public.move_listing_places
  for insert to authenticated with check (public.owns_listing(listing_id));
create policy move_listing_places_delete on public.move_listing_places
  for delete to authenticated using (public.owns_listing(listing_id));

create policy move_flat_rates_select on public.move_flat_rates
  for select to authenticated
  using (public.owns_listing(listing_id) or (select public.authorize('listings.review')));
create policy move_flat_rates_insert on public.move_flat_rates
  for insert to authenticated with check (public.owns_listing(listing_id));
create policy move_flat_rates_update on public.move_flat_rates
  for update to authenticated
  using (public.owns_listing(listing_id)) with check (public.owns_listing(listing_id));
create policy move_flat_rates_delete on public.move_flat_rates
  for delete to authenticated using (public.owns_listing(listing_id));

create policy move_availability_rules_select on public.move_availability_rules
  for select to authenticated
  using (public.owns_listing(listing_id) or (select public.authorize('listings.review')));
create policy move_availability_rules_insert on public.move_availability_rules
  for insert to authenticated with check (public.owns_listing(listing_id));
create policy move_availability_rules_update on public.move_availability_rules
  for update to authenticated
  using (public.owns_listing(listing_id)) with check (public.owns_listing(listing_id));
create policy move_availability_rules_delete on public.move_availability_rules
  for delete to authenticated using (public.owns_listing(listing_id));

create policy move_blocked_ranges_select on public.move_blocked_ranges
  for select to authenticated
  using (public.owns_listing(listing_id) or (select public.authorize('listings.review')));
create policy move_blocked_ranges_insert on public.move_blocked_ranges
  for insert to authenticated with check (public.owns_listing(listing_id));
create policy move_blocked_ranges_update on public.move_blocked_ranges
  for update to authenticated
  using (public.owns_listing(listing_id)) with check (public.owns_listing(listing_id));
create policy move_blocked_ranges_delete on public.move_blocked_ranges
  for delete to authenticated using (public.owns_listing(listing_id));

create policy vehicle_photos_select on public.vehicle_photos
  for select to authenticated
  using (
    public.owns_profile(public.vehicle_profile(vehicle_id))
    or (select public.authorize('listings.review'))
  );
create policy vehicle_photos_insert on public.vehicle_photos
  for insert to authenticated
  with check (public.can_add_to_profile(public.vehicle_profile(vehicle_id)));
create policy vehicle_photos_update on public.vehicle_photos
  for update to authenticated
  using (public.can_add_to_profile(public.vehicle_profile(vehicle_id)))
  with check (public.can_add_to_profile(public.vehicle_profile(vehicle_id)));
create policy vehicle_photos_delete on public.vehicle_photos
  for delete to authenticated
  using (public.can_add_to_profile(public.vehicle_profile(vehicle_id)));

create policy listing_flags_select on public.listing_flags
  for select to authenticated
  using (public.owns_listing(listing_id) or (select public.authorize('listings.review')));

-- --------------------------------------------------------------- grants

revoke all on public.move_listings, public.move_listing_places, public.move_flat_rates,
  public.move_availability_rules, public.move_blocked_ranges, public.vehicle_photos,
  public.listing_flags from anon, authenticated;

grant select on public.move_listings, public.move_listing_places, public.move_flat_rates,
  public.move_availability_rules, public.move_blocked_ranges, public.vehicle_photos,
  public.listing_flags to authenticated;

grant insert (vendor_profile_id, currency, island_wide, base_fare, per_km, hourly_rate, description)
  on public.move_listings to authenticated;
grant update (currency, island_wide, base_fare, per_km, hourly_rate, description, paused)
  on public.move_listings to authenticated;

grant insert (listing_id, place_id) on public.move_listing_places to authenticated;
grant delete on public.move_listing_places to authenticated;

grant insert (listing_id, place_a_id, place_b_id, price) on public.move_flat_rates to authenticated;
grant update (price) on public.move_flat_rates to authenticated;
grant delete on public.move_flat_rates to authenticated;

grant insert (listing_id, weekday, start_minutes, end_minutes)
  on public.move_availability_rules to authenticated;
grant update (weekday, start_minutes, end_minutes) on public.move_availability_rules to authenticated;
grant delete on public.move_availability_rules to authenticated;

grant insert (listing_id, starts_at, ends_at, note) on public.move_blocked_ranges to authenticated;
grant update (starts_at, ends_at, note) on public.move_blocked_ranges to authenticated;
grant delete on public.move_blocked_ranges to authenticated;

grant insert (vehicle_id, kind, storage_path, position) on public.vehicle_photos to authenticated;
grant update (position) on public.vehicle_photos to authenticated;
grant delete on public.vehicle_photos to authenticated;
