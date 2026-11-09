-- PRD: each vendor sets a cancellation and refund policy per listing, shown to the traveler before paying.
-- MOVE offers two tiers; the refund itself is worked out at booking time (separate spec).
alter table public.move_listings
  add column cancellation_policy text not null default 'flexible'
  check (cancellation_policy in ('flexible', 'moderate'));
