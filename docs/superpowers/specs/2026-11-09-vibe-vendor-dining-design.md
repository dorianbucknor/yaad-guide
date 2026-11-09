# Vibe vendor side, dining: design

Status: approved in conversation 2026-11-09, awaiting written-spec review.

## Goal

Let a Vibe vendor sign up as a dining vendor, describe their venue, choose how travelers will eventually book (reservation, prepaid experience, or listing only), set pricing/schedule/hours where the mode needs them, and submit for admin review. Traveler browsing, booking and payment are a later cycle — same slice boundary as the events/attractions cycle it builds on (`docs/superpowers/specs/2026-11-09-vibe-vendor-side-design.md`).

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Slice | Vendor side only. No traveler pages, no booking, no payment, no reviews. |
| Subtype | `vibe_listings.subtype` gains `dining`, alongside `event` and `attraction`. Shared columns (title, description, area, address, coordinates, photos, status, review, cancellation_policy) behave identically across all three subtypes. |
| Booking modes | All three PRD modes ship now: `reservation`, `prepaid`, `listing_only`. Chosen once at listing creation and locked — switching modes means creating a new listing, to avoid orphaned tickets/schedule/hours. |
| Dining details | A sibling 1:1 table, `vibe_dining_profiles`, holds everything dining-specific (`venue_type`, `dine_in`/`takeout`, `cuisine_types`, `price_tier`, `booking_mode`, `reservation_style`). Keeps `vibe_listings` and the events/attractions schema/tests untouched. |
| Venue type | Vendor picks one of `street_food`, `cookshop`, `restaurant`. `restaurant` additionally requires at least one of `dine_in`/`takeout`. |
| Reservation style | Only meaningful when `booking_mode = 'reservation'`: `slotted` (reuses `vibe_schedule_rules` + `vibe_slots`, capacity = covers, no ticket types) or `hours_only` (new `vibe_business_hours` table, no capacity, no slot generation). Vendor's choice. |
| Prepaid pricing | Reuses `vibe_ticket_types` + `vibe_schedule_rules` + `vibe_slots` exactly as events/attractions do (free tickets, discounts, confirmation dialog, no commission on free). |
| Listing only | No ticket types, no schedule, no hours, no capacity at all. Traveler can only add the listing to an itinerary and pay the vendor in person; YaadGuide takes no commission, by design. The editor shows an explicit note explaining this. |
| Documents | Government ID + `business_registration` required to submit (unchanged from events/attractions). New optional document type `health_permit`: a Food Handler's Permit for `street_food`/`cookshop`, an Establishment/Health Permit for `restaurant`. Optional, earns the Trusted badge only — never required to submit. |
| Cuisine/price tier | `cuisine_types` (multi-select) and `price_tier` (`$`/`$$`/`$$$`) are recorded on `vibe_dining_profiles` but not required to submit. |
| Cancellation policy | Shown only where a booking record will exist: `prepaid` and `reservation` + `slotted`. Hidden for `listing_only` and `reservation` + `hours_only` — nothing to cancel. |
| Map | MapLibre with OpenFreeMap tiles, as for events/attractions. |
| Address | Entered manually (no reverse geocoding in this cycle). |
| UI work | Built with the `impeccable` skill. |

## Data model

Builds on the events/attractions migrations already planned (`vibe_listings`, `vibe_ticket_types`, `vibe_schedule_rules`, `vibe_slots`, `vibe_blocked_dates`, `vibe_photos`, `vibe_listing_flags`). This cycle adds:

