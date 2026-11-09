# Vibe Vendor Side Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Vibe vendor can sign up, list events and attractions, set tickets, schedule and capacity, and submit listings for admin review.

**Architecture:** Dedicated `vibe_*` tables mirroring `move_*`. Status and review are written only by security-definer SQL functions. Slot generation lives in SQL (`generate_vibe_slots`). Pure logic (pricing, readiness, cutoff) lives in `src/lib/vibe/`, validated by zod schemas in `src/lib/schemas/vibe.ts`, written through server actions, and read through server queries. UI is built with the `impeccable` skill.

**Tech Stack:** Next.js 16 (Cache Components), Supabase (Postgres, RLS, pgTAP), zod 4, Vitest, MapLibre (OpenFreeMap), shadcn on Base UI.

**Spec:** `docs/superpowers/specs/2026-11-09-vibe-vendor-side-design.md`

## Global Constraints

- Read `ARCHITECTURE-ESSENTIAL.md` first; open `DESIGN.md` for any UI task. `AGENTS.md`: this Next.js has breaking changes; check `node_modules/next/dist/docs/` before writing Next code.
- Cache Components: call `await connection()` before reading the session or the clock; any client component reading `usePathname`/`searchParams` sits inside `<Suspense>`.
- Never weaken RLS. Vendors write only rows under their own vendor profile. Status, review and `free_confirmed_at` are never in a column grant. No public read policy in this cycle.
- Currency values are stored lowercase `'usd' | 'jmd'` (the Move convention); the UI shows USD and JMD.
- Jamaica time is a fixed UTC-5, no daylight saving. Reuse `src/lib/move/time.ts` (`toJamaica`, `jamaicaDayStart`, `localDayOf`, `JAMAICA_OFFSET_MS`, `DAY_MS`); do not duplicate it.
- Slot window 90 days; default booking cutoff 60 minutes, allowed 0 to 10080; ticket description at most 200 characters; discount above 0 and below 100; free ticket needs confirmation; free ticket cannot carry a discount.
- Commands: use quiet flags. Run `npm run typecheck`, `npm run lint`, `npm run test` and `npx supabase test db` once at the end (Task 14), not after every task. Per task, run only that task's test file.
- Commit with the `conventions` skill rules; end commits with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Do not push or open PRs unless asked.
- UI tasks (8 to 12): invoke `impeccable:impeccable` first, follow its Setup (`context`, then `reference/craft-floor.md` before editing). Use shadcn components from `src/components/ui/`; add new ones with the shadcn CLI or MCP, never by hand.

## Rulings made while planning (deviations from the spec, with cost if wrong)

- **Slot generation is tested with pgTAP, not Vitest.** It runs in SQL so it is atomic and has one source of truth. Cost if wrong: a TS mirror would be needed for previews.
- **Coordinates are `latitude`/`longitude` numeric columns,** not a geopoint type, matching `places` (no PostGIS). Cost: a later migration if PostGIS is adopted.
- **Flags use a new `vibe_listing_flags` table,** not `listing_flags`, whose `listing_id` references `move_listings`. Cost: two flag tables for the admin queue to read.
- **Tickets are saved through the `save_vibe_ticket_type` function,** so `free_confirmed_at` can never be set by a client.
- **Closing a date is refused when any slot that day has bookings.** Cancelling booked slots belongs to the booking cycle.

## Review Focus

Each line has its test in the task that owns the code.

- Lowering a slot's capacity below `booked`, or inserting `booked > capacity`, is rejected (Task 3).
- A weekly slot at 23:30 or 00:30 Jamaica time lands on the right local weekday and calendar day (Task 3).
- Regeneration never deletes or alters slots that have bookings or were edited by hand, and skips blocked dates (Task 3).
- A price of 0 without confirmation is rejected by the database even if the client skips the dialog; a discount on a free ticket is rejected; discount rounding is to 2 decimals (Tasks 3, 4, 5).
- Another vendor, and an anonymous user, cannot read a listing's address or coordinates (Task 2).
- Booking cutoff outside 0 to 10080 is rejected (Tasks 2, 5).

## File Structure

