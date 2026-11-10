-- MOVE: a vendor can switch "price by distance" off without losing the numbers.
-- A switched-off formula is ignored when quoting and does not count towards readiness.
--
-- This also grants vendors write access to cancellation_policy. The column was added without a
-- column grant, so every listing save (which always writes it) failed with "permission denied".

alter table public.move_listings
  add column distance_pricing_enabled boolean not null default true;

grant insert (distance_pricing_enabled, cancellation_policy) on public.move_listings to authenticated;
grant update (distance_pricing_enabled, cancellation_policy) on public.move_listings to authenticated;

-- The formula only counts when it is switched on.
create or replace function public.listing_is_ready(p_listing_id uuid)
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
           or (l.distance_pricing_enabled and l.base_fare is not null and l.per_km is not null))
      and exists (select 1 from public.move_availability_rules r where r.listing_id = l.id)
  );
$$;

-- Switching the formula on or off changes what travelers are quoted, so it raises the same flag.
create or replace function public.flag_formula_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.base_fare is distinct from old.base_fare
     or new.per_km is distinct from old.per_km
     or new.hourly_rate is distinct from old.hourly_rate
     or new.currency is distinct from old.currency
     or new.distance_pricing_enabled is distinct from old.distance_pricing_enabled then
    perform public.raise_listing_flag(new.id, 'price');
  end if;
  return new;
end;
$$;
