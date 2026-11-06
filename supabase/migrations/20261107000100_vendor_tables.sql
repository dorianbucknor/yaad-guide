-- Vendor onboarding: profiles, vehicles, documents and transfers.
-- Row-level security everywhere. Status, review, activation, verification and
-- transfer state are written only by the functions in the next migration.

create function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- ---------------------------------------------------------------- tables

create table public.vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in ('move', 'stay', 'vibe')),
  business_name text,
  primary_region text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'rejected')),
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  unique (account_id, category)
);

create table public.vendor_vehicles (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null references public.vendor_profiles (id) on delete cascade,
  vehicle_type text not null check (vehicle_type in
    ('Sedan', 'SUV', 'Minivan', 'Station Wagon/Hatchback', 'Bus', 'Coach')),
  make text not null,
  model text not null,
  year integer not null check (year >= 1980),
  plate text not null unique,
  passenger_capacity integer not null check (passenger_capacity between 1 and 80),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create unique index vendor_vehicles_one_active
  on public.vendor_vehicles (vendor_profile_id) where is_active;

create table public.vendor_documents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users (id) on delete cascade,
  vendor_profile_id uuid references public.vendor_profiles (id) on delete cascade,
  vehicle_id uuid references public.vendor_vehicles (id) on delete cascade,
  doc_type text not null check (doc_type in
    ('government_id', 'jtb_license', 'insurance', 'fitness')),
  storage_path text not null,
  expires_on date,
  verified boolean not null default false,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint vendor_documents_shape check (
    (doc_type = 'government_id' and vendor_profile_id is null and vehicle_id is null)
    or (doc_type = 'jtb_license' and vendor_profile_id is not null and vehicle_id is null)
    or (doc_type in ('insurance', 'fitness') and vendor_profile_id is null and vehicle_id is not null)
  ),
  constraint vendor_documents_expiry check (
    doc_type = 'government_id' or expires_on is not null
  )
);

create unique index vendor_documents_one_id
  on public.vendor_documents (account_id) where doc_type = 'government_id';
create unique index vendor_documents_one_license
  on public.vendor_documents (vendor_profile_id) where doc_type = 'jtb_license';
create unique index vendor_documents_one_per_vehicle
  on public.vendor_documents (vehicle_id, doc_type) where doc_type in ('insurance', 'fitness');

create table public.vehicle_transfers (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vendor_vehicles (id) on delete cascade,
  from_profile_id uuid not null references public.vendor_profiles (id) on delete cascade,
  to_profile_id uuid not null references public.vendor_profiles (id) on delete cascade,
  status text not null default 'requested'
    check (status in ('requested', 'owner_agreed', 'owner_declined', 'approved', 'rejected')),
  note text,
  requested_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  owner_responded_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  check (from_profile_id <> to_profile_id)
);

create unique index vehicle_transfers_one_open
  on public.vehicle_transfers (vehicle_id) where status in ('requested', 'owner_agreed');

alter table public.vendor_profiles enable row level security;
alter table public.vendor_vehicles enable row level security;
alter table public.vendor_documents enable row level security;
alter table public.vehicle_transfers enable row level security;

-- ------------------------------------------------------------ triggers

create function public.normalize_vendor_plate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.plate := upper(regexp_replace(trim(new.plate), '\s+', '', 'g'));
  return new;
end;
$$;

create trigger vendor_vehicles_normalize_plate
  before insert or update of plate on public.vendor_vehicles
  for each row execute function public.normalize_vendor_plate();

-- A new file or a new expiry date needs a fresh admin check.
create function public.reset_document_verified()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.storage_path is distinct from old.storage_path
      or new.expires_on is distinct from old.expires_on)
     and not public.is_admin() then
    new.verified := false;
  end if;
  return new;
end;
$$;

create trigger vendor_documents_reset_verified
  before update on public.vendor_documents
  for each row execute function public.reset_document_verified();

create trigger vendor_profiles_set_updated before update on public.vendor_profiles
  for each row execute function public.set_updated_fields();
create trigger vendor_vehicles_set_updated before update on public.vendor_vehicles
  for each row execute function public.set_updated_fields();
create trigger vendor_documents_set_updated before update on public.vendor_documents
  for each row execute function public.set_updated_fields();
create trigger vehicle_transfers_set_updated before update on public.vehicle_transfers
  for each row execute function public.set_updated_fields();

create trigger vendor_profiles_audit after insert or update or delete on public.vendor_profiles
  for each row execute function public.audit_row_change();
create trigger vendor_vehicles_audit after insert or update or delete on public.vendor_vehicles
  for each row execute function public.audit_row_change();
create trigger vendor_documents_audit after insert or update or delete on public.vendor_documents
  for each row execute function public.audit_row_change();
create trigger vehicle_transfers_audit after insert or update or delete on public.vehicle_transfers
  for each row execute function public.audit_row_change();

-- -------------------------------------------------------- policy helpers
-- Security definer so policies can look at other tables without recursion.

create function public.owns_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vendor_profiles
    where id = p_profile_id and account_id = (select auth.uid())
  );
$$;

-- Draft or rejected: the vendor may change anything on the profile.
create function public.can_edit_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vendor_profiles
    where id = p_profile_id
      and account_id = (select auth.uid())
      and status in ('draft', 'rejected')
  );
$$;

-- Also approved: an approved vendor may add a vehicle or replace a document;
-- both start unverified. Pending is the only locked state.
create function public.can_add_to_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vendor_profiles
    where id = p_profile_id
      and account_id = (select auth.uid())
      and status in ('draft', 'rejected', 'approved')
  );
