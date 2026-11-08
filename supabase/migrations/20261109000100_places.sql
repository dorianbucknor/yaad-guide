-- Places: the admin-maintained list of pickup and drop-off points that MOVE
-- coverage, flat rates and pricing are built on. Public read; admin write.
-- Also: vendor suggestions for missing places, and the permissions this feature adds.

create table public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  kind text not null check (kind in ('airport', 'city', 'town', 'resort_area')),
  parish text not null,
  lat numeric(8, 5) not null check (lat between 17.5 and 18.7),
  lng numeric(8, 5) not null check (lng between -78.5 and -76.0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table public.place_suggestions (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null references public.vendor_profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  note text check (char_length(note) <= 300),
  status text not null default 'open' check (status in ('open', 'added', 'dismissed')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.places enable row level security;
alter table public.place_suggestions enable row level security;

create trigger places_set_updated before update on public.places
  for each row execute function public.set_updated_fields();
create trigger place_suggestions_set_updated before update on public.place_suggestions
  for each row execute function public.set_updated_fields();
create trigger places_audit after insert or update or delete on public.places
  for each row execute function public.audit_row_change();
create trigger place_suggestions_audit after insert or update or delete on public.place_suggestions
  for each row execute function public.audit_row_change();

-- Permissions added by this feature; admins hold both.
insert into public.permissions (key, description) values
  ('listings.review', 'Approve or reject a MOVE listing and resolve listing flags'),
  ('places.manage', 'Add, edit and retire places; resolve place suggestions');
insert into public.role_permissions (role, permission) values
  ('admin', 'listings.review'),
  ('admin', 'places.manage');

-- ------------------------------------------------------------- policies

create policy places_select on public.places
  for select to anon, authenticated using (true);
create policy places_insert on public.places
  for insert to authenticated with check ((select public.authorize('places.manage')));
create policy places_update on public.places
  for update to authenticated
  using ((select public.authorize('places.manage')))
  with check ((select public.authorize('places.manage')));
create policy places_delete on public.places
  for delete to authenticated using ((select public.authorize('places.manage')));

create policy place_suggestions_select on public.place_suggestions
  for select to authenticated
  using (public.owns_profile(vendor_profile_id) or (select public.authorize('places.manage')));
create policy place_suggestions_insert on public.place_suggestions
  for insert to authenticated with check (public.owns_profile(vendor_profile_id));
create policy place_suggestions_update on public.place_suggestions
  for update to authenticated
  using ((select public.authorize('places.manage')))
  with check ((select public.authorize('places.manage')));

-- --------------------------------------------------------------- grants

revoke all on public.places, public.place_suggestions from anon, authenticated;
grant select on public.places to anon, authenticated;
grant insert, update, delete on public.places to authenticated;
grant select on public.place_suggestions to authenticated;
grant insert (vendor_profile_id, name, note) on public.place_suggestions to authenticated;
grant update (status) on public.place_suggestions to authenticated;

-- ----------------------------------------------------------------- seed
-- Coordinates are approximate (within about 1 km), which is enough for pricing.
-- Verify against a gazetteer before launch.

insert into public.places (slug, name, kind, parish, lat, lng) values
  ('mbj', 'Sangster International Airport (MBJ)', 'airport', 'St. James', 18.50370, -77.91340),
  ('kin', 'Norman Manley International Airport (KIN)', 'airport', 'Kingston', 17.93570, -76.78750),
  ('ocj', 'Ian Fleming International Airport (OCJ)', 'airport', 'St. Mary', 18.40420, -76.96900),
  ('montego-bay', 'Montego Bay', 'city', 'St. James', 18.47620, -77.89390),
  ('rose-hall', 'Rose Hall', 'resort_area', 'St. James', 18.51000, -77.82000),
  ('negril', 'Negril', 'resort_area', 'Westmoreland', 18.26830, -78.34780),
  ('ocho-rios', 'Ocho Rios', 'resort_area', 'St. Ann', 18.40740, -77.10250),
  ('kingston', 'Kingston', 'city', 'Kingston', 17.97120, -76.79360),
  ('port-antonio', 'Port Antonio', 'town', 'Portland', 18.17790, -76.45100),
  ('treasure-beach', 'Treasure Beach', 'resort_area', 'St. Elizabeth', 17.88080, -77.75470),
  ('falmouth', 'Falmouth', 'town', 'Trelawny', 18.49360, -77.65560),
  ('runaway-bay', 'Runaway Bay', 'resort_area', 'St. Ann', 18.45530, -77.33410),
  ('discovery-bay', 'Discovery Bay', 'town', 'St. Ann', 18.46500, -77.40650),
  ('st-anns-bay', 'St. Ann''s Bay', 'town', 'St. Ann', 18.43580, -77.20100),
  ('mandeville', 'Mandeville', 'city', 'Manchester', 18.04170, -77.50750),
  ('black-river', 'Black River', 'town', 'St. Elizabeth', 18.02620, -77.84890),
  ('savanna-la-mar', 'Savanna-la-Mar', 'town', 'Westmoreland', 18.21860, -78.13300),
  ('lucea', 'Lucea', 'town', 'Hanover', 18.45110, -78.17310),
  ('port-maria', 'Port Maria', 'town', 'St. Mary', 18.37000, -76.89000),
  ('oracabessa', 'Oracabessa', 'town', 'St. Mary', 18.40400, -76.94800),
  ('annotto-bay', 'Annotto Bay', 'town', 'St. Mary', 18.27000, -76.77400),
  ('morant-bay', 'Morant Bay', 'town', 'St. Thomas', 17.88000, -76.40900),
  ('spanish-town', 'Spanish Town', 'city', 'St. Catherine', 17.99110, -76.95740),
  ('portmore', 'Portmore', 'city', 'St. Catherine', 17.95000, -76.88000),
  ('hellshire', 'Hellshire', 'resort_area', 'St. Catherine', 17.89300, -76.86200);
