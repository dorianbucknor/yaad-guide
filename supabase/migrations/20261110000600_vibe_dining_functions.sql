-- Readiness for dining. Events and attractions keep their rule: a ticket and a slot (or a weekly
-- schedule with automatic creation on). A dining listing is ready when the shared fields are in,
-- it has dining details, and what its booking mode asks for is in place:
--   prepaid                 a ticket type, and a slot or an active schedule
--   reservation, slotted    a slot or an active schedule (no ticket type)
--   reservation, hours_only opening hours
--   listing_only            nothing further

create or replace function public.vibe_listing_is_ready(p_listing_id uuid)
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
    left join public.vibe_dining_profiles d on d.listing_id = l.id
    where l.id = p_listing_id
      and p.status = 'approved'
      and coalesce(btrim(l.description), '') <> ''
      and coalesce(btrim(l.area), '') <> ''
      and coalesce(btrim(l.address_line1), '') <> ''
      and coalesce(btrim(l.town), '') <> ''
      and l.parish is not null
      and l.latitude is not null
      and l.longitude is not null
      and exists (select 1 from public.vibe_photos ph where ph.listing_id = l.id and ph.is_cover)
      and (
        (l.subtype <> 'dining'
          and exists (select 1 from public.vibe_ticket_types t where t.listing_id = l.id)
          and (
            exists (select 1 from public.vibe_slots s
                    where s.listing_id = l.id and s.status = 'open' and s.starts_at > now())
            or (l.auto_generate_slots
                and exists (select 1 from public.vibe_schedule_rules r where r.listing_id = l.id))
          ))
        or (l.subtype = 'dining' and d.listing_id is not null and (
          (d.booking_mode = 'prepaid'
            and exists (select 1 from public.vibe_ticket_types t where t.listing_id = l.id)
            and (
              exists (select 1 from public.vibe_slots s
                      where s.listing_id = l.id and s.status = 'open' and s.starts_at > now())
              or (l.auto_generate_slots
                  and exists (select 1 from public.vibe_schedule_rules r where r.listing_id = l.id))
            ))
          or (d.booking_mode = 'reservation' and d.reservation_style = 'slotted'
            and (
              exists (select 1 from public.vibe_slots s
                      where s.listing_id = l.id and s.status = 'open' and s.starts_at > now())
              or (l.auto_generate_slots
                  and exists (select 1 from public.vibe_schedule_rules r where r.listing_id = l.id))
            ))
          or (d.booking_mode = 'reservation' and d.reservation_style = 'hours_only'
            and exists (select 1 from public.vibe_business_hours h where h.listing_id = l.id))
          or (d.booking_mode = 'listing_only')
        ))
      )
  );
$$;
