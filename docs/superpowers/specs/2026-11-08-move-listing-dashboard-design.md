# MOVE listing and vendor dashboard: design

Date: 2026-11-08. Status: draft for review. Source of decisions: `PRD.md` (Booking and checkout > MOVE listing, Vendor dashboard), settled in the 2026-11-07 and 2026-11-08 brainstorm. Builds on vendor onboarding (`vendor_profiles`, `vendor_vehicles`, `vendor_documents`), permissions (`authorize()`) and settings (archived accounts).

## Goal

An approved MOVE vendor can build and publish one listing (where they drive, what they charge, when they work, what their car looks like), and sees a dashboard built around a requests inbox. Booking and payment do not exist yet, so the requests come from seeded demo data. When booking is built it writes the same `move_requests` rows and the dashboard needs no change.

## Scope

In:
- Places list (admin managed), driving-distance matrix between places.
- Listing: coverage, hybrid pricing, weekly schedule, blocked dates, pause, vehicle luggage capacity, vehicle photos, profile-photo check.
- Publishing: first-listing admin review, flags for later price and photo changes.
- `move_requests` table, accept and decline (security-definer functions), response rate.
- Vendor dashboard (bento layout, map hero) and the listing, calendar and requests pages.
- Admin: places, first-listing review, flags, profile-photo check.
- Faker seed script for the local Docker stack.

Out (separate specs): traveler browse and search, booking and payment, cancellations, reviews, tiers and multi-driver fleets, counter-offers, email and push notifications, real earnings, calendar sync, the `region-map-kit` swap.

## Decisions carried from the PRD

- One listing per vendor profile. The listing's vehicle is the vendor's active vehicle (`vendor_vehicles.is_active`, already unique per profile). Availability belongs to the vendor, so a driver is never double-booked.
- Prices are entered in the listing's currency, USD or JMD, one currency per listing.
- Hybrid pricing: flat price per place pair, plus formula (base fare, per-km, hourly for day hire) for other pairs between the vendor's places.
- Coverage: set of places plus an island-wide switch. A trip qualifies when pickup and drop-off are both covered; multi-stop itineraries need every leg covered.
- Capacity: passenger seats (existing) plus luggage: large bags and carry-ons.
- Photos: front, rear, interior, luggage space required (4 minimum, 8 maximum). Profile photo required, must show a person, admin-checked, re-checked when changed.
- Publishing: admin reviews the first listing only. Later changes to prices or photos on a live listing raise a flag and stay live.
- Requests: accept with optional note, decline with a reason (dates blocked, too far, vehicle unavailable, other). Expired requests count against the response rate.
- Pause switch hides the listing and refuses new requests; confirmed trips stand.

## Data model

All tables have row-level security, `created_at`, `updated_at` and the existing audit and `set_updated_fields` triggers. Writes to status columns go through security-definer functions only.

### `places` (admin owned, public read)
`id`, `slug` unique, `name`, `kind` (`airport`, `city`, `town`, `resort_area`), `parish`, `lat`, `lng`, `active`. Seeded in the migration with about 25 places: MBJ, KIN, OCJ (Ian Fleming), Montego Bay, Negril, Ocho Rios, Kingston, Port Antonio, Treasure Beach, Falmouth, Runaway Bay, Discovery Bay, Mandeville, Black River, Savanna-la-Mar, Lucea, Port Maria, Oracabessa, Annotto Bay, Morant Bay, Spanish Town, Portmore, Rose Hall, Ironshore, Whitehouse. Coordinates are checked against a gazetteer before merge; within 1 km is enough for pricing.

### `place_routes` (admin owned, public read)
`from_place_id`, `to_place_id`, `km`, `minutes`; one row per unordered pair stored with `from < to`. Produced once by a script from a routing service and committed as seed data, so the app never calls a routing API. Missing pairs fall back to great-circle distance times 1.4 and are marked `estimated`.