- `supabase/migrations/20261110000100_vibe_vendor_documents.sql`: new document types, category-aware submit/review.
- `supabase/migrations/20261110000200_vibe_listing_tables.sql`: tables, RLS, grants, triggers.
- `supabase/migrations/20261110000300_vibe_listing_functions.sql`: readiness, submit/review, flags, ticket RPC, slot functions.
- `supabase/tests/vibe_vendor_documents.test.sql`, `vibe_listing_tables.test.sql`, `vibe_listing_functions.test.sql`.
- `src/lib/vibe/`: `config.ts`, `pricing.ts`, `cutoff.ts`, `readiness.ts`, `types.ts`, `queries.ts`, `actions.ts`, `profile-actions.ts`, `admin-queries.ts`, `admin-actions.ts` (+ `.test.ts` beside each).
- `src/lib/schemas/vibe.ts` (+ test).
- `src/app/api/cron/extend-vibe-slots/route.ts` (+ test); `vercel.json`.
- `src/app/v/vibe/...` pages; `src/components/vibe/...` UI; `src/app/admin/listings` extended.

---

### Task 1: Vibe vendor documents and category-aware profile review

**Files:**
- Create: `supabase/migrations/20261110000100_vibe_vendor_documents.sql`, `supabase/tests/vibe_vendor_documents.test.sql`
- Modify: `src/lib/vendor/documents.ts` (`DOC_TYPES`, `needsExpiry`)

**Interfaces:**
- Produces: `vendor_documents.doc_type` accepts `'business_registration'` (profile-level, expiry optional) and `'venue_permit'` (profile-level, expiry optional); one of each per profile. `submit_vendor_profile(uuid)` and `review_vendor_profile(uuid, text, text)` keep their signatures but branch on the profile's `category`: `move` keeps today's rules; `vibe` needs the account's government ID plus a `business_registration` (submit: present; approve: `verified`). `venue_permit` is never required.
- TS: `DOC_TYPES` gains `"business_registration"` and `"venue_permit"`; `needsExpiry` is false for them.

- [ ] **Step 1: Write the failing pgTAP test.** In `vibe_vendor_documents.test.sql` (copy the setup style of `move_listing_functions.test.sql`): a vibe vendor profile in `draft`; assert `submit_vendor_profile` raises "Missing: Government ID, Business registration" with neither, succeeds with both; `review_vendor_profile(..., 'approved', null)` raises while the registration is unverified and succeeds when verified; a `venue_permit` upload is accepted and not required; a MOVE profile without a JTB licence still fails as before; a `business_registration` row with a `vehicle_id` violates the shape constraint.
- [ ] **Step 2: Run to verify it fails.** `npx supabase test db` for this file. Expected: FAIL (doc type not allowed).
- [ ] **Step 3: Write the migration.** Drop and recreate `vendor_documents_doc_type_check`, `vendor_documents_shape` and `vendor_documents_expiry` to add the two types; add unique indexes `vendor_documents_one_registration` and `vendor_documents_one_venue_permit` on `(vendor_profile_id)` filtered by type; `create or replace` both functions, wrapping the existing JTB and vehicle blocks in `if v_profile.category = 'move'` and adding the `vibe` branch (message items "Business registration", "the business registration"). Keep `security definer` and `set search_path = ''`. The functions keep the grants from `20261107000400_permissions.sql`; re-assert them.
- [ ] **Step 4: Update `src/lib/vendor/documents.ts`** (`DOC_TYPES`, `needsExpiry`) and extend `src/lib/vendor/documents.test.ts` for the new types.
- [ ] **Step 5: Run `npx supabase db reset` then this pgTAP file, and `npx vitest run src/lib/vendor/documents.test.ts`.** Expected: PASS.
- [ ] **Step 6: Commit** `feat(vibe): accept vibe documents and review vibe profiles`.

### Task 2: Vibe tables, RLS, grants, triggers

**Files:**
- Create: `supabase/migrations/20261110000200_vibe_listing_tables.sql`, `supabase/tests/vibe_listing_tables.test.sql`

