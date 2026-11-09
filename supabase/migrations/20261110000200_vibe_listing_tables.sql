-- VIBE listings (events and attractions): many per VIBE vendor profile, each with ticket
-- types, a weekly schedule, bookable slots with capacity, photos and review flags.
-- Status, review and free-ticket confirmation are written only by the functions in the
-- next migration. Row-level security everywhere; nothing is readable by the public yet.

-- ---------------------------------------------------------------- tables

create table public.vibe_listings (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null references public.vendor_profiles (id) on delete cascade,
  subtype text not null check (subtype in ('event', 'attraction')),
  title text not null check (char_length(title) between 3 and 100),
  description text check (char_length(description) <= 1000),
  area text check (char_length(area) <= 100),
  -- The full address is private until a booking is confirmed (traveler cycle).
  address_line1 text check (char_length(address_line1) <= 150),
  address_line2 text check (char_length(address_line2) <= 150),
  town text check (char_length(town) <= 100),
  parish text check (parish in ('Kingston', 'St. Andrew', 'St. Thomas', 'Portland', 'St. Mary',
    'St. Ann', 'Trelawny', 'St. James', 'Hanover', 'Westmoreland', 'St. Elizabeth', 'Manchester',
    'Clarendon', 'St. Catherine')),
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  currency text not null default 'usd' check (currency in ('usd', 'jmd')),
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 1440),
  booking_cutoff_minutes integer not null default 60 check (booking_cutoff_minutes between 0 and 10080),
  auto_generate_slots boolean not null default true,
  cancellation_policy text not null default 'flexible'
    check (cancellation_policy in ('flexible', 'moderate', 'strict')),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'live')),
  paused boolean not null default false,
  approved_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  -- A pin has both coordinates, inside Jamaica's bounding box.
  constraint vibe_listings_pin check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null
        and latitude between 17.5 and 18.7 and longitude between -78.6 and -76.0)
  )
);

create index vibe_listings_profile on public.vibe_listings (vendor_profile_id);

create table public.vibe_ticket_types (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.vibe_listings (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 200),
  price numeric(10, 2) not null check (price >= 0),
  discount_percent numeric(5, 2) check (discount_percent > 0 and discount_percent < 100),
  -- Set by save_vibe_ticket_type() when the vendor confirms a free ticket; never by a client.
  free_confirmed_at timestamptz,
  max_per_booking integer check (max_per_booking between 1 and 100),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  check (price > 0 or free_confirmed_at is not null),
  check (discount_percent is null or price > 0)
);

create index vibe_ticket_types_listing on public.vibe_ticket_types (listing_id);

-- Weekly pattern, in Jamaica local time (minutes since midnight).
create table public.vibe_schedule_rules (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.vibe_listings (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_minutes smallint not null check (start_minutes between 0 and 1439),
  capacity integer not null check (capacity > 0),
  valid_from date,
  valid_until date,
  created_at timestamptz not null default now(),
  check (valid_from is null or valid_until is null or valid_from <= valid_until),
  unique (listing_id, weekday, start_minutes)
);

create table public.vibe_slots (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.vibe_listings (id) on delete cascade,
  starts_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  booked integer not null default 0 check (booked >= 0),
  status text not null default 'open' check (status in ('open', 'closed')),
  source text not null default 'one_off' check (source in ('rule', 'one_off')),
  -- True once a vendor changed capacity or status by hand; regeneration leaves it alone.
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  check (booked <= capacity),
  unique (listing_id, starts_at)
);

create index vibe_slots_listing_start on public.vibe_slots (listing_id, starts_at);

-- A date the vendor closed; stops regeneration from reopening it.
create table public.vibe_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.vibe_listings (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  unique (listing_id, day)
);

create table public.vibe_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.vibe_listings (id) on delete cascade,
  storage_path text not null,
  is_cover boolean not null default false,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  -- The file sits in a folder named for the listing, never above it.
  check (storage_path like '%/vibe/' || listing_id::text || '/%' and storage_path not like '%..%')
);

create unique index vibe_photos_one_cover on public.vibe_photos (listing_id) where is_cover;

