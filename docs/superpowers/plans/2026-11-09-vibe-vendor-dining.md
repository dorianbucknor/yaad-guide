# Vibe Vendor Side, Dining Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Vibe vendor can sign up as a dining vendor, create a dining listing, pick how travelers will eventually book it (reservation, prepaid experience, or listing only), fill in pricing/schedule/hours where that mode needs them, and submit for admin review.

**Architecture:** Dining is a third `vibe_listings.subtype`, sharing every generic column (title, address, photos, status, review, cancellation policy) with events/attractions. Dining-only facts live in a sibling 1:1 table, `vibe_dining_profiles`, written directly (not through an RPC) with a database trigger that locks `booking_mode`/`reservation_style` once set. `booking_mode` picks which of the already-built ticket/schedule machinery, a new lightweight `vibe_business_hours` table, or nothing applies.

**Tech Stack:** Next.js 16 (Cache Components), Supabase (Postgres, RLS, pgTAP), zod 4, Vitest, react-hook-form, shadcn on Base UI.

**Spec:** `docs/superpowers/specs/2026-11-09-vibe-vendor-dining-design.md`

## Rulings made while planning (deviations from the spec, with cost if wrong)

- **`booking_mode` is still chosen once and locked, but via a "Details" tab after the listing exists, not a separate creation form.** The spec described a dedicated dining creation step; this plan instead widens the existing generic listing creation (`createListingAction`/`BasicsForm`) to accept `subtype: "dining"`, and adds the dining-only fields (venue type, booking mode, etc.) as a "Details" tab the vendor fills in right after. Same end state — one choice, locked by a DB trigger — with far less new code, since creation, basics editing and readiness-checking logic are all already generic to any `vibe_listings` row. Cost if wrong: splitting creation into a dedicated dining form later is a small, additive change.
- **No `create_dining_listing` RPC.** `vibe_dining_profiles` writes go through plain grants + RLS, like `vibe_schedule_rules`, because the only invariants are check constraints (venue/service-mode shape, mode/style pairing) plus the lock trigger — none of them need `security definer` logic the way a free-ticket confirmation does. Cost if wrong: a follow-up migration adding an RPC if a future invariant needs one.
- **Business hours cannot span midnight** (`closes_minutes > opens_minutes` is a hard check). A venue open past midnight (e.g. 6pm–2am) must enter it as two rows or will be rejected with a clear message. Cost if wrong: a schema change to allow a wrap-around range, plus a UI change to enter it.

## Prerequisite: shared tabs from the events/attractions cycle

Tasks 11 and 12 reuse UI and admin-review code from the **events/attractions** implementation (`docs/superpowers/plans/2026-11-09-vibe-vendor-side.md`), which is being built in parallel on `feat/vibe-vendor-side`. Before starting Task 11, check whether `src/components/vibe/schedule-tab.tsx`, `location-tab.tsx`, `pin-picker.tsx`, `photos-tab.tsx`, `policy-tab.tsx` exist on this branch. Before starting Task 12, check whether `src/lib/vibe/admin-queries.ts`, `admin-actions.ts` and the admin listings page's Vibe support exist. If they don't yet, merge or rebase the latest `feat/vibe-vendor-side` into this branch first — those components are generic to any `vibe_listings` row (not event/attraction-specific) and need no changes to work for dining. Do not reimplement them.

## Global Constraints

- Read `ARCHITECTURE-ESSENTIAL.md` first; open `DESIGN.md` for any UI task. `AGENTS.md`: this Next.js has breaking changes; check `node_modules/next/dist/docs/` before writing Next code.
- Cache Components: call `await connection()` before reading the session or the clock; any client component reading `usePathname`/`searchParams` sits inside `<Suspense>`.
- Never weaken RLS. Vendors write only rows under their own vendor profile. `booking_mode`/`reservation_style` are grant-writable but DB-trigger-locked once set; no column grant should route around that.
- Currency values are stored lowercase `'usd' | 'jmd'`. Jamaica time is a fixed UTC-5, no daylight saving (not newly relevant here: `vibe_business_hours` stores local minutes-of-day, no `timestamptz` math).
- Commands: use quiet flags. Run `npm run typecheck`, `npm run lint`, `npm run test` and `npx supabase test db` once at the end (Task 14), not after every task. Per task, run only that task's test file.
- Commit with the `conventions` skill rules; end commits with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Do not push or open PRs unless asked.
- UI tasks (8 to 12): invoke `impeccable:impeccable` first, follow its Setup (`context`, then `reference/craft-floor.md` before editing). Use shadcn components from `src/components/ui/`; add new ones with the shadcn CLI or MCP, never by hand.