**Interfaces:**
- Produces tables (all `id uuid pk default gen_random_uuid()`, audit and `set_updated_fields` triggers like `move_listings`):
  - `vibe_listings(vendor_profile_id, subtype 'event'|'attraction', title, description (<=1000), area, address_line1, address_line2, town, parish, latitude numeric(9,6), longitude numeric(9,6), currency, duration_minutes, booking_cutoff_minutes default 60 check 0..10080, auto_generate_slots default true, cancellation_policy default 'flexible' in flexible|moderate|strict, status draft|in_review|live, paused, approved_at, reviewed_by, review_note)`; `latitude` and `longitude` both set or both null, within Jamaica's bounding box.
  - `vibe_ticket_types(listing_id, name, description <=200, price numeric(10,2) >=0, discount_percent numeric(5,2) null, free_confirmed_at, max_per_booking, sort_order)` with checks: `discount_percent` null or (>0 and <100) and `price > 0`; `price > 0 or free_confirmed_at is not null`.
  - `vibe_schedule_rules(listing_id, weekday 0..6, start_minutes 0..1439, capacity >0, valid_from date, valid_until date)`, unique `(listing_id, weekday, start_minutes)`.
  - `vibe_slots(listing_id, starts_at timestamptz, capacity >0, booked >=0 default 0, status open|closed default open, source rule|one_off default one_off, edited boolean default false)`, unique `(listing_id, starts_at)`, check `booked <= capacity`.
  - `vibe_blocked_dates(listing_id, day date)`, unique `(listing_id, day)`.
  - `vibe_photos(listing_id, storage_path, is_cover, position)`, check path like `'%/vibe/' || listing_id::text || '/%'` and no `..`; partial unique index one cover per listing; trigger cap of 10 photos.
  - `vibe_listing_flags(listing_id, kind 'price'|'photo', detail jsonb, created_at, resolved_at, resolved_by)` with one open flag per kind.
- Policy helper: `owns_vibe_listing(p_listing_id uuid) returns boolean` (security definer, like `owns_listing`). Trigger `require_vibe_profile` (profile category must be `vibe`).
- RLS on every table: select for owner or `authorize('listings.review')`; insert/update/delete for the owner only on the columns granted. Grants: insert `(vendor_profile_id, subtype, title, description, area, ..., currency, duration_minutes, booking_cutoff_minutes, auto_generate_slots, cancellation_policy)`; update the same minus `vendor_profile_id` plus `paused`; no grant on `status`, `approved_at`, `reviewed_by`, `review_note`; ticket types: select, delete only (writes via Task 3 RPC); slots: insert `(listing_id, starts_at, capacity)`, update `(capacity, status)`; photos: insert/update `position`/delete as for `vehicle_photos`.
- Trigger on `vibe_slots` update: sets `edited = true` when a vendor changes capacity or status of a `rule` slot; rejects `capacity < booked`.