create table public.vibe_listing_flags (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.vibe_listings (id) on delete cascade,
  kind text not null check (kind in ('price', 'photo')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

create unique index vibe_listing_flags_one_open_per_kind
  on public.vibe_listing_flags (listing_id, kind) where resolved_at is null;

alter table public.vibe_listings enable row level security;
alter table public.vibe_ticket_types enable row level security;
alter table public.vibe_schedule_rules enable row level security;
alter table public.vibe_slots enable row level security;
alter table public.vibe_blocked_dates enable row level security;
alter table public.vibe_photos enable row level security;
alter table public.vibe_listing_flags enable row level security;

-- -------------------------------------------------------- policy helpers

create function public.owns_vibe_listing(p_listing_id uuid)
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
    where l.id = p_listing_id and p.account_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_vibe_listing(uuid) from public, anon;
grant execute on function public.owns_vibe_listing(uuid) to authenticated;

-- ------------------------------------------------------------- triggers

create function public.require_vibe_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.vendor_profiles
    where id = new.vendor_profile_id and category = 'vibe'
  ) then
    raise exception 'Only a VIBE vendor profile can have a VIBE listing.';
  end if;
  return new;
end;
$$;

-- Capacity can never drop below the places already taken; a hand edit protects the slot
-- from regeneration.
create function public.guard_vibe_slot_update()
returns trigger
language plpgsql
as $$
begin
  if new.capacity < new.booked then
    raise exception 'This slot already has % booked; capacity can''t go below that.', new.booked;
  end if;
  if new.capacity is distinct from old.capacity or new.status is distinct from old.status then
    new.edited := true;
  end if;
  return new;
end;
$$;

create function public.cap_vibe_photos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.vibe_photos where listing_id = new.listing_id) >= 10 then
    raise exception 'A listing can have up to 10 photos.';
  end if;
  return new;
end;
$$;

revoke all on function public.require_vibe_profile() from public, anon, authenticated;
revoke all on function public.guard_vibe_slot_update() from public, anon, authenticated;
revoke all on function public.cap_vibe_photos() from public, anon, authenticated;

create trigger vibe_listings_require_profile before insert on public.vibe_listings
  for each row execute function public.require_vibe_profile();
create trigger vibe_slots_guard before update on public.vibe_slots
  for each row execute function public.guard_vibe_slot_update();
create trigger vibe_photos_cap before insert on public.vibe_photos
  for each row execute function public.cap_vibe_photos();

create trigger vibe_listings_set_updated before update on public.vibe_listings
  for each row execute function public.set_updated_fields();
create trigger vibe_ticket_types_set_updated before update on public.vibe_ticket_types
  for each row execute function public.set_updated_fields();

create trigger vibe_listings_audit after insert or update or delete on public.vibe_listings
  for each row execute function public.audit_row_change();
create trigger vibe_ticket_types_audit after insert or update or delete on public.vibe_ticket_types
  for each row execute function public.audit_row_change();
create trigger vibe_photos_audit after insert or update or delete on public.vibe_photos
  for each row execute function public.audit_row_change();
create trigger vibe_listing_flags_audit after insert or update or delete on public.vibe_listing_flags
  for each row execute function public.audit_row_change();

-- ------------------------------------------------------------- policies

create policy vibe_listings_select on public.vibe_listings
  for select to authenticated
  using (public.owns_vibe_listing(id) or (select public.authorize('listings.review')));
create policy vibe_listings_insert on public.vibe_listings
  for insert to authenticated with check (public.owns_profile(vendor_profile_id));
create policy vibe_listings_update on public.vibe_listings
  for update to authenticated
  using (public.owns_vibe_listing(id)) with check (public.owns_vibe_listing(id));
create policy vibe_listings_delete on public.vibe_listings
  for delete to authenticated using (public.owns_vibe_listing(id) and status = 'draft');

create policy vibe_ticket_types_select on public.vibe_ticket_types
  for select to authenticated
  using (public.owns_vibe_listing(listing_id) or (select public.authorize('listings.review')));
create policy vibe_ticket_types_delete on public.vibe_ticket_types
  for delete to authenticated using (public.owns_vibe_listing(listing_id));

