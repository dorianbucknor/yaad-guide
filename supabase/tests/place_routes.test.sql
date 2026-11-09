begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select is((select count(*) from public.place_routes),
  (select (count(*) * (count(*) - 1) / 2) from public.places),
  'there is one route for every pair of places');
select is((select count(*) from public.place_routes where from_place_id >= to_place_id),
  0::bigint, 'pairs are stored in order');
select is((select count(*) from public.place_routes where not estimated),
  0::bigint, 'every route is marked estimated');
select ok((select km from public.place_routes r
  join public.places a on a.id = r.from_place_id
  join public.places b on b.id = r.to_place_id
  where a.slug in ('montego-bay', 'negril') and b.slug in ('montego-bay', 'negril')) between 60 and 100,
  'Montego Bay to Negril is about 80 road km');

set local role anon;
select cmp_ok((select count(*) from public.place_routes), '>', 0::bigint, 'anon reads routes');

select * from finish();
rollback;