- [ ] **Step 1: Write the failing pgTAP test** (`vibe_listing_tables.test.sql`): owner can insert and read a listing; a second vendor and an anonymous role see zero rows for it and its address columns; owner cannot update `status`; cutoff 10081 and -1 rejected; `booked > capacity` rejected; lowering capacity below `booked` rejected; ticket with price 0 and no `free_confirmed_at` rejected; discount on price 0 rejected; discount 100 rejected; a MOVE profile cannot own a vibe listing; photo path with `..` rejected.
- [ ] **Step 2: Run to verify it fails.** Expected: FAIL (tables missing).
- [ ] **Step 3: Write the migration** to the interface above, following the structure of `20261109000300_move_listing_tables.sql` (tables, enable RLS, helper, triggers, policies, then grants).
- [ ] **Step 4: Run `npx supabase db reset` and the pgTAP file.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(vibe): add vibe listing tables with row-level security`.

### Task 3: Vibe functions (readiness, review, tickets, slots)

**Files:**
- Create: `supabase/migrations/20261110000300_vibe_listing_functions.sql`, `supabase/tests/vibe_listing_functions.test.sql`

**Interfaces (all security definer, `set search_path = ''`, grants to `authenticated`, none to `anon`; the cron one to `service_role` only):**
- `vibe_listing_is_ready(p_listing_id uuid) returns boolean`: profile `approved`; title, description, area, `address_line1`, `town`, `parish`, coordinates set; at least one ticket type; a cover photo; at least one future open slot, or a schedule rule while `auto_generate_slots`.
- `submit_vibe_listing(p_listing_id uuid) returns void` (draft only, owner only, must be ready) and `review_vibe_listing(p_listing_id uuid, p_decision text, p_note text) returns void` (`listings.review`, `approve` or `reject` with a note), written like `submit_listing_for_review` and `review_listing`. `resolve_vibe_listing_flag(p_id uuid) returns void`.
- Flag triggers: a change to ticket `price`/`discount_percent`/`currency`, or a photo insert or delete, on a `live` listing raises an open `vibe_listing_flags` row (`price` or `photo`) via `raise_vibe_listing_flag(listing uuid, kind text)`.
- `save_vibe_ticket_type(p_listing_id uuid, p_id uuid, p_name text, p_description text, p_price numeric, p_discount_percent numeric, p_max_per_booking integer, p_sort_order integer, p_confirm_free boolean) returns uuid`: owner only; inserts or updates; sets `free_confirmed_at = now()` when `p_price = 0 and p_confirm_free`, raises "Confirm that this ticket is free." when `p_price = 0` without confirmation (unless already confirmed on that row); clears `free_confirmed_at` when the price becomes above 0.
- `generate_vibe_slots(p_listing_id uuid) returns integer`: owner or service role; does nothing when `auto_generate_slots` is false; deletes future `rule` slots with `booked = 0 and not edited`, then inserts a slot per rule for each local day from today through `slotWindowDays` (90) ahead whose weekday matches, within `valid_from`/`valid_until`, not in `vibe_blocked_dates`, using `starts_at = (day + start_minutes) at Jamaica time`; returns the number inserted.
- `generate_all_vibe_slots() returns integer`: loops live listings with `auto_generate_slots`; callable by `service_role` only.
- `clear_vibe_auto_slots(p_listing_id uuid) returns integer`: owner only; deletes future `rule` slots with `booked = 0`.
- `set_vibe_date_closed(p_listing_id uuid, p_day date, p_closed boolean) returns void`: owner only; raises if any slot that Jamaica day has `booked > 0`; inserts or deletes the blocked date and sets that day's slots to `closed` or `open`.
- Trigger: saving a schedule rule, or changing `auto_generate_slots` to true, calls `generate_vibe_slots`.

- [ ] **Step 1: Write the failing pgTAP test**, covering: readiness false then true as items are added; submit rejected when not ready, `in_review` when ready; review needs `listings.review` and a note on reject; price-0 ticket without confirm raises, with confirm sets `free_confirmed_at`, later price 5 clears it; Review Focus cases: a rule at 1410 minutes (23:30) on a Friday produces slots whose local weekday is Friday and whose UTC date is Saturday; a rule at 30 minutes (00:30) lands on its own local day; regeneration keeps a slot with `booked = 2` and a slot with `edited = true`; blocked dates are skipped; `auto_generate_slots = false` generates nothing; `clear_vibe_auto_slots` keeps booked slots; `set_vibe_date_closed` raises when a slot that day is booked; a price change on a live listing opens one `price` flag, a second change does not open another.
- [ ] **Step 2: Run to verify it fails.** Expected: FAIL (functions missing).
- [ ] **Step 3: Write the migration** to the interface above.
- [ ] **Step 4: Run `npx supabase db reset` and the pgTAP file.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(vibe): add listing review, ticket and slot functions`.

### Task 4: Pure logic in `src/lib/vibe/`

**Files:**
- Create: `src/lib/vibe/config.ts`, `pricing.ts`, `cutoff.ts`, `readiness.ts`, `types.ts` and a `.test.ts` for `pricing`, `cutoff`, `readiness`.

**Interfaces:**
- `config.ts`: `export const VIBE_CONFIG = { slotWindowDays: 90, defaultCutoffMinutes: 60, maxCutoffMinutes: 10080, maxPhotos: 10, ticketDescriptionMax: 200 } as const`. A comment says it mirrors the SQL defaults.
- `pricing.ts`: `isFree(price: number): boolean`; `discountedPrice(price: number, discountPercent: number | null): number` (rounds half up to 2 decimals; null or 0 returns `price`).
- `cutoff.ts`: `type CutoffUnit = "minutes" | "hours" | "days"`; `splitCutoff(minutes: number): { value: number; unit: CutoffUnit }` (largest unit that divides evenly); `toCutoffMinutes(value: number, unit: CutoffUnit): number`.
- `types.ts`: `VibeSubtype = "event" | "attraction"`, `VibeStatus = "draft" | "in_review" | "live"`, `CancellationPolicy = "flexible" | "moderate" | "strict"`, `TicketType`, `ScheduleRule`, `VibeSlot`, `VibePhoto`, `VibeListingView`.
- `readiness.ts`: `type VibeReadinessItem = "profile_approved" | "basics" | "address" | "pin" | "tickets" | "cover_photo" | "slots"`; `vibeReadiness(input: VibeReadinessInput): { ready: boolean; missing: VibeReadinessItem[] }` mirroring `vibe_listing_is_ready`.

