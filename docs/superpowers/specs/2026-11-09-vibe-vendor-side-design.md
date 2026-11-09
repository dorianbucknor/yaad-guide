# Vibe vendor side: design

Status: approved in conversation 2026-11-09, awaiting written-spec review.

## Goal

Let a Vibe vendor sign up, list events and attractions, set when and how many people each can take, and submit listings for admin review. Traveler browsing, booking and payment are a later cycle.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Slice | Vendor side only. No traveler pages, no booking, no payment, no reviews. |
| Subtypes | `event` and `attraction`. Dining ships in a later cycle (reservation, prepaid and listing-only modes are a separate model). |
| Schedule | Weekly pattern plus one-off dates. Any single date can be closed or have its capacity changed. |
| Pricing | Ticket types per listing, each with its own price and a short description. Currency (USD or JMD) is set per listing; the entered amount is the source of truth. |
| Going live | Two levels (PRD "Decided" line). Admin approves government ID plus business registration (certificate or TRN). Venue proof only earns the Trusted badge. PRD line 34 is corrected to match. |
| Map | MapLibre with OpenFreeMap tiles (already in the repo, no key). Replaces Google Maps in `ARCHITECTURE.md`. |
| Address | Entered manually (no reverse geocoding in this cycle). |
| Storage | Dedicated `vibe_*` tables that mirror `move_*`. |
| UI work | Built with the `impeccable` skill. |

## Data model

One migration set under `supabase/migrations/`, following the `move_listing_tables` / `move_listing_functions` split.

- **vibe_listings**: `vendor_profile_id`, `subtype` (`event` | `attraction`), `title`, `description`, `area` (public area name), `address_line1`, `address_line2` (optional), `town`, `parish` (one of the 14 parishes), `location` (geopoint, the venue pin), `currency` (`USD` | `JMD`), `duration_minutes`, `booking_cutoff_minutes` (set by the vendor, default 60, between 0 and 10080 which is 7 days), `cancellation_policy` (`flexible` | `moderate` | `strict`), `status` (`draft` | `in_review` | `live` | `paused`), timestamps.
- **vibe_ticket_types**: `listing_id`, `name`, `description` (optional, capped at 200 characters), `price` (numeric, in the listing currency), `max_per_booking` (optional), `sort_order`.
- **vibe_schedule_rules**: `listing_id`, `weekday` (0 to 6), `start_minute` (minutes since Jamaica midnight, as in `move_availability_rules`), `capacity`, optional `valid_from` and `valid_until`.
- **vibe_slots**: `listing_id`, `starts_at` (timestamptz), `capacity`, `booked` (default 0, never above `capacity`), `status` (`open` | `closed`), `source` (`rule` | `one_off`). Unique on (`listing_id`, `starts_at`). Bookings will decrement through a function in the booking cycle.
- **vibe_blocked_dates**: `listing_id`, `date`. Stops regeneration from reopening a closed day.
- **vibe_photos**: `listing_id`, storage path, `is_cover`, `sort_order`. Files go in the public `listing-photos` bucket under `<user id>/vibe/<listing id>/`.

Slot generation: a function `generate_vibe_slots(listing_id)` writes slots from the rules for a rolling 90-day window. It runs when a rule is saved and from the daily job. It never touches slots that have `booked > 0` or that were edited by hand, and it skips blocked dates. Jamaica time is a fixed UTC-5 with no daylight saving.

Status and review: written only by security-definer functions `submit_vibe_listing` and `review_vibe_listing`, which reuse the existing `listings.review` permission. Vendors cannot set `status` directly. A price or photo change on a live listing is recorded as a flag for an admin (reuse `listing_flags` if its shape allows; otherwise add a `vibe_listing_id` column in the migration) instead of unpublishing the listing.

Row-level security: vendors read and write only rows under their own vendor profile; admins read all. There is no public read policy in this cycle.

Privacy: `address_*` and `location` must stay hidden from travelers until a booking is confirmed (PRD). Nothing is public yet, so nothing leaks now. The traveler cycle must protect both server-side (separate column grants or a confirmed-booking function), not in the UI.

## Vendor pages

Replace the `vibe` entry in `src/app/v/[category]/[[...slug]]/page.tsx` with real routes under `src/app/v/vibe/`:

- `onboarding`: business name, region, business registration upload (reuse `document-uploader`, `checklist`, `submit-panel`, `status-banner`). Government ID is already on the account.
- `/v/vibe` (dashboard): listing statuses, upcoming slots with fill, readiness checklist. Booking numbers arrive with the booking cycle; until then fill shows 0.
- `listings` and `listings/[id]`: list and editor. Editor tabs: Basics (includes the booking cutoff, shown in hours or minutes, default 1 hour), Tickets, Schedule, Photos, Location, Cancellation. Location holds the MapLibre pin picker and the manual address fields.
- `calendar`: month view of slots. Add a one-off date, change a date's capacity, close or reopen a date.
- `profile`: vendor profile and optional venue-proof uploads (Trusted badge).

Admin: the existing vendor review and listing review queues also list Vibe profiles and listings, with `vendor_documents` kinds extended for business registration and venue proof.

## Rules

A listing can be submitted for review when it has all of:
- a title and a description;
- at least one ticket type with a price above zero;
- at least one future slot or a schedule rule that produces one;
- a cover photo;
- a map pin and a complete address (`address_line1`, `town`, `parish`);
- a cancellation policy.

The cancellation policy uses the existing STAY and VIBE tiers: Flexible (full refund 24h or more before), Moderate (full 120h or more, 50% from 24h to 120h), Strict (50% 168h or more, none after), plus the 1-hour grace period. This cycle only stores and displays the choice; refunds are calculated in the booking cycle.

## Out of scope

Dining, traveler browse and listing pages, itinerary cards, bookings and payment, refunds, reviews, email notices, reverse geocoding, and the public side of the Trusted badge.

## Docs to update in the same change

- `PRD.md`: replace "JCF permit required for every event" (vendor section, VIBE events line) with the two-level rule; record manual address entry and ticket-type descriptions.
- `ARCHITECTURE.md` and `ARCHITECTURE-ESSENTIAL.md`: the `vibe_*` tables, MapLibre instead of Google Maps, address privacy note. Both files change together.

## Testing

Vitest, following the Move pattern: slot generation from rules (weekday matching, Jamaica time, 90-day window, blocked dates, not touching booked or edited slots), submit-readiness, action validation, and cancellation-policy display. Run `npm run typecheck`, `npm run lint` and `npm run test` once at the end.

## Assumptions to confirm during review

- Booking cutoff is chosen by the vendor per listing, default 60 minutes, range 0 minutes to 7 days.
- 90-day slot window (how far ahead weekly-pattern slots exist; one-off dates are not limited by it).
- Cover photo is the only required photo; the gallery is optional.
- Ticket description cap of 200 characters.
- Fixed UTC-5, no daylight saving.
