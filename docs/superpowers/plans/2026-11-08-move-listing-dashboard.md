# MOVE Listing and Vendor Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An approved MOVE vendor builds and publishes one listing and works from a dashboard built around a requests inbox, running on faker-seeded demo data in the local Docker stack.

**Architecture:** New Supabase tables with RLS and security-definer functions for every status change; pure TypeScript logic in `src/lib/move/` (pricing, coverage, availability, capacity, readiness, deadline, response rate); server actions in the existing `requireUser` / `ActionResult` style; screens under `/vendor` and `/admin`; a cron route expires overdue requests; a seed script fills the local database only.

**Tech Stack:** Next.js 16.4 (Cache Components), Supabase (Postgres, RLS, pgTAP, storage), zod 4, react-hook-form, TanStack Query, react-day-picker 10, MapLibre GL with OpenFreeMap tiles, `@faker-js/faker`, Vitest, Tailwind v4, shadcn on Base UI.

**Spec:** `docs/superpowers/specs/2026-11-08-move-listing-dashboard-design.md`

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (AGENTS.md).
- TypeScript `strict`; server components by default; `@/*` alias; `"use client"` only where needed.
- Every table has RLS. Never weaken existing policies. Status, review, verification and request-state columns are written only by security-definer functions.
- Forms use react-hook-form with a zod schema; server actions validate with the same schema, call `requireUser()` and reject archived users (`isArchivedUser`).
- Admin-only checks use `authorize(permission)`. This plan adds `listings.review` and `places.manage`.
- Migration names start `20261109…`. pgTAP files live in `supabase/tests/`. Local stack: `supabase start -x edge-runtime,logflare,vector,studio,imgproxy,mailpit`; `supabase test db` does not apply migrations, so run `supabase migration up` first.
- Fees, buffer and thresholds come from configuration (`src/lib/move/config.ts`), never inline. Trip buffer default 30 minutes.
- Times are `America/Jamaica` (UTC-5, no daylight saving). Store `timestamptz`; weekly windows are local times.
- Buttons and form controls are at least 44 px tall below `md`. Components that read the date (calendar) render client-only with `useIsClient`.
- Brand tokens and the design rules in `DESIGN.md`. UI tasks use the frontend-design and ui-ux-pro-max skills and the reference image the user supplied (bento layout, dark map hero, segmented status bar, bar chart, gradient earnings card, table with filter pills).
- Run quiet commands (`--reporter=dot`, `--quiet`). Do not start servers or open a browser except in the final verification task. One build, at the end.
- Never commit `.env.example` (holds real keys), `.mcp.json`, `.claude/` or `docs/legal/`. Never import the service-role client outside the cron routes.
- Branch: `feat/move-listing-dashboard`, cut from `docs/move-listing-spec` (which holds the PRD and spec) and rebased onto `main` after PR #7 merges.
- Docs sync order: PRD, then `ARCHITECTURE.md`, then `ARCHITECTURE-ESSENTIAL.md` in the same change.

## Review Focus

1. **Direct writes to protected columns.** A vendor sends `update move_listings set status='live'` (or edits `move_requests.status`, `photo_verified_at`): must be refused.
2. **Concurrent accepts.** Two pending requests overlapping in time, accepted at nearly the same moment: exactly one succeeds (row lock on the listing inside `accept_move_request`).
3. **Unlisted or uncovered places.** Pickup or drop-off outside the vendor's coverage, or not in `places`: `quoteTrip` returns `none`, `covers` is false; nothing throws.
4. **Time zones and midnight.** A window ending 23:30, a trip crossing midnight, and a blocked range that spans days: availability uses Jamaica local time.
5. **Archived or paused vendors.** An archived account's listing, and a paused listing, refuse new requests and are not "live" for any public policy.
6. **Seed safety.** The seed script run with a non-local Supabase URL (or `NODE_ENV=production`) refuses to run.

---

### Task 1: Places, suggestions and permissions

**Files:**
- Create: `supabase/migrations/20261109000100_places.sql`
- Test: `supabase/tests/places.test.sql`

**Interfaces:**
- Produces: tables `places (id, slug unique, name, kind, parish, lat, lng, active)`, `place_suggestions (id, vendor_profile_id, name, note, status)`; permissions `listings.review`, `places.manage` granted to `admin`; ~25 seeded places (list in the spec).