### `place_suggestions`
`id`, `vendor_profile_id`, `name`, `note`, `status` (`open`, `added`, `dismissed`). Vendors insert, admin resolves.

### `move_listings`
`id`, `vendor_profile_id` unique (must be a `move` profile), `currency` (`usd`, `jmd`), `island_wide` boolean, `base_fare`, `per_km`, `hourly_rate` (all nullable numerics, non-negative), `status` (`draft`, `in_review`, `live`), `paused` boolean default false, `approved_at`, `reviewed_by`, `review_note`, `description` (optional, 500 characters).

Vendor-writable columns: `currency`, `island_wide`, the three formula fields, `paused`, `description`. `status`, `approved_at`, review fields change only through functions.

### `move_listing_places`
`listing_id`, `place_id`; primary key on both.

### `move_flat_rates`
`listing_id`, `place_a_id`, `place_b_id` with `place_a_id < place_b_id`, `price` (> 0). Rates apply in both directions. Both places must be in the listing's coverage.

### `move_availability_rules`
`id`, `listing_id`, `weekday` (0 to 6), `starts_at` time, `ends_at` time (> starts), allowing several windows a day. Times are Jamaica time (`America/Jamaica`, no daylight saving).

### `move_blocked_ranges`
`id`, `listing_id`, `starts_at` timestamptz, `ends_at` timestamptz (> starts), `note`. A multi-day selection in the calendar creates one row. Overlapping ranges are merged on insert.

### `vendor_vehicles` (altered)
Add `luggage_large` and `luggage_carry_on` (integers 0 to 20, default 0). Existing grants are extended to the two columns.

### `vehicle_photos`
`id`, `vehicle_id`, `kind` (`front`, `rear`, `interior`, `luggage`, `extra`), `storage_path`, `position`. Unique on `(vehicle_id, kind)` for the four required kinds; up to four extras (maximum eight rows per vehicle, enforced by a trigger). Stored in a new public-read bucket `listing-photos` (JPG, PNG, WebP, 5 MB), path `<account_id>/<vehicle_id>/<file>`, writable only by the owner.

### `vendor_profiles` (altered)
Add `photo_verified_at` timestamptz. Admin sets it through `verify_profile_photo(profile_id)`. A trigger on `profiles` clears it for the account's vendor profiles whenever `profiles.photo` changes, and raises a `profile_photo` flag if the vendor has a live listing.

### `listing_flags`
`id`, `listing_id`, `kind` (`price`, `photo`, `profile_photo`), `detail` jsonb, `created_at`, `resolved_at`, `resolved_by`. Triggers on `move_flat_rates`, the formula columns and `vehicle_photos` insert a flag when the listing is `live` (one open flag per kind).

### `move_requests`
`id`, `listing_id`, `vendor_profile_id`, `traveler_id`, `pickup_place_id`, `dropoff_place_id`, `pickup_at` timestamptz, `party_size`, `bags_large`, `bags_carry_on`, `quoted_amount`, `quoted_currency`, `quote_source` (`flat`, `formula`), `status` (`pending`, `accepted`, `declined`, `expired`, `completed`, `cancelled`), `respond_by` timestamptz, `responded_at`, `vendor_note`, `decline_reason` (`dates_blocked`, `too_far`, `vehicle_unavailable`, `other`), `created_at`. Booking adds payment and itinerary columns later. Vendors can read their own rows. Travelers will read theirs when booking lands.