- **`vibe_listings.subtype`**: check constraint widened to `'event' | 'attraction' | 'dining'`. No other column changes.
- **`vibe_dining_profiles`**: `listing_id` (uuid, FK → `vibe_listings`, unique — one row per dining listing), `venue_type` (`street_food` | `cookshop` | `restaurant`), `dine_in` (boolean, default false), `takeout` (boolean, default false), `cuisine_types` (text array), `price_tier` (`$` | `$$` | `$$$`, nullable), `booking_mode` (`reservation` | `prepaid` | `listing_only`), `reservation_style` (`slotted` | `hours_only`, nullable). Checks: `reservation_style` is set if and only if `booking_mode = 'reservation'`; when `venue_type = 'restaurant'`, `dine_in or takeout`. A trigger (mirroring `require_vibe_profile`) rejects the row unless its listing's `subtype = 'dining'`. Cascade-deletes with the listing.
- **`vibe_business_hours`**: `listing_id`, `weekday` (0–6), `opens_minutes` (0–1439), `closes_minutes` (0–1439, check `> opens_minutes`). Unique on `(listing_id, weekday)`. Used only for `reservation` + `hours_only`; no capacity, no row in `vibe_slots`.
- **Document types**: `vendor_documents.doc_type` gains `health_permit` (profile-level, expiry optional, one per profile — same shape as `venue_permit`'s unique index). `submit_vendor_profile`/`review_vendor_profile` are unchanged for dining beyond what the events/attractions migration already does (government ID + business registration required; `health_permit` and `venue_permit` are both optional, Trusted-badge-only, and never block submit).

Row-level security: same pattern as the events/attractions tables — owner reads/writes their own rows via `owns_vibe_listing`; admin reads all via `listings.review`; no public read policy this cycle. `vibe_dining_profiles` and `vibe_business_hours` grants mirror `vibe_listings`' column grants (no `status`/review columns to protect, since they carry none).

Readiness (`vibe_listing_is_ready`, extended for `subtype = 'dining'`): the shared checks (profile approved; title, description, area, address, town, parish, coordinates; cover photo) plus `venue_type` set, and if `restaurant`, `dine_in or takeout`; then by `booking_mode`:
- `prepaid`: at least one ticket type, and at least one future open slot or an active schedule rule with auto-generation on (identical to events/attractions).
- `reservation` + `slotted`: at least one future open slot or active schedule rule (no ticket-type requirement).
- `reservation` + `hours_only`: at least one `vibe_business_hours` row.
- `listing_only`: no further requirement.

## Vendor pages

Reuses the events/attractions dashboard, listing list, calendar, onboarding and profile pages wholesale — dining is just another subtype on them. New or mode-conditional pieces:

- **Onboarding/profile**: documents panel gains the optional `health_permit` upload, labeled by the vendor's `venue_type` ("Food Handler's Permit" for `street_food`/`cookshop`, "Establishment/Health Permit" for `restaurant`).
- **Listing creation**: vendor picks subtype `dining`, then `venue_type`, then `booking_mode` (locked after creation).
- **Basics tab**: shared fields plus `venue_type`, `dine_in`/`takeout` checkboxes (restaurant only), `cuisine_types`, `price_tier`.
- **Pricing & Tickets tab**: shown only for `prepaid`. Identical to the events/attractions Tickets tab.
- **Schedule tab**: shown for `prepaid` and `reservation` + `slotted`. Identical to the events/attractions Schedule tab; capacity is labeled "covers" for reservation mode.
- **Hours tab** (new): shown for `reservation` + `hours_only`. Weekly open/close rows per day, no capacity, no slot generation.
- **Location / Photos tabs**: unchanged, shared.
- **Cancellation tab**: shown only for `prepaid` and `reservation` + `slotted`; omitted entirely for `listing_only` and `reservation` + `hours_only`.
- **Listing-only note**: an explicit note on the editor (and later the dashboard) explaining that travelers visit in person to order and pay, and YaadGuide does not process payment or take a commission for this mode.

Admin: the existing listing review queue and vendor document review already extended for events/attractions also cover dining — queue rows show `subtype`, and for dining, `booking_mode` and `venue_type`; document review adds the `health_permit` type.

## Out of scope

Traveler browsing/itinerary/booking/payment for dining, actual reservation acceptance or confirmation, commission logic, per-dish menu items, reviews. (Same boundary as the events/attractions cycle.)

## Docs to update in the same change

- `PRD.md`: resolve the "VIBE attractions and dining" documents TODO (line 35) with the health_permit-by-venue_type rule; record the three booking modes' vendor-side shape (reservation/prepaid/listing_only), venue types, and the no-commission listing_only trade-off.
- `ARCHITECTURE.md` and `ARCHITECTURE-ESSENTIAL.md`: the `vibe_dining_profiles` and `vibe_business_hours` tables, the `health_permit` document type. Both files change together.

## Testing

Vitest and pgTAP, following the events/attractions pattern: readiness per booking_mode, the venue_type/dine_in/takeout check, the reservation_style exclusivity check, business-hours bounds, and action validation (mode-conditional server actions reject the wrong fields for the listing's mode). Run `npm run typecheck`, `npm run lint`, `npm run test` and `npx supabase test db` once at the end.

## Assumptions to confirm during review

- `cuisine_types` has no fixed enum yet — free-form tags for now; a controlled vocabulary can come later without a migration (text array).
- `price_tier` is vendor-self-reported, not derived from ticket prices.
- Locking `booking_mode` at creation (no edit path) is acceptable for v1; if vendors frequently need to switch, this can be revisited once real usage is seen.