## Review Focus

- A restaurant saved with neither `dine_in` nor `takeout` set — rejected by both the zod refine and the DB check, not just the UI (Tasks 2, 5).
- A vendor (or a replayed request) tries to change `booking_mode` or `reservation_style` after it was first set — the DB trigger must raise even if the UI disables the fields (Task 2).
- Business hours entered with `closesMinutes <= opensMinutes` (including an attempted overnight range) — rejected with a clear message, not silently stored wrong (Tasks 2, 5).
- A dining listing submitted for review before any `vibe_dining_profiles` row exists — readiness must report not-ready, not null-pointer or default to ready (Tasks 3, 4).
- `cuisineTypes` with a blank entry, a duplicate, or more than 10 entries — trimmed/capped by the schema, not passed through as-is (Task 5).

## File Structure

- `supabase/migrations/20261110000400_vibe_dining_documents.sql`: `health_permit` document type.
- `supabase/migrations/20261110000500_vibe_dining_tables.sql`: `vibe_listings.subtype` widened; `vibe_dining_profiles`, `vibe_business_hours` tables, RLS, lock trigger, grants.
- `supabase/migrations/20261110000600_vibe_dining_functions.sql`: `vibe_listing_is_ready` extended for dining.
- `supabase/tests/vibe_dining_documents.test.sql`, `vibe_dining_tables.test.sql`, `vibe_dining_functions.test.sql`.
- `src/lib/vibe/dining.ts` (+ test): venue/mode/style/tier consts, `diningReadiness`.
- `src/lib/schemas/dining.ts` (+ test): `diningDetailsSchema`, `businessHoursRowSchema`, `businessHoursSetSchema`.
- `src/lib/vibe/dining-actions.ts`, `dining-queries.ts`? — no new query file; `src/lib/vibe/queries.ts` is modified in place (+ tests).
- `src/components/vibe/dining-listing-tab-names.ts`, `dining-listing-tabs.tsx`, `dining-basics-tab.tsx`, `dining-details-tab.tsx`, `hours-tab.tsx`.
- Modify: `src/lib/vendor/documents.ts`, `src/components/vibe/documents-panel.tsx`, `src/components/vibe/basics-tab.tsx`, `src/lib/vibe/types.ts`, `src/lib/schemas/vibe.ts`, `src/app/v/vibe/listings/[id]/page.tsx`.
- `PRD.md`, `ARCHITECTURE.md`, `ARCHITECTURE-ESSENTIAL.md`.

---

### Task 1: Health permit document type

**Files:**
- Create: `supabase/migrations/20261110000400_vibe_dining_documents.sql`, `supabase/tests/vibe_dining_documents.test.sql`
- Modify: `src/lib/vendor/documents.ts` (`DOC_TYPES`, `needsExpiry`), `src/lib/vendor/documents.test.ts`

**Interfaces:**
- Produces: `vendor_documents.doc_type` accepts `'health_permit'` (profile-level, expiry optional, one per profile — same shape as `venue_permit`). Never required by `submit_vendor_profile` or `review_vendor_profile` (both untouched).
- TS: `DOC_TYPES` gains `"health_permit"`; `needsExpiry` is false for it.

- [ ] **Step 1: Write the failing pgTAP test.** In `vibe_dining_documents.test.sql` (copy the setup of `vibe_vendor_documents.test.sql`): a `health_permit` upload for a vibe profile is accepted; a second one for the same profile violates the unique index; expiry can be null; `submit_vendor_profile`/`review_vendor_profile` succeed with or without it present, given the already-required government ID and business registration.
- [ ] **Step 2: Run to verify it fails.** `npx supabase test db` for this file. Expected: FAIL (doc type not allowed).
- [ ] **Step 3: Write the migration.** Drop and recreate `vendor_documents_doc_type_check`, `vendor_documents_shape`, `vendor_documents_expiry` to add `health_permit` alongside the existing VIBE document types; add `vendor_documents_one_health_permit` (unique on `vendor_profile_id` where `doc_type = 'health_permit'`).
- [ ] **Step 4: Update `src/lib/vendor/documents.ts`** and extend its test for `health_permit`.
- [ ] **Step 5: Run `npx supabase db reset` then this pgTAP file, and `npx vitest run src/lib/vendor/documents.test.ts`.** Expected: PASS.
- [ ] **Step 6: Commit** `feat(vibe): accept a health permit document for dining vendors`.