- [ ] **Step 1: Write the failing pgTAP test.** Assertions: `places` is readable by anon and authenticated; an authenticated non-admin cannot insert, update or delete a place; an admin (`places.manage`) can; a vendor can insert a `place_suggestions` row for their own profile and read only their own; `authorize('listings.review')` is true for admin and false for a vendor; at least 25 places seeded, and `MBJ`, `KIN`, `negril`, `montego-bay` exist with latitude between 17.5 and 18.7 and longitude between -78.5 and -76.0.
- [ ] **Step 2: Run to see it fail.** `supabase migration up --quiet; supabase test db --quiet`. Expected: FAIL (relations missing).
- [ ] **Step 3: Write the migration.** Tables with RLS, `kind` and `status` checks, audit and `set_updated_fields` triggers, grants (anon and authenticated select on `places`; admin writes through a policy using `authorize('places.manage')`), the two permissions inserted and granted to `admin`, and the seed rows. Coordinates verified against a gazetteer before commit.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git add supabase && git commit -m "feat(move): places, suggestions and permissions"`

### Task 2: Place routes (estimated distance matrix)

**Files:**
- Create: `scripts/build-place-routes.ts`, `supabase/migrations/20261109000200_place_routes.sql`, `src/lib/move/distance.ts`
- Test: `src/lib/move/distance.test.ts`, `supabase/tests/place_routes.test.sql`

**Interfaces:**
- Produces: `haversineKm(a: LatLng, b: LatLng): number`; `estimateRoute(a, b): { km: number; minutes: number }` using km = haversine × 1.4 and 45 km/h average; table `place_routes (from_place_id, to_place_id, km, minutes, estimated boolean default true)` with `from_place_id < to_place_id`, primary key on both, public read.

- [ ] **Step 1: Write failing Vitest tests.** `haversineKm` of Montego Bay to Negril is between 70 and 85 km; of a point to itself is 0; `estimateRoute` returns km 1.4 times the straight line and minutes = km / 45 × 60 rounded up.
- [ ] **Step 2: Run.** `npx vitest run src/lib/move/distance.test.ts --reporter=dot`. Expected: FAIL.
- [ ] **Step 3: Implement `distance.ts`.** Constants `CIRCUITY = 1.4`, `AVERAGE_KMH = 45` exported from `src/lib/move/config.ts`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Write `scripts/build-place-routes.ts`.** Reads the places from the migration SQL (or a shared JSON list), writes every unordered pair as `insert into place_routes` statements into the migration file. Commit the generated migration. pgTAP test: row count equals n(n-1)/2 for seeded places; no row has `from_place_id >= to_place_id`; all `estimated`.
- [ ] **Step 6: Run `supabase migration up --quiet; supabase test db --quiet`.** Expected: PASS. Commit.

### Task 3: Listing tables, vehicle luggage and photos metadata

**Files:**
- Create: `supabase/migrations/20261109000300_move_listing_tables.sql`
- Test: `supabase/tests/move_listing_tables.test.sql`

**Interfaces:**
- Produces: tables `move_listings`, `move_listing_places`, `move_flat_rates`, `move_availability_rules`, `move_blocked_ranges`, `vehicle_photos`, `listing_flags`; columns `vendor_vehicles.luggage_large`, `luggage_carry_on`, `vendor_profiles.photo_verified_at`; policy helper `owns_listing(p_listing_id uuid) returns boolean`. Shapes as in the spec. Check constraints: `place_a_id < place_b_id`, `price > 0`, `ends_at > starts_at`, weekday 0 to 6, formula fields non-negative, `description` at most 500 characters, listing's profile must be category `move`.

- [ ] **Step 1: Write failing pgTAP tests.** Vendor can insert and update only their own listing; cannot set `status`, `approved_at`, `reviewed_by`, `review_note`; cannot insert a second listing for the same profile; cannot read or write another vendor's rates, windows, blocks or photos; flat rate with reversed place order is rejected; a `stay` profile cannot own a MOVE listing; vendor cannot write `photo_verified_at`; `luggage_large` of 21 is rejected; anon cannot read any of these tables.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Write the migration.** RLS on all tables; column-level grants (vendor writes `currency`, `island_wide`, formula fields, `paused`, `description` only); audit and updated triggers; extend the vehicle update grant to the two luggage columns.
- [ ] **Step 4: Run.** Expected: PASS. **Step 5: Commit.**

### Task 4: Listing functions, triggers and photo bucket

**Files:**
- Create: `supabase/migrations/20261109000400_move_listing_functions.sql`
- Test: `supabase/tests/move_listing_functions.test.sql`

**Interfaces:**
- Consumes: Task 3 tables.
- Produces: functions `submit_listing_for_review(p_listing_id uuid) returns void`, `review_listing(p_listing_id uuid, p_decision text, p_note text) returns void` (decision `approve` or `reject`), `resolve_listing_flag(p_id uuid)`, `verify_profile_photo(p_profile_id uuid)`, `listing_is_ready(p_listing_id uuid) returns boolean`; triggers that raise `listing_flags` on price and photo changes of a live listing and on `profiles.photo` change; trigger capping `vehicle_photos` at eight per vehicle and four extras; public-read bucket `listing-photos` (JPG, PNG, WebP, 5 MB) with owner-only write policies on path `<account_id>/<vehicle_id>/<file>`.

- [ ] **Step 1: Write failing pgTAP tests.** `submit_listing_for_review` fails with a message when not ready (missing photo kind, no coverage, no price, no window, unverified profile photo) and succeeds when ready, setting `in_review`; `review_listing` requires `listings.review`, approve sets `live` and `approved_at`, reject returns `draft` with the note; editing a flat rate or formula on a live listing creates exactly one open `price` flag (second edit does not duplicate); uploading a vehicle photo to a live listing creates a `photo` flag; changing `profiles.photo` clears `photo_verified_at` and flags a live listing; ninth photo and fifth extra are rejected; a vendor cannot upload into another account's folder; `verify_profile_photo` requires `documents.verify`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement the migration.** All functions security definer with `set search_path = ''`; revoke from public and anon; grant to authenticated (and `service_role` where noted).
- [ ] **Step 4: Run.** Expected: PASS. **Step 5: Commit.**

### Task 5: Requests, accept, decline, expire, response rate

**Files:**
- Create: `supabase/migrations/20261109000500_move_requests.sql`
- Test: `supabase/tests/move_requests.test.sql`

**Interfaces:**
- Consumes: Tasks 3 and 4 tables.
- Produces: table `move_requests` (columns in the spec); functions `accept_move_request(p_id uuid, p_note text)`, `decline_move_request(p_id uuid, p_reason text)`, `expire_move_requests() returns integer` (service role only), `move_response_rate(p_profile_id uuid) returns numeric` (null under five requests in 90 days).

- [ ] **Step 1: Write failing pgTAP tests.** Vendor reads only their requests; vendor cannot update `move_requests` directly; accept sets `accepted`, `responded_at`, `vendor_note`; accept fails after `respond_by`, for another vendor's request, for a non-pending request, when the vendor has an overlapping accepted request, and for an archived or paused listing; of two overlapping pending requests only the first accept succeeds; decline requires one of the four reasons; `expire_move_requests()` marks overdue pending rows `expired`, is callable by `service_role` only, and returns the count; response rate counts answered-in-time over received, null below five.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Lock the listing row (`select … for update`) inside `accept_move_request`; compute overlap with accepted requests using a window of `pickup_at` minus the buffer through `pickup_at` plus route minutes plus the buffer (buffer from a configuration table `app_settings` seeded with `move_trip_buffer_minutes = 30`, or a function constant read from one place).
- [ ] **Step 4: Run.** Expected: PASS. **Step 5: Commit.**

### Task 6: Pricing, coverage and capacity logic

**Files:**
- Create: `src/lib/move/config.ts`, `src/lib/move/types.ts`, `src/lib/move/pricing.ts`, `src/lib/move/coverage.ts`, `src/lib/move/capacity.ts`
- Test: `src/lib/move/pricing.test.ts`, `coverage.test.ts`, `capacity.test.ts`

**Interfaces:**
- Produces:
  - `quoteTrip(listing: PricingListing, fromId: string, toId: string, routes: RouteLookup): Quote` where `Quote = { source: 'flat' | 'formula'; amount: number; currency: 'usd' | 'jmd' } | { source: 'none' }`
  - `quoteHire(listing: PricingListing, hours: number): Quote`
  - `covers(listing: CoverageListing, fromId: string, toId: string): boolean`
  - `coversItinerary(listing: CoverageListing, legs: { fromId: string; toId: string }[]): boolean`
  - `fits(vehicle: { seats: number; large: number; carryOn: number }, party: { size: number; large: number; carryOn: number }): boolean`

- [ ] **Step 1: Write failing tests.** Flat rate wins over formula and applies both directions; formula is `base_fare + km × per_km`, rounded to cents; no flat rate and no formula gives `none`; unknown place gives `none`; `quoteHire` is `hourly_rate × hours`, `none` without an hourly rate; `covers` true when both places are covered or `island_wide`, false when either is missing; `coversItinerary` needs every leg; `fits` fails on seats, on large bags, and treats two carry-ons as one large bag only if the spec's rule says so (it does not: they are separate counts); party of 4 with 6 large bags fails a sedan with 3 large.
- [ ] **Step 2: Run.** `npx vitest run src/lib/move --reporter=dot`. Expected: FAIL.
- [ ] **Step 3: Implement.** Pure functions, no I/O. **Step 4: Run.** Expected: PASS. **Step 5: Commit.**

### Task 7: Availability, deadline, readiness and response-rate logic

**Files:**
- Create: `src/lib/move/availability.ts`, `deadline.ts`, `readiness.ts`, `response-rate.ts`, `time.ts`
- Test: matching `*.test.ts` files

**Interfaces:**
- Produces:
  - `toJamaica(date: Date): { weekday: number; minutes: number; day: string }`
  - `isAvailable(input: { paused: boolean; rules: Rule[]; blocks: Block[]; accepted: Accepted[]; start: Date; end: Date; bufferMinutes: number }): { ok: true } | { ok: false; reason: 'paused' | 'outside_hours' | 'blocked' | 'overlap' }`
  - `responseDeadline(now: Date, pickupAt: Date): Date | null` (24 h, or half the time left if shorter, never under 1 h; `null` when pickup is under 2 h away)
  - `readiness(input: ReadinessInput): { ready: boolean; missing: ReadinessItem[] }`
  - `responseRate(requests: { status: string; createdAt: Date; respondedAt: Date | null; respondBy: Date }[], now: Date): number | null`

- [ ] **Step 1: Write failing tests** for: a window 08:00 to 18:00 accepts 09:00 to 11:00 and rejects 17:00 to 19:00; trip crossing midnight needs both days covered; a block spanning three days rejects any overlap; an accepted trip plus buffer rejects a trip 20 minutes after it ends and accepts one 31 minutes after; paused returns `paused`; UTC midnight is 19:00 the previous day in Jamaica; deadline cases (pickup in 3 days gives 24 h; in 10 h gives 5 h; in 1.5 h gives `null`); readiness lists exactly the missing items; response rate below five requests is `null`, in-time answers count, expired and late answers do not, requests older than 90 days are ignored.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement.** **Step 4: Run.** Expected: PASS. **Step 5: Commit.**

### Task 8: Listing schemas, actions and queries

**Files:**
- Create: `src/lib/schemas/move.ts`, `src/lib/move/actions.ts`, `src/lib/move/queries.ts`
- Test: `src/lib/schemas/move.test.ts`, `src/lib/move/actions.test.ts`

**Interfaces:**
- Consumes: `ActionResult`, `fromZod`, `requireUser` pattern (copy the private helper from `src/lib/vendor/actions.ts` into a shared `src/lib/auth/require-user.ts` and use it in both; do not duplicate).
- Produces schemas `listingSchema`, `flatRateSchema`, `availabilityRuleSchema`, `blockedRangeSchema`, `vehicleLuggageSchema`, `placeSuggestionSchema`; actions `saveListingAction`, `setCoverageAction`, `saveFlatRateAction`, `deleteFlatRateAction`, `saveAvailabilityAction`, `blockRangeAction`, `unblockRangeAction`, `setPausedAction`, `saveLuggageAction`, `registerVehiclePhotoAction`, `removeVehiclePhotoAction`, `submitListingAction`, `suggestPlaceAction`; queries `getMyListing()`, `getPlaces()`, `getPlaceRoutes()`, `getListingReadiness()`.

- [ ] **Step 1: Write failing tests.** Schemas: negative price rejected, window with end before start rejected, description over 500 rejected, luggage over 20 rejected, block range with end before start rejected. Actions (Supabase client mocked as in existing `actions.test.ts`): unauthenticated returns the sign-in message, archived user is refused, validation errors return `fieldErrors`, a `P0001` database error surfaces its message.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement.** Overlapping blocks are merged in `blockRangeAction`. Queries use `await connection()` and are called inside `<Suspense>`. **Step 4: Run.** Expected: PASS. **Step 5: Commit.**

### Task 9: Request actions, dashboard queries and expiry cron

**Files:**
- Create: `src/lib/move/request-actions.ts`, `src/lib/move/dashboard-queries.ts`, `src/app/api/cron/expire-move-requests/route.ts`; modify `vercel.json`, the admin-client importer test in `src/app/api/cron/purge-archived/route.test.ts`
- Test: `src/lib/move/request-actions.test.ts`, `src/app/api/cron/expire-move-requests/route.test.ts`

**Interfaces:**
- Produces: `acceptRequestAction(input: { id: string; note?: string }): Promise<ActionResult>`, `declineRequestAction(input: { id: string; reason: DeclineReason }): Promise<ActionResult>`, `getDashboard(): Promise<DashboardData>` (requests with deadline, status counts for 30 days, 14-day answered-in-time series, response rate, earnings by period from accepted and completed requests); route `GET /api/cron/expire-move-requests` with the same `CRON_SECRET` check and cron entry `*/10 * * * *`.

- [ ] **Step 1: Write failing tests.** Actions: reason must be one of the four, note at most 300 characters, archived refused, database error surfaced; route: 401 without the secret, 200 with `{ expired: n }`, failure returns 500 without leaking details; the source test now allows exactly the two cron routes to import the admin client.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement.** Overdue pending rows are shown as `expired` by `getDashboard` even before the cron runs. **Step 4: Run.** Expected: PASS. **Step 5: Commit.**

### Task 10: Faker demo seed for the local stack

**Files:**
- Create: `scripts/seed-demo.ts`, `scripts/seed-guard.ts`; modify `package.json` (script `seed:demo`, devDependency `@faker-js/faker`), `README.md`
- Test: `scripts/seed-guard.test.ts` (add `scripts/**/*.test.ts` to the Vitest include)

**Interfaces:**
- Produces: `assertLocalSupabase(url: string | undefined, nodeEnv: string | undefined): void` (throws unless the host is `127.0.0.1` or `localhost` and `nodeEnv !== 'production'`); `npm run seed:demo`.

- [ ] **Step 1: Write failing tests.** Guard accepts `http://127.0.0.1:54321` and `http://localhost:54321`; rejects a `*.supabase.co` URL, an empty value, and a local URL when `NODE_ENV=production`.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement the guard, then the seed.** The seed uses `faker.seed(42)`, reads the local service key from `supabase status -o env`, creates demo users (`@example.test`), approved MOVE vendors with vehicles, placeholder photo rows, listings with coverage, flat rates, formula and weekly windows, and 60 to 120 requests over 90 days across every status, including pending rows with near deadlines. It is idempotent (clears prior demo rows by email domain first).
- [ ] **Step 4: Run tests.** Expected: PASS. **Step 5: Commit.** (Running the seed itself happens in Task 15.)

