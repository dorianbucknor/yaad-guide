-- MOVE listing functions, flag triggers, photo caps and the photo bucket.
-- Every status change goes through these functions; vendors cannot write status,
-- review or verification columns directly.

-- ------------------------------------------------------------- readiness

create function public.listing_is_ready(p_listing_id uuid)
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
           or (l.base_fare is not null and l.per_km is not null))
      and exists (select 1 from public.move_availability_rules r where r.listing_id = l.id)
  );
$$;

-- ------------------------------------------------------------- submit, review

create function public.submit_listing_for_review(p_listing_id uuid)
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
$$;

create function public.review_listing(p_listing_id uuid, p_decision text, p_note text)
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
$$;

create function public.resolve_listing_flag(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

create function public.verify_profile_photo(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.authorize('documents.verify') then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  update public.vendor_profiles set photo_verified_at = now() where id = p_profile_id;
  if not found then
    raise exception 'We couldn''t find that.' using errcode = 'P0002';
  end if;
end;
$$;

-- ----------------------------------------------------------------- flags

create function public.raise_listing_flag(p_listing_id uuid, p_kind text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.listing_flags (listing_id, kind)
  select id, p_kind from public.move_listings where id = p_listing_id and status = 'live'
  on conflict (listing_id, kind) where resolved_at is null do nothing;
$$;

create function public.flag_flat_rate_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.raise_listing_flag(coalesce(new.listing_id, old.listing_id), 'price');
  return coalesce(new, old);
end;
$$;

create function public.flag_formula_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.base_fare is distinct from old.base_fare
     or new.per_km is distinct from old.per_km
     or new.hourly_rate is distinct from old.hourly_rate
     or new.currency is distinct from old.currency then
    perform public.raise_listing_flag(new.id, 'price');
  end if;
  return new;
end;
$$;

create function public.flag_photo_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vehicle uuid := coalesce(new.vehicle_id, old.vehicle_id);
begin
  perform public.raise_listing_flag(l.id, 'photo')
  from public.vendor_vehicles v
  join public.move_listings l on l.vendor_profile_id = v.vendor_profile_id
  where v.id = v_vehicle;
  return coalesce(new, old);
end;
$$;

-- A new profile photo needs a fresh admin check and flags any live listing.
create function public.profile_photo_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

create function public.cap_vehicle_photos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

create trigger move_flat_rates_flag after insert or update or delete on public.move_flat_rates
  for each row execute function public.flag_flat_rate_change();
create trigger move_listings_flag_formula after update on public.move_listings
  for each row execute function public.flag_formula_change();
create trigger vehicle_photos_flag after insert or delete on public.vehicle_photos
  for each row execute function public.flag_photo_change();
create trigger profiles_photo_changed after update of profile_photo_link on public.profiles
  for each row execute function public.profile_photo_changed();
create trigger vehicle_photos_cap before insert on public.vehicle_photos
  for each row execute function public.cap_vehicle_photos();

-- ---------------------------------------------------------------- grants

revoke all on function public.raise_listing_flag(uuid, text) from public, anon, authenticated;
revoke all on function public.flag_flat_rate_change() from public, anon, authenticated;
revoke all on function public.flag_formula_change() from public, anon, authenticated;
revoke all on function public.flag_photo_change() from public, anon, authenticated;
revoke all on function public.profile_photo_changed() from public, anon, authenticated;
revoke all on function public.cap_vehicle_photos() from public, anon, authenticated;

revoke all on function public.listing_is_ready(uuid) from public, anon;
revoke all on function public.submit_listing_for_review(uuid) from public, anon;
revoke all on function public.review_listing(uuid, text, text) from public, anon;
revoke all on function public.resolve_listing_flag(uuid) from public, anon;
revoke all on function public.verify_profile_photo(uuid) from public, anon;
grant execute on function public.listing_is_ready(uuid) to authenticated;
grant execute on function public.submit_listing_for_review(uuid) to authenticated;
grant execute on function public.review_listing(uuid, text, text) to authenticated;
grant execute on function public.resolve_listing_flag(uuid) to authenticated;
grant execute on function public.verify_profile_photo(uuid) to authenticated;

-- ---------------------------------------------------------- photo bucket
-- Public read (traveler-facing photos). Owners write inside their own <user id>/ folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy listing_photos_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy listing_photos_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy listing_photos_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