### Task 2: Dining tables, lock trigger, RLS

**Files:**
- Create: `supabase/migrations/20261110000500_vibe_dining_tables.sql`, `supabase/tests/vibe_dining_tables.test.sql`

**Interfaces:**
- `vibe_listings.subtype` check widened to `'event' | 'attraction' | 'dining'`.
- `vibe_dining_profiles(listing_id uuid primary key references vibe_listings on delete cascade, venue_type 'street_food'|'cookshop'|'restaurant', dine_in boolean default false, takeout boolean default false, cuisine_types text[] default '{}', price_tier '$'|'$$'|'$$$' null, booking_mode 'reservation'|'prepaid'|'listing_only', reservation_style 'slotted'|'hours_only' null, audit columns)`. Checks: `venue_type <> 'restaurant' or dine_in or takeout`; `(booking_mode = 'reservation') = (reservation_style is not null)`.
- `vibe_business_hours(id uuid pk, listing_id uuid references vibe_listings on delete cascade, weekday 0..6, opens_minutes 0..1439, closes_minutes 0..1439, check closes_minutes > opens_minutes)`, unique `(listing_id, weekday)`.
- Trigger `require_dining_listing()` (before insert, on both new tables): the listing's `subtype` must be `'dining'`.
- Trigger `guard_dining_mode_lock()` (before update on `vibe_dining_profiles`): raises `"The booking mode can't be changed after it's set. Create a new listing instead."` when `booking_mode` or `reservation_style` differs from the stored row. This is what makes the choice "locked" — the first write is always an insert (unguarded); every later write is an update (guarded).
- RLS on both tables: select for owner (`owns_vibe_listing(listing_id)`) or `listings.review`; insert/update for the owner. Grants: `vibe_dining_profiles` — insert and update all of `venue_type, dine_in, takeout, cuisine_types, price_tier, booking_mode, reservation_style` (the trigger, not the grant, enforces the lock); `vibe_business_hours` — insert `(listing_id, weekday, opens_minutes, closes_minutes)`, update `(opens_minutes, closes_minutes)`, delete.

- [ ] **Step 1: Write the failing pgTAP test** (`vibe_dining_tables.test.sql`): owner can insert and read a dining profile; a second vendor and anon see zero rows; a `restaurant` with neither `dine_in` nor `takeout` is rejected; `reservation` with a null `reservation_style` is rejected, and `prepaid` with a non-null one is rejected; a non-dining listing cannot get a `vibe_dining_profiles` row; changing `booking_mode` on an existing row raises, but updating `price_tier` on the same row (booking_mode unchanged) succeeds; `vibe_business_hours` with `closes_minutes <= opens_minutes` is rejected; a second row for the same weekday is rejected.
- [ ] **Step 2: Run to verify it fails.** Expected: FAIL (tables missing).
- [ ] **Step 3: Write the migration** to the interface above, following the structure of `20261110000200_vibe_listing_tables.sql`.
- [ ] **Step 4: Run `npx supabase db reset` and the pgTAP file.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(vibe): add dining listing tables with a booking-mode lock`.

### Task 3: Extend listing readiness for dining

**Files:**
- Create: `supabase/migrations/20261110000600_vibe_dining_functions.sql`, `supabase/tests/vibe_dining_functions.test.sql`

**Interfaces:**
- `create or replace function public.vibe_listing_is_ready(p_listing_id uuid) returns boolean`: the existing event/attraction branch is unchanged; a dining listing is additionally ready only when a `vibe_dining_profiles` row exists and, by `booking_mode`: `prepaid` needs a ticket type and a future slot/active rule (same slot test as events); `reservation` + `slotted` needs the same slot test, no ticket type; `reservation` + `hours_only` needs at least one `vibe_business_hours` row; `listing_only` needs nothing further.

```sql
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
```

- [ ] **Step 1: Write the failing pgTAP test**: readiness stays false for a dining listing until basics+address+pin+cover photo are set, false again for each `booking_mode` until its own extra requirement is met (ticket+slot for prepaid, slot for reservation+slotted, an hours row for reservation+hours_only), true immediately on the shared requirements for listing_only; readiness for an existing event/attraction listing is unaffected (regression, same assertions as the Task 3 test in the events/attractions plan).
- [ ] **Step 2: Run to verify it fails.** Expected: FAIL.
- [ ] **Step 3: Write the migration** with the function above.
- [ ] **Step 4: Run `npx supabase db reset` and the pgTAP file.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(vibe): make dining readiness depend on its booking mode`.