$$;

create function public.vehicle_profile(p_vehicle_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select vendor_profile_id from public.vendor_vehicles where id = p_vehicle_id;
$$;

create function public.account_unlocked(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_account_id = (select auth.uid())
    and not exists (
      select 1 from public.vendor_profiles
      where account_id = p_account_id and status = 'pending'
    );
$$;

create function public.is_transfer_party(p_vehicle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vehicle_transfers t
    where t.vehicle_id = p_vehicle_id
      and (t.requested_by = (select auth.uid())
           or public.owns_profile(t.from_profile_id)
           or public.owns_profile(t.to_profile_id))
  );
$$;

-- Who may write a document row of this shape.
create function public.can_write_document(
  p_account_id uuid, p_doc_type text, p_profile_id uuid, p_vehicle_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_account_id = (select auth.uid())
    and case p_doc_type
      when 'government_id' then public.account_unlocked(p_account_id)
      when 'jtb_license' then public.can_add_to_profile(p_profile_id)
      else public.can_add_to_profile(public.vehicle_profile(p_vehicle_id))
    end;
$$;

revoke all on function
  public.is_admin(), public.owns_profile(uuid), public.can_edit_profile(uuid),
  public.can_add_to_profile(uuid), public.vehicle_profile(uuid),
  public.account_unlocked(uuid), public.is_transfer_party(uuid),
  public.can_write_document(uuid, text, uuid, uuid)
  from public, anon;
grant execute on function
  public.is_admin(), public.owns_profile(uuid), public.can_edit_profile(uuid),
  public.can_add_to_profile(uuid), public.vehicle_profile(uuid),
  public.account_unlocked(uuid), public.is_transfer_party(uuid),
  public.can_write_document(uuid, text, uuid, uuid)
  to authenticated;

revoke all on function public.normalize_vendor_plate() from public, anon, authenticated;
revoke all on function public.reset_document_verified() from public, anon, authenticated;

-- ------------------------------------------------------------- policies

create policy vendor_profiles_select on public.vendor_profiles
  for select to authenticated
  using (account_id = (select auth.uid()) or public.is_admin());
create policy vendor_profiles_insert on public.vendor_profiles
  for insert to authenticated
  with check (account_id = (select auth.uid()));
create policy vendor_profiles_update on public.vendor_profiles
  for update to authenticated
  using (public.can_edit_profile(id))
  with check (account_id = (select auth.uid()));

create policy vendor_vehicles_select on public.vendor_vehicles
  for select to authenticated
  using (
    public.owns_profile(vendor_profile_id)
    or public.is_admin()
    or public.is_transfer_party(id)
  );
create policy vendor_vehicles_insert on public.vendor_vehicles
  for insert to authenticated
  with check (public.can_add_to_profile(vendor_profile_id));
create policy vendor_vehicles_update on public.vendor_vehicles
  for update to authenticated
  using (public.can_edit_profile(vendor_profile_id))
  with check (public.can_edit_profile(vendor_profile_id));
create policy vendor_vehicles_delete on public.vendor_vehicles
  for delete to authenticated
  using (public.can_edit_profile(vendor_profile_id) and not is_active);

create policy vendor_documents_select on public.vendor_documents
  for select to authenticated
  using (
    account_id = (select auth.uid())
    or public.is_admin()
    or public.owns_profile(coalesce(vendor_profile_id, public.vehicle_profile(vehicle_id)))
  );
create policy vendor_documents_insert on public.vendor_documents
  for insert to authenticated
  with check (public.can_write_document(account_id, doc_type, vendor_profile_id, vehicle_id));
create policy vendor_documents_update on public.vendor_documents
  for update to authenticated
  using (public.can_write_document(account_id, doc_type, vendor_profile_id, vehicle_id))
  with check (public.can_write_document(account_id, doc_type, vendor_profile_id, vehicle_id));
create policy vendor_documents_delete on public.vendor_documents
  for delete to authenticated
  using (public.can_write_document(account_id, doc_type, vendor_profile_id, vehicle_id));

create policy vehicle_transfers_select on public.vehicle_transfers
  for select to authenticated
  using (
    requested_by = (select auth.uid())
    or public.owns_profile(from_profile_id)
    or public.owns_profile(to_profile_id)
    or public.is_admin()
  );

-- --------------------------------------------------------------- grants

revoke all on public.vendor_profiles, public.vendor_vehicles,
  public.vendor_documents, public.vehicle_transfers from anon, authenticated;

grant select on public.vendor_profiles, public.vendor_vehicles,
  public.vendor_documents, public.vehicle_transfers to authenticated;

grant insert (account_id, category, business_name, primary_region)
  on public.vendor_profiles to authenticated;
grant update (business_name, primary_region) on public.vendor_profiles to authenticated;

grant insert (vendor_profile_id, vehicle_type, make, model, year, plate, passenger_capacity)
  on public.vendor_vehicles to authenticated;
grant update (vehicle_type, make, model, year, plate, passenger_capacity)
  on public.vendor_vehicles to authenticated;
grant delete on public.vendor_vehicles to authenticated;

grant insert (id, account_id, vendor_profile_id, vehicle_id, doc_type, storage_path, expires_on)
  on public.vendor_documents to authenticated;
grant update (storage_path, expires_on) on public.vendor_documents to authenticated;
grant delete on public.vendor_documents to authenticated;
