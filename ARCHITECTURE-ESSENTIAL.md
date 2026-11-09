Derived from ARCHITECTURE.md, updated 2026-11-06. It mirrors ARCHITECTURE.md: update it in the same change whenever ARCHITECTURE.md changes.

# Architecture (essential)

## Stack

- Next.js (App Router), TypeScript, Tailwind v4, shadcn/ui (Base UI based), `src/` directory, `@/*` alias. Deployed on Vercel.
- Client state: zustand for browser-only UI state (owns the theme), TanStack Query for server data, react-hook-form with zod for forms.
- Supabase for database, auth, storage and real-time. No separate Node.js service; server-side logic runs in Next.js server actions and route handlers.
- Payments through WiPay into YaadGuide's account; vendors are paid out manually. Vendors price in USD or JMD (the entered amount is the source of truth); fixed YaadGuide amounts are USD.

## Folder map

- `src/app/`: routes and layout. Planned groups: `(traveler)`, `(vendor)`, `(admin)`, `api/` (WiPay webhook, cron jobs).
- `src/app/design/`: development reference page for colors, type and base components.
- `src/components/ui/`: shadcn/ui components.
- `src/components/providers.tsx`: query client, tooltip provider, toaster and theme setup, mounted once in the root layout.
- `src/stores/`: zustand stores (theme today).
- `src/lib/`: helpers, Supabase clients, fee and payout calculation, adapters.

## Data flow

- Browse is public. Itineraries and bookings need sign-in.
- Traveler builds an itinerary (free), then checks out once: trip planning fee plus bookings, paid via WiPay to YaadGuide.
- STAY and VIBE confirm instantly against inventory. MOVE is a request the vendor accepts before payment is taken.
- Payout to vendors is manual: MOVE after delivery, STAY 24 hours after check-in, VIBE immediately.
- After confirmation, the traveler sees the vendor's phone and email. Reviews come only from completed bookings; imported public reviews are shown separately.

## Hard rules