### Task 4: Pure logic in `src/lib/vibe/`

**Files:**
- Create: `src/lib/vibe/dining.ts`, `dining.test.ts`
- Modify: `src/lib/vibe/types.ts`

**Interfaces:**
- `types.ts`: `VibeSubtype` gains `"dining"`. New types: `VenueType = "street_food" | "cookshop" | "restaurant"`, `BookingMode = "reservation" | "prepaid" | "listing_only"`, `ReservationStyle = "slotted" | "hours_only"`, `PriceTier = "$" | "$$" | "$$$"`, `DiningProfile = { venueType: VenueType; dineIn: boolean; takeout: boolean; cuisineTypes: string[]; priceTier: PriceTier | null; bookingMode: BookingMode; reservationStyle: ReservationStyle | null }`, `BusinessHoursRow = { id: string; weekday: number; opensMinutes: number; closesMinutes: number }`. `VibeListingView` gains `diningProfile: DiningProfile | null` and `businessHours: BusinessHoursRow[]`.
- `dining.ts`: `export const VENUE_TYPES = ["street_food", "cookshop", "restaurant"] as const`; `BOOKING_MODES`, `RESERVATION_STYLES`, `PRICE_TIERS` likewise. `export type DiningReadinessItem = "profile_approved" | "basics" | "address" | "pin" | "cover_photo" | "venue_type" | "service_mode" | "tickets" | "slots" | "hours"`. `export function diningReadiness(input: DiningReadinessInput): { ready: boolean; missing: DiningReadinessItem[] }` mirroring the SQL in Task 3, where `DiningReadinessInput` has the same shared fields as `VibeReadinessInput` (minus `ticketCount`/the top-level slot fields, which move inside a `profile: { venueType, dineIn, takeout, bookingMode, reservationStyle, ticketCount, futureOpenSlotCount, ruleCount, autoGenerate, businessHoursCount } | null` field).