Functions (security definer, owner checked inside):
- `accept_move_request(p_id uuid, p_note text)`: pending, not past `respond_by`, no overlapping accepted request, within availability; sets `accepted`, `responded_at`, `vendor_note`.
- `decline_move_request(p_id uuid, p_reason text)`: pending; sets `declined`.
- `expire_move_requests()`: service-role only; marks overdue pending rows `expired`. A cron route (`/api/cron/expire-move-requests`, every 10 minutes, `CRON_SECRET`) calls it. Queries also treat overdue pending rows as expired, so the UI is right between cron runs.
- `submit_listing_for_review(p_listing_id)`: checks readiness, sets `in_review`. For a listing that has already been approved, submission is not needed.
- `review_listing(p_listing_id, p_decision, p_note)`: admin, `listings.review`. Approve sets `live` and `approved_at`; reject returns it to `draft` with the note.
- `resolve_listing_flag(p_id)`: admin.
- `verify_profile_photo(p_profile_id)`: admin, `documents.verify`.
- `move_response_rate(p_profile_id)`: view or function. Answered in time divided by received, over the last 90 days; null below five requests.

Permissions added to `role_permissions` for `admin`: `listings.review`, `places.manage`.

## Readiness (to submit or stay live)

A listing is ready when all of these hold, computed by one pure function in `src/lib/move/readiness.ts` and mirrored in `submit_listing_for_review`:
1. Vendor profile `approved`.
2. Active vehicle with luggage capacity set and the four required photos.
3. Profile photo present and `photo_verified_at` set.
4. Coverage: at least one place, or `island_wide`.
5. Pricing: at least one flat rate, or `base_fare` and `per_km`.
6. Availability: at least one weekly window.

If a live listing stops meeting readiness (for example a profile photo is replaced), it stays live and shows a banner to the vendor and a flag to admin; it is not hidden automatically.

## Logic (pure TypeScript, tested)

`src/lib/move/`:
- `pricing.ts`: `quoteTrip(listing, from, to, routes)` returns `{ amount, currency, source: 'flat' | 'formula' } | { source: 'none' }`. Flat rate wins; otherwise `base_fare + km * per_km`; day hire uses `hourly_rate * hours`. Not covered or no price gives `none`, which the booking spec turns into a custom-quote request.
- `coverage.ts`: `covers(listing, from, to)`; `coversItinerary(listing, legs)`.
- `availability.ts`: `isAvailable(listing, window, accepted)` checks pause, weekly windows, blocked ranges and overlap with accepted requests, with a configurable buffer around each trip (default 30 minutes plus route time).
- `capacity.ts`: `fits(vehicle, partySize, bags)`.
- `readiness.ts`, `response-rate.ts`, `deadline.ts` (the response deadline rule already in the PRD: 24 hours, or half the time left, never under 1 hour).

Fees, buffer and thresholds live in configuration, not in these files.

## Routes and screens

- `/vendor`: approved MOVE vendors see the dashboard; others see the existing onboarding hub.
- `/vendor/requests`: full requests table.
- `/vendor/listing`: tabs for Overview (status, readiness, pause), Pricing, Coverage, Availability, Photos.
- `/vendor/calendar`: week and month view; range select (react-day-picker range mode) to block or unblock several days; client-only (`useIsClient`).
- `/admin/places`, `/admin/listings` (first-listing queue, flags), and a profile-photo check in the existing vendor review.

Server actions validate with zod schemas shared with the forms and check `isArchivedUser`. Reads go through TanStack Query where a screen is interactive.

## Dashboard design

Direction: the reference image (bento layout, dark map hero, segmented status bar, bar chart, gradient earnings card, table with filter pills and status chips). Built with the frontend-design and ui-ux-pro-max skills under `DESIGN.md`: brand tokens, the route-line motif where it fits, no cream or clay defaults, 44 px targets below `md`.

Layout (desktop, then single column on mobile):

```
[ pill nav: Overview  Requests  Listing  Calendar        bell  avatar ]
[ Map hero (dark)                         ][ Status overview (bar)   ]
[                                         ][ Response performance    ]
[ Requests table + filter pills           ][ Earnings (gradient)     ]
```