- [ ] **Step 1: Write failing tests.** `pricing.test.ts`: `discountedPrice(19.99, 15) === 16.99`; `discountedPrice(10, null) === 10`; `discountedPrice(0, 50) === 0`; `isFree(0)`. `cutoff.test.ts`: `splitCutoff(60)` is 1 hour; `splitCutoff(90)` is 90 minutes; `splitCutoff(1440)` is 1 day; `toCutoffMinutes(7, "days") === 10080`. `readiness.test.ts`: each missing item is reported, and a complete input is ready; slots count as present when a rule exists and auto generation is on, not when it is off.
- [ ] **Step 2: Run** `npx vitest run src/lib/vibe`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** to the signatures above.
- [ ] **Step 4: Run** `npx vitest run src/lib/vibe`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(vibe): add pricing, cutoff and readiness logic`.

### Task 5: Zod schemas

**Files:**
- Create: `src/lib/schemas/vibe.ts`, `src/lib/schemas/vibe.test.ts`

**Interfaces:**
- Produces: `PARISHES` (the 14 Jamaican parishes: Kingston, St. Andrew, St. Thomas, Portland, St. Mary, St. Ann, Trelawny, St. James, Hanover, Westmoreland, St. Elizabeth, Manchester, Clarendon, St. Catherine); `vibeBasicsSchema` (subtype, title 3 to 100, description up to 1000, area, currency, durationMinutes 15 to 1440, bookingCutoffMinutes 0 to 10080 default 60, cancellationPolicy default flexible); `addressSchema` (addressLine1 required, addressLine2 optional, town, parish in `PARISHES`, latitude, longitude within Jamaica); `ticketTypeSchema` (name, description up to 200 optional, price >= 0, discountPercent null or above 0 and below 100, maxPerBooking optional, confirmFree boolean; refine: price 0 requires `confirmFree`, price 0 forbids `discountPercent`); `scheduleRuleSchema` (weekday, startMinutes, capacity > 0, validFrom/validUntil optional with from <= until); `manualSlotSchema` (startsAt ISO string in the future, capacity > 0); `slotEditSchema` (id, capacity, status); `closeDateSchema` (day `YYYY-MM-DD`, closed boolean); `vibeBusinessSchema` (businessName optional, primaryRegion); `isOwnVibePhotoPath(path: string, userId: string, listingId: string): boolean` (`<userId>/vibe/<listingId>/<file>`, no dot segments).

- [ ] **Step 1: Write failing tests** for every refine and bound above, including cutoff 10081 rejected, price 0 without `confirmFree` rejected, price 0 with a discount rejected, discount 100 rejected, parish "Nowhere" rejected, a latitude outside Jamaica rejected, and `isOwnVibePhotoPath` accepting `u1/vibe/l1/a.jpg` and rejecting `u1/vibe/l1/../x.jpg` and a path with another user's id.
- [ ] **Step 2: Run** `npx vitest run src/lib/schemas/vibe.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** with the style of `src/lib/schemas/move.ts` (messages in plain language, `fromZod` compatible).
- [ ] **Step 4: Run it again.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(vibe): add listing validation schemas`.

### Task 6: Server actions and queries

**Files:**
- Create: `src/lib/vibe/actions.ts`, `profile-actions.ts`, `queries.ts`, `actions.test.ts`, `profile-actions.test.ts`

**Interfaces:** all actions return `ActionResult` (`@/lib/auth/result`), start with `requireUser` from `@/lib/auth/action-helpers`, resolve the caller's vibe profile and own the listing before writing, and call `revalidatePath("/v/vibe/...")`.
- `profile-actions.ts`: `saveVibeBusinessAction(input: unknown)`, `recordVibeDocumentAction(input: unknown)` (types `business_registration`, `venue_permit`, and the account's `government_id` as the Move flow does), `submitVibeProfileAction()` (calls `submit_vendor_profile`).
- `actions.ts`: `createListingAction(input)` returning the new id in `ActionResult`'s data if its shape allows, else redirecting; `saveBasicsAction(listingId, input)`, `saveLocationAction(listingId, input)`, `saveTicketTypeAction(listingId, input)` (calls `save_vibe_ticket_type`), `deleteTicketTypeAction(id)`, `saveScheduleAction(listingId, { autoGenerate: boolean, rules })` (replaces rules, sets the flag), `addSlotAction(listingId, input)`, `editSlotAction(input)`, `setDateClosedAction(listingId, input)`, `clearAutoSlotsAction(listingId)`, `recordPhotoAction(listingId, input)`, `removePhotoAction(id)`, `setCoverPhotoAction(id)`, `submitListingAction(listingId)`.
- `queries.ts` (server, `await connection()` first): `getVibeOverview(): Promise<VendorOverview | null>` for the Vibe profile and documents; `getMyVibeListings(): Promise<VibeListingSummary[]>`; `getVibeListing(id: string): Promise<VibeListingView | null>`; `getVibeSlots(listingId: string, fromDay: string, toDay: string): Promise<VibeSlot[]>`.

- [ ] **Step 1: Write failing tests** with the Supabase mock of `src/lib/move/actions.test.ts`: unauthenticated and non-vibe callers get failures; `saveTicketTypeAction` with price 0 and no confirm fails before any `rpc` call and with confirm calls `rpc.save_vibe_ticket_type` with `p_confirm_free: true`; `saveScheduleAction` writes rules and the flag; `setDateClosedAction` surfaces the database's "has bookings" message; `submitListingAction` calls `rpc.submit_vibe_listing`; `recordPhotoAction` rejects a path that fails `isOwnVibePhotoPath`.
- [ ] **Step 2: Run** `npx vitest run src/lib/vibe`. Expected: FAIL.
- [ ] **Step 3: Implement** following `src/lib/move/actions.ts` and `src/lib/move/queries.ts` (read both first).
- [ ] **Step 4: Run it again.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(vibe): add vendor actions and queries`.