### Task 11: Listing editor screens

**Files:**
- Create: `src/app/vendor/listing/page.tsx`, `src/components/move/` (`listing-tabs.tsx`, `overview-tab.tsx`, `pricing-tab.tsx`, `coverage-tab.tsx`, `availability-tab.tsx`, `photos-tab.tsx`, `readiness-card.tsx`, `place-picker.tsx`)

**Interfaces:**
- Consumes: Task 8 actions and queries, Task 7 `readiness`.

- [ ] **Step 1: Invoke the frontend-design and ui-ux-pro-max skills; read `DESIGN.md`.**
- [ ] **Step 2: Build the page and tabs.** Overview: status, readiness checklist with links to the missing step, pause switch, description. Pricing: currency, formula fields, flat-rate table between covered places. Coverage: place picker with the island-wide switch and "suggest a missing place". Availability: weekly windows editor. Photos: four required slots and extras, luggage capacity fields, profile-photo status. All forms use react-hook-form plus the zod schemas; field errors inline; 44 px targets.
- [ ] **Step 3: Typecheck and lint only.** `npm run typecheck --silent; npm run lint --silent`. Commit.

### Task 12: Calendar screen with range selection

**Files:**
- Create: `src/app/vendor/calendar/page.tsx`, `src/components/move/blocked-calendar.tsx`