- Server data goes through TanStack Query, never into zustand. zustand is for browser-only UI state.
- Every form uses react-hook-form with a zod schema, and server actions validate with the same schema.
- Theme is the zustand `theme-store`; do not add another theme library.
- Buttons and form controls are at least 44px tall below the `md` breakpoint (built into the shared components). Any new component must meet this too.
- Components that read the current date (calendar, date pickers) render on the client only (`useIsClient`), or the production build fails. Always run `npm run build` after adding one.
- Brand primary is `#0A7A49`. Do not use it for text or borders on dark surfaces (2.76:1); use the dark-mode tokens.
- Every Supabase table has row-level security.
- All auth routes live under `/auth`. The vendor creates the account first, then completes a vendor profile in a stepped flow that saves a draft at each step; the profile is locked while pending admin review.
- Roles are `traveler`, `vendor`, `admin`. `admin` is assigned in the database only. The role lives in `profiles.role` and is mirrored into `app_metadata.role`; the only app path that changes it is `claim_vendor_role()` (traveler to vendor). Clients can write only name and photo on `profiles`. Admin-only checks use `authorize(permission)`, which reads the live role from `profiles` and the `role_permissions` table (not the token); the six permissions today are `vendors.review`, `documents.verify`, `identity.reject`, `transfers.review`, `audit.read` and `profiles.read_all`, held by `admin`. Each later feature adds its own permissions in its migration.
- `src/proxy.ts` refreshes the session and guards routes by role; server code reads claims with `getClaims()` and uses `getUser()` before sensitive changes.
- Phone numbers are verified with Supabase's phone-change flow: vendors during onboarding, travelers before checkout; changing the number re-verifies.
- One account (name, phone, email, government ID) can have up to three vendor profiles, one per category; unique on account plus category. Verification, listings, ratings and reviews are per vendor profile.
- Deleting an account archives it for seven days (signing in offers a restore; archived accounts are hidden from travelers), then a daily cron route (`/api/cron/purge-archived`, protected by `CRON_SECRET`) deletes it permanently. That route is the only code that uses the service-role key, a server-only environment variable. Notification preferences are stored per account, category and channel; account and security email cannot be turned off.
- Vendor profile status is `draft`, `pending`, `approved` or `rejected`. Vendors can edit only while `draft` or `rejected`; submit and review run through security-definer functions. Vendors may build draft listings before approval; listings go live only after admin approval of that vendor profile. Approval needs the government ID, JTB license and the active vehicle's certificates checked by an admin and unexpired.
- Verification documents sit in the private `vendor-documents` bucket (PDF, JPG or PNG, 5 MB) and are viewed by admins through short-lived signed URLs. Insurance, fitness certificates and the JTB license carry a required expiry date. The government ID is account-level, the JTB license is per profile, and insurance and fitness belong to a vehicle.
- A MOVE vendor can register several vehicles but has one active at a time; plates are unique across the platform, and a vehicle changes owner only through a transfer that the new owner requests, the current owner agrees to, and an admin approves. The primary region is informational and never limits where a vendor works.
- MOVE listing: one per MOVE vendor profile, currency USD or JMD. Status, review, photo verification and request state change only through security-definer functions, never direct writes. Route distances between places are estimates. Accepting a request locks the listing and refuses overlapping trips (30-minute buffer, same value in SQL and `MOVE_CONFIG`) but does not re-check weekly windows or blocked dates. Three cron routes (`purge-archived`, `expire-move-requests`, `extend-vibe-slots`) are the only users of the service-role client. `npm run seed:demo` fills the local Docker stack only and refuses non-local URLs.
- VIBE listing (events, attractions and dining): many per VIBE vendor profile, in `vibe_*` tables. A VIBE profile goes live on the account's government ID plus a business registration; a venue permit is optional and only earns the Trusted badge. A listing has ticket types (price zero or more, optional percent discount, a free ticket needs a recorded confirmation and carries no commission), a typed address and a map pin that stay hidden from travelers until a booking is confirmed, a weekly schedule that creates slots for a rolling 90 days in Jamaica time (also slots added by hand, and a per-listing switch for automatic creation), and a booking cutoff the vendor sets (default 60 minutes). Status, review and ticket saving go through security-definer functions; a day with bookings cannot be closed. The map is MapLibre with OpenFreeMap tiles, no key.
- VIBE dining listing: a third `vibe_listings` subtype with dining details in `vibe_dining_profiles` and weekly opening hours in `vibe_business_hours` (hours cannot pass midnight), written directly by the owner under row-level security. The vendor chooses the booking mode (reservation by time slot or by opening hours, prepaid, or listing only) once; a database trigger refuses a later change. Readiness depends on the mode (prepaid needs a ticket and slots, a slotted reservation needs slots, an hours reservation needs hours, listing only needs nothing more). A listing-only venue takes no payment and no commission. A health permit is an optional document that only earns the Trusted badge. Vendors can write their own business registration, venue permit and health permit on a profile that is not with an admin.
- Fees, commissions and sponsored pricing are configurable values, never hard-coded: planning fee US$20, MOVE commission 10%, STAY and VIBE commission 10% (placeholder), sponsored US$3.50 per week.
- Planning fee is per trip, waived for VIBE-only trips. Commission is skipped on listings that already include one.
- Vendor contact details and the exact map pin of a STAY or VIBE listing are hidden until a booking is confirmed.
- Imported reviews never count toward the YaadGuide rating.
- Payment code sits behind an adapter so WiPay split payouts can replace manual transfers later.
- Max 3 sponsored listings per category; sponsored listings always show a "Sponsored" label.

## Pointers

- Data model: `ARCHITECTURE.md` > Data model.
- Auth and role rules: `ARCHITECTURE.md` > Auth.
- What runs on the server, jobs and external APIs: `ARCHITECTURE.md` > API boundaries.
- Reasons and rejected alternatives: `ARCHITECTURE.md` > Decisions.