- **Map hero:** MapLibre GL with OpenFreeMap tiles (no key). The map shows the vendor's covered places as pins and pending request routes as lines; pin selection highlights the table row. One `DashboardMap` component with props `pins`, `routes`, `activePinId`, `onSelect`, so the `region-map-kit` can replace it. Loaded client-side with `next/dynamic`, with a fixed-height skeleton. Style: any dark OpenFreeMap style that reads well; show the attribution OpenFreeMap requires.
- **Status overview:** segmented bar of pending, accepted, declined, expired for the last 30 days with percentages.
- **Response performance:** 14-day bar chart of answered-in-time share, plus the 90-day response rate; plain CSS or SVG bars, no chart library.
- **Requests table:** columns request id, traveler first name, route (pickup to drop-off), pickup time, party and bags, quote, deadline countdown, status chip. Filter pills: All, Pending, Accepted, Declined, Expired. Accept (with optional note) and Decline (reason picker) are inline actions on pending rows. Countdown updates on the client.
- **Earnings card:** gradient card with period tabs (Week, Month, 6 months, Year) showing seeded demo totals. Its data comes from accepted and completed demo requests.
- States: loading skeletons, empty states with a next step ("Your listing isn't live yet: 2 steps left"), error text that says what to do. Light and dark themes both supported.

## Demo data (development only)

- `scripts/seed-demo.ts` (`npm run seed:demo`), using `@faker-js/faker` as a dev dependency with a fixed seed so runs are repeatable.
- Targets the local Docker Supabase only. The script reads the URL and refuses to run unless the host is `127.0.0.1` or `localhost` and `NODE_ENV` is not `production`; it takes the local service key from `supabase status`, never from `.env`.
- Creates demo users (emails `@example.test`), approved MOVE vendors with vehicles, photos from placeholder files, listings with coverage, rates and weekly windows, and a spread of 60 to 120 requests over the last 90 days across all statuses, including a few pending with near deadlines.
- Real reference data (the places list and the distance matrix) is migration or seed SQL, not faker.
- `supabase db reset` rebuilds the database; the seed runs after it. README documents the commands. The seed file is excluded from production deployment and a test fails if a non-local host is accepted.

## Security

- RLS on every new table; vendors read and write only their own listing, rates, windows, blocks, photos and requests; public read only for live, unpaused listings of non-archived accounts (via `account_is_active`) once the browse spec adds that policy. Until then no public policy exists.
- Vendors cannot write `status`, `approved_at`, review fields, `photo_verified_at` or request status columns directly.
- `listing-photos` is public read by design (traveler-facing photos) and owner-write only; file names are generated, not user supplied.
- The profile photo remains in the existing `avatars` bucket.
- Vendor contact details stay hidden; the dashboard shows travelers' first names only until booking is confirmed (booking spec decides the rest).
- The new cron route reuses the `CRON_SECRET` check and is the only other user of the service-role client, so the existing source test that limits its importers is updated to list both routes.

## Testing

- pgTAP: RLS (own versus other vendor, admin, anon), status columns not writable, accept and decline rules (deadline, overlap, availability), flag triggers, photo caps, profile-photo trigger, readiness function.
- Vitest: pricing, coverage, availability, capacity, readiness, response rate, deadline, seed host guard, the cron route.
- One verification batch at the end: typecheck, lint, tests, one build (the calendar and map are client-only), and one browser pass on the dashboard with seeded data in both themes and at phone width.

## Documents to update

PRD (done for the decisions), then `ARCHITECTURE.md` (data model, API boundaries, decisions) and `ARCHITECTURE-ESSENTIAL.md` in the same change, README (seed commands, new cron route and env), and the stale "all prices USD" lines in `AGENTS.md` and `ARCHITECTURE-ESSENTIAL.md`.

## Open implementation questions

- Routing source for `place_routes` and its usage terms (a self-hosted OSRM or OpenRouteService extract is safest; the public demo servers are not for bulk use).
- Default trip buffer (30 minutes is a starting value).

Decided in review: the map hero uses any dark OpenFreeMap style that reads well (check which are published at build time; restyle only if none is dark enough), and the listing `description` ships in v1 (optional, 500 characters, edited on the Overview tab).