create policy vibe_schedule_rules_select on public.vibe_schedule_rules
  for select to authenticated
  using (public.owns_vibe_listing(listing_id) or (select public.authorize('listings.review')));
create policy vibe_schedule_rules_insert on public.vibe_schedule_rules
  for insert to authenticated with check (public.owns_vibe_listing(listing_id));
create policy vibe_schedule_rules_update on public.vibe_schedule_rules
  for update to authenticated
  using (public.owns_vibe_listing(listing_id)) with check (public.owns_vibe_listing(listing_id));
create policy vibe_schedule_rules_delete on public.vibe_schedule_rules
  for delete to authenticated using (public.owns_vibe_listing(listing_id));

create policy vibe_slots_select on public.vibe_slots
  for select to authenticated
  using (public.owns_vibe_listing(listing_id) or (select public.authorize('listings.review')));
create policy vibe_slots_insert on public.vibe_slots
  for insert to authenticated with check (public.owns_vibe_listing(listing_id));
create policy vibe_slots_update on public.vibe_slots
  for update to authenticated
  using (public.owns_vibe_listing(listing_id)) with check (public.owns_vibe_listing(listing_id));
create policy vibe_slots_delete on public.vibe_slots
  for delete to authenticated using (public.owns_vibe_listing(listing_id) and booked = 0);

create policy vibe_blocked_dates_select on public.vibe_blocked_dates
  for select to authenticated
  using (public.owns_vibe_listing(listing_id) or (select public.authorize('listings.review')));

create policy vibe_photos_select on public.vibe_photos
  for select to authenticated
  using (public.owns_vibe_listing(listing_id) or (select public.authorize('listings.review')));
create policy vibe_photos_insert on public.vibe_photos
  for insert to authenticated with check (public.owns_vibe_listing(listing_id));
create policy vibe_photos_update on public.vibe_photos
  for update to authenticated
  using (public.owns_vibe_listing(listing_id)) with check (public.owns_vibe_listing(listing_id));
create policy vibe_photos_delete on public.vibe_photos
  for delete to authenticated using (public.owns_vibe_listing(listing_id));

create policy vibe_listing_flags_select on public.vibe_listing_flags
  for select to authenticated
  using (public.owns_vibe_listing(listing_id) or (select public.authorize('listings.review')));

-- --------------------------------------------------------------- grants

revoke all on public.vibe_listings, public.vibe_ticket_types, public.vibe_schedule_rules,
  public.vibe_slots, public.vibe_blocked_dates, public.vibe_photos,
  public.vibe_listing_flags from anon, authenticated;

grant select on public.vibe_listings, public.vibe_ticket_types, public.vibe_schedule_rules,
  public.vibe_slots, public.vibe_blocked_dates, public.vibe_photos,
  public.vibe_listing_flags to authenticated;

grant insert (vendor_profile_id, subtype, title, description, area, address_line1, address_line2,
  town, parish, latitude, longitude, currency, duration_minutes, booking_cutoff_minutes,
  auto_generate_slots, cancellation_policy)
  on public.vibe_listings to authenticated;
grant update (subtype, title, description, area, address_line1, address_line2, town, parish,
  latitude, longitude, currency, duration_minutes, booking_cutoff_minutes, auto_generate_slots,
  cancellation_policy, paused)
  on public.vibe_listings to authenticated;
grant delete on public.vibe_listings to authenticated;

grant delete on public.vibe_ticket_types to authenticated;

grant insert (listing_id, weekday, start_minutes, capacity, valid_from, valid_until)
  on public.vibe_schedule_rules to authenticated;
grant update (weekday, start_minutes, capacity, valid_from, valid_until)
  on public.vibe_schedule_rules to authenticated;
grant delete on public.vibe_schedule_rules to authenticated;

grant insert (listing_id, starts_at, capacity) on public.vibe_slots to authenticated;
grant update (capacity, status) on public.vibe_slots to authenticated;
grant delete on public.vibe_slots to authenticated;

grant insert (listing_id, storage_path, is_cover, position) on public.vibe_photos to authenticated;
grant update (is_cover, position) on public.vibe_photos to authenticated;
grant delete on public.vibe_photos to authenticated;