### Task 7: Daily slot extension job

**Files:**
- Create: `src/app/api/cron/extend-vibe-slots/route.ts`, `route.test.ts`
- Modify: `vercel.json`

**Interfaces:** `GET(request: Request)` identical in shape to `src/app/api/cron/expire-move-requests/route.ts` but calls `createAdminClient().rpc("generate_all_vibe_slots")` and returns `{ generated: number }`. `vercel.json` adds `{ "path": "/api/cron/extend-vibe-slots", "schedule": "30 4 * * *" }` (daily, allowed on Hobby).

- [ ] **Step 1: Write the failing test** copying `expire-move-requests/route.test.ts`: 500 without `CRON_SECRET`, 401 with a wrong bearer, 200 with `{ generated: 3 }` for the right one, 500 when the rpc errors.
- [ ] **Step 2: Run** `npx vitest run src/app/api/cron/extend-vibe-slots`. Expected: FAIL.
- [ ] **Step 3: Implement** the route and the `vercel.json` entry.
- [ ] **Step 4: Run it again.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(vibe): extend vibe slots daily`.

### Task 8: Routing, onboarding and profile (UI, impeccable)

**Files:**
- Modify: `src/app/v/[category]/[[...slug]]/page.tsx` (remove `vibe` from `CATEGORIES`; keep `stay`)
- Create: `src/app/v/vibe/page.tsx` (placeholder redirect to dashboard task 11 content), `src/app/v/vibe/onboarding/page.tsx`, `src/app/v/vibe/profile/page.tsx`, `src/components/vibe/business-form.tsx`, `documents-panel.tsx`, `status-panel.tsx`

**Interfaces:** consumes `saveVibeBusinessAction`, `recordVibeDocumentAction`, `submitVibeProfileAction`, `getVibeOverview`. Reuse `src/components/vendor/` pieces (`document-uploader`, `checklist`, `submit-panel`, `status-banner`, `registration-gate`, `vendor-page`) after reading them; add a prop or a thin wrapper rather than copying when the diff is smaller.

- [ ] **Step 1: Invoke `impeccable:impeccable`, run its `context` command, read `DESIGN.md`.**
- [ ] **Step 2: Build the onboarding page.** One page, three parts: business details (name optional, region), documents (government ID if the account has none, business registration required, venue permit optional with a "earns the Trusted badge" hint), submit. Locked view while `pending`; rejection note and resubmit when `rejected`.
- [ ] **Step 3: Build the profile page** showing status, documents and the optional venue-proof uploads.
- [ ] **Step 4: Remove the `vibe` placeholder entry** from the dynamic route and confirm `/v/stay` still resolves.
- [ ] **Step 5: Run `npm run typecheck` for these files** (`npx tsc --noEmit`). Expected: no errors.
- [ ] **Step 6: Commit** `feat(vibe): add vendor onboarding and profile pages`.

### Task 9: Listings list and editor shell, Basics and Tickets (UI, impeccable)

**Files:**
- Create: `src/app/v/vibe/listings/page.tsx`, `src/app/v/vibe/listings/[id]/page.tsx`, `src/components/vibe/listing-list.tsx`, `listing-tabs.tsx`, `basics-tab.tsx`, `tickets-tab.tsx`, `free-ticket-dialog.tsx`, `readiness-card.tsx`, `use-save.ts` (or reuse `src/components/move/use-save.ts`)

**Interfaces:** consumes `createListingAction`, `saveBasicsAction`, `saveTicketTypeAction`, `deleteTicketTypeAction`, `submitListingAction`, `getMyVibeListings`, `getVibeListing`, `vibeReadiness`, `discountedPrice`, `splitCutoff`, `toCutoffMinutes`. Editor tab names live in `src/components/vibe/listing-tab-names.ts` (`basics`, `tickets`, `schedule`, `photos`, `location`, `policy`), mirroring Move's tab pattern with `?tab=`.

- [ ] **Step 1: Load impeccable** (already set up if in the same session) and follow its craft floor.
- [ ] **Step 2: Build the list page** (cards with status, subtype, next slot, "New listing"), then the editor page with tabs and the readiness card (missing items link to their tab).
- [ ] **Step 3: Build Basics** (subtype, title, description, area, currency, duration, booking cutoff as a number plus unit defaulting to 1 hour).
- [ ] **Step 4: Build Tickets** with name, description (counter to 200), price, optional discount percent showing original struck through next to the discounted price, per-booking limit. Saving a price of 0 opens `free-ticket-dialog.tsx` with the spec's wording and a required checkbox "I understand this ticket is free and I will not charge for it" gating "Create free ticket"; it applies to a paid ticket changed to free too.
- [ ] **Step 5: Run `npx tsc --noEmit`.** Expected: no errors.
- [ ] **Step 6: Commit** `feat(vibe): add listing editor with basics and tickets`.

### Task 10: Schedule, Location, Photos, Cancellation tabs (UI, impeccable)

**Files:**
- Create: `src/components/vibe/schedule-tab.tsx`, `location-tab.tsx`, `pin-picker.tsx`, `photos-tab.tsx`, `policy-tab.tsx`

**Interfaces:** consumes `saveScheduleAction`, `addSlotAction`, `clearAutoSlotsAction`, `saveLocationAction`, `recordPhotoAction`, `removePhotoAction`, `setCoverPhotoAction`, `saveBasicsAction` (policy), `PARISHES`. `pin-picker.tsx` is a client component built on `maplibre-gl` using the setup of `src/components/move/dashboard/dashboard-map.tsx` (`setWorkerUrl("/maplibre-gl-worker.mjs")`, OpenFreeMap style, no key): click or drag to set the pin, calls back `(lat: number, lng: number)`, defaults the view to Jamaica.

- [ ] **Step 1: Schedule tab:** weekly rows (weekday, time, capacity, optional valid-from/until), the auto-generation switch (copy: what it does; off keeps existing slots), "Add a slot" (date, time, capacity), and a confirmed "Clear unbooked auto slots" action.
- [ ] **Step 2: Location tab:** manual address fields (line 1, line 2 optional, town, parish select) beside the pin picker; both required to submit.
- [ ] **Step 3: Photos tab:** upload to the `listing-photos` bucket under `<user id>/vibe/<listing id>/`, cover selection, reorder, cap 10; reuse the upload approach of `src/components/move/photos-tab.tsx`.
- [ ] **Step 4: Cancellation tab:** Flexible, Moderate, Strict with the tier wording from the PRD (STAY and VIBE tiers) and the 1-hour grace note.
- [ ] **Step 5: Run `npx tsc --noEmit`.** Expected: no errors.
- [ ] **Step 6: Commit** `feat(vibe): add schedule, location, photos and cancellation tabs`.

### Task 11: Dashboard and calendar (UI, impeccable)

**Files:**
- Modify: `src/app/v/vibe/page.tsx`
- Create: `src/app/v/vibe/calendar/page.tsx`, `src/components/vibe/dashboard.tsx`, `slot-calendar.tsx`

**Interfaces:** consumes `getMyVibeListings`, `getVibeSlots`, `addSlotAction`, `editSlotAction`, `setDateClosedAction`. Dashboard: listing statuses, upcoming slots with fill (booked of capacity, 0 until bookings exist), readiness summary. Calendar: month view per listing (select listing), a day shows its slots; add a slot, change a slot's capacity, close or reopen the day; the "has bookings" error from the database is shown as the message.

- [ ] **Step 1: Build the dashboard** with an empty state that points to onboarding or "New listing".
- [ ] **Step 2: Build the calendar** (month grid, day panel, optimistic-free saves with the same save hook).
- [ ] **Step 3: Run `npx tsc --noEmit`.** Expected: no errors.
- [ ] **Step 4: Commit** `feat(vibe): add vibe dashboard and slot calendar`.

### Task 12: Admin review of Vibe profiles and listings

**Files:**
- Create: `src/lib/vibe/admin-queries.ts`, `admin-actions.ts`, `admin-actions.test.ts`
- Modify: `src/app/admin/listings/page.tsx` and its components; the admin vendor review pages so a Vibe profile lists business registration and venue permit

**Interfaces:** `getReviewVibeListings(): Promise<ReviewVibeListing[]>`, `getOpenVibeFlags()`, `reviewVibeListingAction(input)` (calls `review_vibe_listing`), `resolveVibeFlagAction(id)` (calls `resolve_vibe_listing_flag`); `src/lib/vendor/admin-queries.ts` must return the new document types for Vibe profiles. Read `src/lib/move/admin-queries.ts`, `admin-actions.ts` and the admin listings page before editing.

- [ ] **Step 1: Write failing tests** copying `src/lib/move/admin-actions.test.ts`: a non-admin is refused, a reject without a note fails validation, approve calls the rpc.
- [ ] **Step 2: Run** `npx vitest run src/lib/vibe/admin-actions.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the queries and actions, then extend the admin page (impeccable for the markup).
- [ ] **Step 4: Run it again.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(vibe): review vibe profiles and listings as admin`.

### Task 13: Docs

**Files:**
- Modify: `PRD.md`, `ARCHITECTURE.md`, `ARCHITECTURE-ESSENTIAL.md`, `README.md`

- [ ] **Step 1: `PRD.md`:** replace the vendor VIBE events line ("government ID and a JCF permit, required for every event") with the two-level rule; record manual address entry, ticket types with descriptions, free tickets with no commission and the permanent-ban rule, the percent discount, the vendor-set booking cutoff, manual slots and the auto-generation switch.
- [ ] **Step 2: `ARCHITECTURE.md`:** describe the `vibe_*` tables, the new document types, the daily extend job, MapLibre instead of Google Maps, and the address and pin privacy note for the traveler cycle. Update `ARCHITECTURE-ESSENTIAL.md` in the same change and add no fact that is not in `ARCHITECTURE.md`.
- [ ] **Step 3: `README.md`:** add the three migrations to the migration list.
- [ ] **Step 4: Commit** `docs(vibe): record the vibe vendor design`.

### Task 14: Final verification

- [ ] **Step 1:** `npx supabase db reset` then `npx supabase test db`. Expected: all pass, including the three new files.
- [ ] **Step 2:** `npm run typecheck`, `npm run lint` (0 errors; existing warnings are not a failure) and `npm run test`. Expected: all pass.
- [ ] **Step 3:** Start the dev server once, sign in as a vendor with a vibe profile, create a listing, add a free ticket (dialog appears), set a weekly rule, confirm slots appear on the calendar, submit; stop the server and free the port.
- [ ] **Step 4:** Report any failure by name; do not claim success without the output.