- [ ] **Step 1: Build the client-only calendar** (`useIsClient`) with react-day-picker 10 range mode: select a range, then Block or Unblock; show blocked ranges, accepted trips and pending requests; list of blocked ranges with remove buttons. Uses `blockRangeAction` and `unblockRangeAction`.
- [ ] **Step 2: Typecheck and lint. Commit.**

### Task 13: Dashboard and requests table

**Files:**
- Create: `src/app/vendor/requests/page.tsx`, `src/components/move/dashboard/` (`dashboard.tsx`, `dashboard-map.tsx`, `status-overview.tsx`, `performance-chart.tsx`, `requests-table.tsx`, `request-actions.tsx`, `earnings-card.tsx`, `countdown.tsx`, `pill-nav.tsx`); modify `src/app/vendor/page.tsx`; add dependency `maplibre-gl`

**Interfaces:**
- Consumes: Task 9 `getDashboard`, `acceptRequestAction`, `declineRequestAction`.
- Produces: `DashboardMap({ pins, routes, activePinId, onSelect })` loaded with `next/dynamic` (`ssr: false`) and a fixed-height skeleton.

- [ ] **Step 1: Invoke the frontend-design and ui-ux-pro-max skills; study the supplied reference image and `DESIGN.md`.** Pick a dark OpenFreeMap style; show attribution.
- [ ] **Step 2: Build the bento dashboard** as laid out in the spec: pill nav, map hero, status overview bar, 14-day performance bars (CSS or SVG), requests table with filter pills and status chips, countdown on pending rows, inline Accept (optional note) and Decline (reason picker), earnings card with period tabs on demo data. `/vendor` shows it for approved MOVE vendors and the existing onboarding hub otherwise. Empty, loading and error states; light and dark; single column on mobile.
- [ ] **Step 3: Typecheck and lint. Commit.**

