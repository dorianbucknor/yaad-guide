-- Dining is a third VIBE subtype. Everything generic (title, address, photos, status, review,
-- cancellation policy, tickets, slots) stays on vibe_listings and its sibling tables. What is
-- only true of a dining listing lives in vibe_dining_profiles (one row per listing) and, for
-- reservation listings that run on opening hours, vibe_business_hours.

alter table public.vibe_listings drop constraint vibe_listings_subtype_check;
alter table public.vibe_listings add constraint vibe_listings_subtype_check
  check (subtype in ('event', 'attraction', 'dining'));

-- ---------------------------------------------------------------- tables

create table public.vibe_dining_profiles (
  listing_id uuid primary key references public.vibe_listings (id) on delete cascade,
  venue_type text not null check (venue_type in ('street_food', 'cookshop', 'restaurant')),
  dine_in boolean not null default false,
  takeout boolean not null default false,
  cuisine_types text[] not null default '{}' check (cardinality(cuisine_types) <= 10),
  price_tier text check (price_tier in ('$', '$$', '$$$')),
  booking_mode text not null check (booking_mode in ('reservation', 'prepaid', 'listing_only')),
  reservation_style text check (reservation_style in ('slotted', 'hours_only')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  -- A restaurant serves diners or takeaway, or both.
  constraint vibe_dining_restaurant_service check (venue_type <> 'restaurant' or dine_in or takeout),
  -- Only a reservation listing has a reservation style.
  constraint vibe_dining_reservation_style check ((booking_mode = 'reservation') = (reservation_style is not null))
);

-- Weekly opening hours in Jamaica local minutes since midnight. A range cannot cross midnight;
-- a venue open past midnight enters two rows on the day it opens.
create table public.vibe_business_hours (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.vibe_listings (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_minutes smallint not null check (opens_minutes between 0 and 1439),
  closes_minutes smallint not null check (closes_minutes between 0 and 1439),
  created_at timestamptz not null default now(),
  check (closes_minutes > opens_minutes),
  unique (listing_id, weekday)
);

alter table public.vibe_dining_profiles enable row level security;
alter table public.vibe_business_hours enable row level security;

-- ------------------------------------------------------------- triggers

create function public.require_dining_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.vibe_listings where id = new.listing_id and subtype = 'dining'
  ) then
    raise exception 'Only a dining listing can have dining details or business hours.';
  end if;
  return new;
end;
$$;

-- The first write of a profile is an insert, which is not guarded; every later write is an
-- update, which cannot change how the listing is booked. There is no delete grant either, so
-- the choice cannot be undone and made again.
create function public.guard_dining_mode_lock()
returns trigger
language plpgsql
as $$
begin
  if new.booking_mode is distinct from old.booking_mode
     or new.reservation_style is distinct from old.reservation_style then
    raise exception 'The booking mode can''t be changed after it''s set. Create a new listing instead.';
  end if;
  return new;
end;
$$;

revoke all on function public.require_dining_listing() from public, anon, authenticated;
revoke all on function public.guard_dining_mode_lock() from public, anon, authenticated;

create trigger vibe_dining_profiles_require_dining before insert on public.vibe_dining_profiles
  for each row execute function public.require_dining_listing();
create trigger vibe_business_hours_require_dining before insert on public.vibe_business_hours
  for each row execute function public.require_dining_listing();
create trigger vibe_dining_profiles_lock before update on public.vibe_dining_profiles
  for each row execute function public.guard_dining_mode_lock();

create trigger vibe_dining_profiles_set_updated before update on public.vibe_dining_profiles
  for each row execute function public.set_updated_fields();
-- No audit trigger: audit_row_change() reads new.id, and this table is keyed by listing_id.

-- ------------------------------------------------------------- policies

create policy vibe_dining_profiles_select on public.vibe_dining_profiles
  for select to authenticated
  using (public.owns_vibe_listing(listing_id) or (select public.authorize('listings.review')));
create policy vibe_dining_profiles_insert on public.vibe_dining_profiles
  for insert to authenticated with check (public.owns_vibe_listing(listing_id));
create policy vibe_dining_profiles_update on public.vibe_dining_profiles
  for update to authenticated
  using (public.owns_vibe_listing(listing_id)) with check (public.owns_vibe_listing(listing_id));

create policy vibe_business_hours_select on public.vibe_business_hours
  for select to authenticated
  using (public.owns_vibe_listing(listing_id) or (select public.authorize('listings.review')));
create policy vibe_business_hours_insert on public.vibe_business_hours
  for insert to authenticated with check (public.owns_vibe_listing(listing_id));
create policy vibe_business_hours_update on public.vibe_business_hours
  for update to authenticated
  using (public.owns_vibe_listing(listing_id)) with check (public.owns_vibe_listing(listing_id));
create policy vibe_business_hours_delete on public.vibe_business_hours
  for delete to authenticated using (public.owns_vibe_listing(listing_id));

-- --------------------------------------------------------------- grants
-- listing_id is insert-only on purpose: updating it would move a profile to another listing and
-- get round the booking-mode lock.

revoke all on public.vibe_dining_profiles, public.vibe_business_hours from anon, authenticated;

grant select on public.vibe_dining_profiles, public.vibe_business_hours to authenticated;

grant insert (listing_id, venue_type, dine_in, takeout, cuisine_types, price_tier, booking_mode, reservation_style)
  on public.vibe_dining_profiles to authenticated;
grant update (venue_type, dine_in, takeout, cuisine_types, price_tier, booking_mode, reservation_style)
  on public.vibe_dining_profiles to authenticated;

grant insert (listing_id, weekday, opens_minutes, closes_minutes) on public.vibe_business_hours to authenticated;
grant update (opens_minutes, closes_minutes) on public.vibe_business_hours to authenticated;
grant delete on public.vibe_business_hours to authenticated;