- [ ] **Step 1: Write failing tests.** `dining.test.ts`: a `null` profile reports `venue_type` missing (among the shared items) but never `tickets`/`slots`/`hours`; a `restaurant` profile with neither `dineIn` nor `takeout` reports `service_mode`; `prepaid` reports `tickets` and `slots` independently until both are satisfied; `reservation`+`slotted` reports only `slots`; `reservation`+`hours_only` reports `hours` until `businessHoursCount > 0`; `listing_only` is ready once the shared items are met.
- [ ] **Step 2: Run** `npx vitest run src/lib/vibe/dining.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** to the signatures above, and make the `types.ts` edits.
- [ ] **Step 4: Run** `npx vitest run src/lib/vibe`. Expected: PASS (including the existing `readiness.test.ts`, unaffected).
- [ ] **Step 5: Commit** `feat(vibe): add dining readiness logic`.

### Task 5: Zod schemas

**Files:**
- Create: `src/lib/schemas/dining.ts`, `dining.test.ts`
- Modify: `src/lib/schemas/vibe.ts` (`SUBTYPES`)

**Interfaces:**
- `vibe.ts`: `SUBTYPES` becomes `["event", "attraction", "dining"] as const` (this alone makes `vibeBasicsSchema`, `createListingAction` and `saveBasicsAction` accept `subtype: "dining"` with no further changes to any of them).
- `dining.ts`: `CUISINE_MAX = 10`. `diningDetailsSchema`: `venueType` (enum `VENUE_TYPES`), `dineIn`/`takeout` (boolean, default false), `cuisineTypes` (array of trimmed 1–40 char strings, max 10, default `[]`), `priceTier` (enum `PRICE_TIERS`, nullable, default null), `bookingMode` (enum `BOOKING_MODES`), `reservationStyle` (enum `RESERVATION_STYLES`, nullable, default null); refine: `venueType !== "restaurant" || dineIn || takeout` (message on `dineIn`); refine: `(bookingMode === "reservation") === (reservationStyle !== null)` (message on `reservationStyle`). `businessHoursRowSchema`: `weekday` 0–6, `opensMinutes` 0–1439, `closesMinutes` 0–1439; refine `closesMinutes > opensMinutes`. `businessHoursSetSchema`: array of `businessHoursRowSchema`, max 7, refine no duplicate `weekday`.

- [ ] **Step 1: Write failing tests** for every refine and bound above: a restaurant with `dineIn: false, takeout: false` rejected; `bookingMode: "reservation", reservationStyle: null` rejected; `bookingMode: "prepaid", reservationStyle: "slotted"` rejected; 11 cuisine types rejected; an empty-string cuisine type trimmed away or rejected (pick one, assert it); `closesMinutes` equal to `opensMinutes` rejected; two rows both `weekday: 0` rejected.
- [ ] **Step 2: Run** `npx vitest run src/lib/schemas/dining.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, following the style of `src/lib/schemas/vibe.ts` (plain-language messages, `fromZod`-compatible).
- [ ] **Step 4: Run it again, and `npx vitest run src/lib/schemas/vibe.test.ts`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(vibe): add dining detail and business-hours schemas`.

### Task 6: Server actions and query extension

**Files:**
- Create: `src/lib/vibe/dining-actions.ts`, `dining-actions.test.ts`
- Modify: `src/lib/vibe/queries.ts` (`getVibeListing`), `src/components/vibe/basics-tab.tsx` (`BasicsForm`'s redirect after create)

**Interfaces:**
- `dining-actions.ts`, both following the `requireListing`/`ActionResult` pattern in `src/lib/vibe/actions.ts` (read it first): `saveDiningDetailsAction(listingId: string, input: unknown): Promise<ActionResult>` — parses `diningDetailsSchema`, then `.upsert({ listing_id: listingId, venue_type, dine_in, takeout, cuisine_types, price_tier, booking_mode, reservation_style }, { onConflict: "listing_id" })` on `vibe_dining_profiles`; a trigger rejection (mode already locked) surfaces through `failure(...)` as-is. `saveBusinessHoursAction(listingId: string, input: unknown): Promise<ActionResult>` — parses `businessHoursSetSchema`, deletes all `vibe_business_hours` rows for the listing, then inserts the new set (replace-all, like `saveScheduleAction`).
- `queries.ts`: `getVibeListing` additionally selects `vibe_dining_profiles` (one row or none) and `vibe_business_hours` (ordered by `weekday`) for the listing, mapping them into `diningProfile`/`businessHours` on the returned `VibeListingView`; both are `null`/`[]` for a non-dining listing.
- `basics-tab.tsx`: `BasicsForm`'s `onSubmit` for a new listing routes to `?tab=details` when `values.subtype === "dining"`, otherwise keeps `?tab=tickets`.

- [ ] **Step 1: Write failing tests** with the Supabase mock of `src/lib/vibe/actions.test.ts`: unauthenticated and non-owner callers fail; `saveDiningDetailsAction` with a restaurant and no dine-in/takeout fails validation before any Supabase call; a successful call upserts with `onConflict: "listing_id"`; a mode-lock trigger error (simulated Postgres error) surfaces as a failure message, not a crash; `saveBusinessHoursAction` deletes then inserts the given rows.
- [ ] **Step 2: Run** `npx vitest run src/lib/vibe/dining-actions.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, then make the two modifications above.
- [ ] **Step 4: Run it again, and `npx vitest run src/lib/vibe`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(vibe): add dining detail and business-hours actions`.

### Task 7: Health permit upload in the documents panel

**Files:**
- Modify: `src/components/vibe/documents-panel.tsx`

**Interfaces:** consumes the `health_permit` doc type added in Task 1; no new action (`recordVibeDocumentAction` already handles any `DocType`).

- [ ] **Step 1: Add a third `DocumentUploader`** after the venue permit block: `docType="health_permit"`, label `"Health or Food Handler's Permit (optional)"`, with a short line explaining it's a Food Handler's Permit for street food or a cookshop, or an Establishment/Health Permit for a restaurant, and that it earns the Trusted badge once checked.
- [ ] **Step 2: Run `npx tsc --noEmit` for this file.** Expected: no errors.
- [ ] **Step 3: Commit** `feat(vibe): add the optional health permit upload`.

### Task 8: Dining as a listing type at creation (UI, impeccable)

**Files:**
- Modify: `src/components/vibe/basics-tab.tsx` (`BasicsForm`'s subtype `RadioGroup`)

**Interfaces:** no schema or action change (Task 5 already widened `SUBTYPES`; `createListingAction` is generic).

- [ ] **Step 1: Invoke `impeccable:impeccable`, run its `context` command, read `DESIGN.md`.**
- [ ] **Step 2: Add a third radio option** to the "What are you listing?" group: `["dining", "Dining", "A restaurant, cookshop or street food vendor."]`, alongside attraction and event.
- [ ] **Step 3: Run `npx tsc --noEmit`.** Expected: no errors.
- [ ] **Step 4: Commit** `feat(vibe): offer dining as a listing type`.

### Task 9: Dining editor shell and Details tab (UI, impeccable)

**Files:**
- Create: `src/components/vibe/dining-listing-tab-names.ts`, `dining-listing-tabs.tsx`, `dining-details-tab.tsx`, `dining-basics-tab.tsx`
- Modify: `src/app/v/vibe/listings/[id]/page.tsx`

**Interfaces:**
- `dining-listing-tab-names.ts`: `export const DINING_LISTING_TABS = ["basics", "details", "tickets", "schedule", "hours", "location", "photos", "policy"] as const` (fixed display order); `export type DiningListingTab = (typeof DINING_LISTING_TABS)[number]`; `export function diningTabsFor(profile: DiningProfile | null): DiningListingTab[]` — always includes `basics`, `details`, `location`, `photos`; adds `tickets`+`schedule`+`policy` for `prepaid`; adds `schedule`+`policy` for `reservation`+`slotted`; adds `hours` for `reservation`+`hours_only`; adds nothing further for `listing_only` or a `null` profile.
- `dining-listing-tabs.tsx`: mirrors `listing-tabs.tsx`, iterating `diningTabsFor(listing.diningProfile)` instead of a fixed list; `basics` renders `DiningBasicsTab`, `details` renders `DiningDetailsTab`, `tickets`/`schedule`/`location`/`photos`/`policy` render the matching shared tab component from the events/attractions cycle (see the Prerequisite section above), `hours` renders `HoursTab` (Task 10).
- `dining-basics-tab.tsx`: status badge, review note, and the readiness card/submit gate — same shape as `BasicsTab` in `basics-tab.tsx` (read it first), but computed with `diningReadiness` (Task 4) instead of `vibeReadiness`, and wrapping the existing `BasicsForm` (reused as-is; it is a plain form with no readiness logic). When `listing.diningProfile?.bookingMode === "listing_only"`, also shows a note: travelers can only add this listing to an itinerary and pay the vendor in person; YaadGuide does not process payment or take a commission for it.
- `dining-details-tab.tsx`: a form over `diningDetailsSchema` (venue type, dine-in/takeout, cuisine types, price tier, booking mode, reservation style) calling `saveDiningDetailsAction`. Once `listing.diningProfile` is non-null, `bookingMode` and `reservationStyle` render disabled with a note that the choice is locked; every other field stays editable.
- `[id]/page.tsx`: branches on `listing.subtype === "dining"` to resolve against `DINING_LISTING_TABS`/render `DiningListingTabs`, otherwise keeps the existing `LISTING_TABS`/`ListingTabs` path unchanged.

- [ ] **Step 1: Load impeccable** (already set up if continuing the same session) and follow its craft floor.
- [ ] **Step 2: Build `dining-listing-tab-names.ts`** with the interface above.
- [ ] **Step 3: Build `DiningBasicsTab` and `DiningDetailsTab`** (venue type radios, dine-in/takeout checkboxes shown only for `restaurant`, a cuisine-type tag input capped at 10, a price-tier radio, a booking-mode radio with the three modes' one-line descriptions from the spec, a reservation-style radio shown only when `bookingMode === "reservation"`).
- [ ] **Step 4: Build `DiningListingTabs`** and wire the `[id]/page.tsx` branch.
- [ ] **Step 5: Run `npx tsc --noEmit`.** Expected: no errors.
- [ ] **Step 6: Commit** `feat(vibe): add the dining listing editor shell and details tab`.

### Task 10: Hours tab (UI, impeccable)

**Files:**
- Create: `src/components/vibe/hours-tab.tsx`

**Interfaces:** consumes `saveBusinessHoursAction`, `businessHoursSetSchema`, `listing.businessHours`.

- [ ] **Step 1: Build a weekly rows editor** — one row per day of the week, each with an open/closed toggle and, when open, start/end time pickers; saving sends the full week as one `businessHoursSetSchema`-shaped array (closed days simply omitted) to `saveBusinessHoursAction`.
- [ ] **Step 2: Run `npx tsc --noEmit`.** Expected: no errors.
- [ ] **Step 3: Commit** `feat(vibe): add the dining hours tab`.

### Task 11: Wire shared Tickets, Schedule, Location, Photos and Policy tabs

**Files:**
- Modify: `src/components/vibe/dining-listing-tabs.tsx`

**Interfaces:** reuses `TicketsTab` (already on this branch), and `ScheduleTab`, `LocationTab`, `PhotosTab`, `PolicyTab` from the events/attractions cycle (see the Prerequisite section — merge them in first if they are not yet present). None of these need a dining-specific change: they already operate generically on `listingId`.

- [ ] **Step 1: Confirm the five components exist on this branch** (merge `feat/vibe-vendor-side` in first if not).
- [ ] **Step 2: Wire each into `DiningListingTabs`** at the tab names `diningTabsFor` can produce for them (`tickets`, `schedule`, `location`, `photos`, `policy`).
- [ ] **Step 3: Run `npx tsc --noEmit`.** Expected: no errors.
- [ ] **Step 4: Commit** `feat(vibe): wire the shared tabs into the dining editor`.

### Task 12: Admin review for dining

**Files:**
- Modify: `src/lib/vendor/admin-queries.ts` (document types shown for a Vibe profile — if not already updated by the events/attractions cycle, add `health_permit`), the admin listing review queue/page from the events/attractions cycle (see the Prerequisite section — merge it in first if not present)

**Interfaces:** no new query or action — `getReviewVibeListings`/`reviewVibeListingAction` from the events/attractions cycle are subtype-agnostic. Only the display needs a dining-specific line: show `booking_mode` and `venue_type` alongside `subtype` in the queue row.

- [ ] **Step 1: Confirm the admin review queue exists on this branch** (merge in first if not).
- [ ] **Step 2: Add the `booking_mode`/`venue_type` display** to a dining row, and confirm `health_permit` appears in the vendor document review list.
- [ ] **Step 3: Run `npx tsc --noEmit`.** Expected: no errors.
- [ ] **Step 4: Commit** `feat(vibe): show booking mode and venue type in dining admin review`.

### Task 13: Docs

**Files:**
- Modify: `PRD.md`, `ARCHITECTURE.md`, `ARCHITECTURE-ESSENTIAL.md`

- [ ] **Step 1: `PRD.md`:** resolve the "VIBE attractions and dining" documents TODO (vendor section) with the health_permit-by-venue_type rule (Food Handler's Permit for street food/cookshop, Establishment/Health Permit for restaurant, both optional/Trusted-badge-only); record the three booking modes' vendor-side shape and the no-commission trade-off of `listing_only`.
- [ ] **Step 2: `ARCHITECTURE.md`:** describe `vibe_dining_profiles`, `vibe_business_hours`, the `health_permit` document type, and the booking-mode lock trigger. Update `ARCHITECTURE-ESSENTIAL.md` in the same change and add no fact that is not in `ARCHITECTURE.md`.
- [ ] **Step 3: Commit** `docs(vibe): record the dining vendor design`.

### Task 14: Final verification

- [ ] **Step 1:** `npx supabase db reset` then `npx supabase test db`. Expected: all pass, including the three new dining files and every pre-existing Vibe file.
- [ ] **Step 2:** `npm run typecheck`, `npm run lint` (0 errors; existing warnings are not a failure) and `npm run test`. Expected: all pass.
- [ ] **Step 3:** Start the dev server once, sign in as a vendor with a vibe profile, create a dining listing, set venue type and booking mode in Details, confirm the editor's tab set matches the chosen mode, fill the mode-specific tab (tickets/schedule or hours), submit; stop the server and free the port.
- [ ] **Step 4:** Report any failure by name; do not claim success without the output.