### Task 14: Admin screens

**Files:**
- Create: `src/app/admin/places/page.tsx`, `src/app/admin/listings/page.tsx`, `src/lib/move/admin-actions.ts`, `src/components/admin/` additions; modify the existing vendor review screen
- Test: `src/lib/move/admin-actions.test.ts`

**Interfaces:**
- Produces: `savePlaceAction`, `resolveSuggestionAction`, `reviewListingAction(input: { listingId: string; decision: 'approve' | 'reject'; note?: string })`, `resolveFlagAction`, `verifyProfilePhotoAction`.

- [ ] **Step 1: Write failing tests** for the admin actions: refused without the permission (database `42501` becomes "You can't do that."), validation of decision and note, archived admin refused.
- [ ] **Step 2: Run.** Expected: FAIL. **Step 3: Implement the actions and screens** (places table with add and edit, suggestions inbox; listing queue with first-listing review and the open flags; "photo shows the driver" check in the vendor review). **Step 4: Run tests, typecheck, lint.** Expected: PASS. **Step 5: Commit.**

### Task 15: Documents, seed run and final verification

**Files:**
- Modify: `ARCHITECTURE.md`, `ARCHITECTURE-ESSENTIAL.md`, `README.md`, `AGENTS.md` (fix "All prices are USD"), `vercel.json` already updated

- [ ] **Step 1: Update docs in order:** `ARCHITECTURE.md` (data model, API boundaries, decisions: new tables, functions, cron route, estimated routes, demo seed), then `ARCHITECTURE-ESSENTIAL.md` (faithful summary only), then README (seed commands, new cron route and env, bucket) and the stale price lines.
- [ ] **Step 2: One verification batch.** `supabase db reset --local`, `npm run seed:demo`, `supabase test db --quiet`, `npm run test -- --reporter=dot`, `npm run typecheck --silent`, `npm run lint --silent`, one `npm run build --silent`; start the dev server once, check `/vendor`, `/vendor/listing`, `/vendor/calendar`, `/admin/listings` in light, dark and phone width against the seeded data, then stop the server.
- [ ] **Step 3: Whole-branch review** (one reviewer, Sonnet, against the Review Focus list), one fix pass, then commit and use superpowers:finishing-a-development-branch.
