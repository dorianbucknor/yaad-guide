-- Closes or reopens a run of Jamaica days at once, the same as set_vibe_date_closed for each day.
-- One call is one transaction: if any day in the run has bookings, none of them close.
create function public.set_vibe_dates_closed(p_listing_id uuid, p_from date, p_to date, p_closed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.owns_vibe_listing(p_listing_id) then
    raise exception 'We couldn''t find that.' using errcode = 'P0002';
  end if;
  if p_to < p_from then
    raise exception 'The last day can''t be before the first.';
  end if;
  if p_to - p_from > 92 then
    raise exception 'Pick at most three months at a time.';
  end if;

  for v_day in select generate_series(p_from, p_to, interval '1 day')::date loop
    perform public.set_vibe_date_closed(p_listing_id, v_day, p_closed);
  end loop;
end;
$$;

revoke all on function public.set_vibe_dates_closed(uuid, date, date, boolean) from public, anon;
grant execute on function public.set_vibe_dates_closed(uuid, date, date, boolean) to authenticated;
