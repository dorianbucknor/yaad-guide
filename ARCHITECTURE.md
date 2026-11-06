# Architecture

## Structure

Single Next.js app in `web/` (App Router, TypeScript, Tailwind v4, shadcn/ui, `src/` directory, `@/*` alias). Hosted on Vercel. Backend is Supabase plus Next.js server code; there is no separate Node.js service.

Current layout (from the repo):

- `src/app/`: routes, layout, global styles (`globals.css`).
- `src/app/layout.tsx`: loads fonts (Bricolage Grotesque, Figtree, Geist Mono), applies the saved theme before first paint, and mounts `Providers`.
- `src/app/design/`: development reference page for colors, type and base components.
- `src/components/ui/`: shadcn/ui components (Base UI based `base-nova` style).
- `src/components/providers.tsx`: client providers mounted once in the root layout: TanStack Query client, tooltip provider, toaster, and theme initialization.
- `src/stores/`: zustand stores for client UI state. Currently `theme-store.ts`.
- `src/hooks/`: shared hooks (shadcn's `use-mobile.ts`).
- `src/lib/utils.ts`: shared helpers.

Planned layout (TODO(bootstrap): confirm once routes are designed):

- `src/app/(traveler)/`: browse, listing detail, itinerary, checkout, bookings.
- `src/app/(vendor)/`: vendor dashboard and onboarding.
- `src/app/(admin)/`: vendor approval, sponsored slots, payouts.
- `src/app/api/`: route handlers for the WiPay webhook and scheduled jobs.
- `src/lib/`: Supabase clients, fee and payout calculation, adapters.

## Data model

Draft derived from the PRD. Every table needs row-level security. TODO(bootstrap): exact columns and constraints.

- **profiles**: one per auth user, created by a trigger on sign-up. Columns: `role` (`traveler` by default, `vendor` or `admin`), `first_name`, `last_name`, `phone` and `phone_verified_at` (mirrored from Supabase's verified phone, never written by the client), `profile_photo_link` (a path in the `avatars` storage bucket), `profile_status` (`active`, `suspended`, `deactivated`, `archived`) with `archived_at` set while an account waits out its seven-day deletion period, and `created_at`, `updated_at`, `updated_by` set by a trigger. Admin is set in the database only. Email lives on the auth user; the government ID is account-level and arrives with vendor onboarding.
- **audit_log**: who changed which row and when (`table_name`, `row_id`, `action`, `actor_id`, `old_values`, `new_values`). Written by trigger only (profiles today); admins can read it.
- **permissions** and **role_permissions**: a catalog of named permissions and which role holds each. Today six: `vendors.review`, `documents.verify`, `identity.reject`, `transfers.review`, `audit.read`, `profiles.read_all`, all held by `admin` only. App users cannot read or write them; rows change only through migrations. Permissions for later features are added by the migration that builds each feature: `vendors.suspend`, `listings.moderate`, `bookings.read_all`, `bookings.override`, `payouts.read`, `payouts.approve`, `refunds.issue`, `sponsored.manage`, `fees.manage`, `reviews.moderate`, `reviews.imported.manage`, `users.suspend`, `roles.assign` and `permissions.manage` (SQL only).
- **notification_preferences**: one row per account, category and channel (`email`, `sms`) with `enabled`. Categories: `account_security` (email cannot be disabled), `bookings`, `vendor_review`, `document_expiry`, `offers`. Defaults are in code, so a missing row means the default. A person reads and writes only their own rows.
- **vendor_profiles**: up to three per account, one per category (STAY, MOVE, VIBE), with an optional business name, a primary region (informational, never a limit on where the vendor works) and a status of its own (`draft`, `pending`, `approved`, `rejected`) with `review_note`, `submitted_at`, `reviewed_at`, `reviewed_by`. Unique on (account, category), not on the business name. Listings, ratings and reviews belong to the vendor profile. Vendors can edit only while `draft` or `rejected`; submitting and reviewing go through the security-definer functions `submit_vendor_profile` and `review_vendor_profile`. Approval needs the government ID, the JTB license and the active vehicle's insurance and fitness certificates to be checked by an admin and unexpired.
- **vendor_documents**: submitted verification files: `doc_type` (`government_id`, `jtb_license`, `insurance`, `fitness`; later JCF permit, ownership proof, business registration), `storage_path` in the private `vendor-documents` bucket (path `<account_id>/<document_id>.<ext>`; PDF, JPG or PNG, 5 MB), `expires_on` (required for JTB license, insurance and fitness), and an admin-set `verified` flag. The government ID belongs to the account, the JTB license to the vendor profile, insurance and fitness to a vehicle. Admins view files through short-lived signed URLs.
- **vendor_vehicles**: MOVE vehicles, many per vendor profile: type, make, model, year, `plate` (normalized, unique across the platform), passenger capacity and `is_active`. A partial unique index allows one active vehicle per profile; activating needs verified, unexpired insurance and fitness certificates.
- **vehicle_transfers**: a new owner requests a vehicle by plate, the current owner agrees or declines, and only an agreed request reaches an admin to approve or reject (`requested`, `owner_agreed`, `owner_declined`, `approved`, `rejected`). Approval moves the vehicle to the new profile, clears `is_active` and deletes its insurance and fitness rows so the new owner uploads their own. Never automatic.
- **listings**: vendor profile, category, `vibe_subtype` (including `dine`), status (`draft`, `published`), `booking_mode` (instant or request; for dining: reservation, prepaid or listing-only), cancellation policy (flexible, moderate, strict), `commission_included` flag for affiliate listings, USD price, area, and for STAY and VIBE a `location` geopoint pinned by the vendor on a Google Maps map (the only place a map is shown; listings have none). Travelers see the area name until a booking is confirmed, then an "Open in maps" link to the device map app (the exact point must be protected server-side or by row-level security, not just hidden in the UI). The Google Maps key is restricted and kept in environment variables. MOVE vehicle types are Sedan, SUV, Minivan, Station Wagon/Hatchback, Bus, Coach; MOVE vendors need both insurance and fitness certificates.
- **room_types** (STAY): per listing, with price and a calendar of blocked or booked nights.
- **time_slots** (VIBE): date or time slot with capacity (tickets or seats) that bookings decrement.
- **driver_availability** (MOVE): service areas, vehicle capacity, base prices, blocked dates. No inventory.
- **itineraries**: traveler, day-by-day items referencing listings; free to build.
- **trips and bookings**: a trip groups the bookings paid at one checkout. Booking states include `requested` (MOVE), `confirmed`, `completed`, `cancelled`. Trip start is the earliest booking date.
- **payments and refunds**: WiPay transactions into YaadGuide's account, including the planning fee and refunds.
- **payouts**: manual vendor transfers. Release timing by category: MOVE after delivery, STAY 24 hours after check-in, VIBE immediately.
- **reviews**: one verified review per completed booking. **external_reviews**: imported Google and similar reviews, cached with source and attribution, never counted in the YaadGuide rating.
- **sponsored_slots**: listing, start and end dates, weekly price, granted by admin. Maximum 3 active per category.
- **config**: planning fee (US$20 default), commission percentages (MOVE 10%, STAY and VIBE 10% placeholder), sponsored price (US$3.50 per week). All values are configurable, not hard-coded.

## Auth

Supabase Auth with email/password and Google for both travelers and vendors. All auth routes live under `/auth` (sign-in, sign-up, vendor onboarding, confirmation callback). Roles live in `profiles.role` and are mirrored into `app_metadata.role`, which users cannot edit and which appears in the JWT; the token role only routes pages in the proxy. Every admin-only rule in the database and in server actions asks `authorize(permission)`, which reads the caller's live role from `profiles` and the `role_permissions` table, so a demoted admin loses access at once. New accounts are `traveler`. A vendor sign-up starts at `/auth/vendor`; after email confirmation (or the Google return) `/auth/vendor/complete` calls the database function `claim_vendor_role()`, the only app path that changes a role: it upgrades `traveler` to `vendor` for the caller and never touches `admin`. `admin` is assigned in the database. Clients can write only `first_name`, `last_name` and `profile_photo_link` on `profiles` (column grants). Sessions use `@supabase/ssr` cookies; `src/proxy.ts` refreshes the session and guards routes by role (`/vendor` needs vendor or admin, `/admin` needs admin, `/profile` and `/plan/checkout` need sign-in); server code reads claims with `getClaims()` and uses `getUser()` before sensitive changes. Email confirmation is required and passwords reset by email link. Phone numbers are verified with Supabase's phone-change flow (`updateUser({ phone })`, then `verifyOtp` of type `phone_change`): vendors verify during onboarding, travelers before checkout, and changing the number re-verifies. The SMS provider is not chosen yet. The vendor creates the account first, then completes a vendor profile in a stepped flow that saves a draft at each step; the profile is locked while pending admin review. Deleting an account archives it for seven days: the proxy sees an `archived` flag in the token and sends the person only to `/auth/restore`, and `account_is_active()` keeps archived accounts out of anything public. A daily job then deletes the account permanently. Browsing is public. Itinerary creation and booking require sign-in. A vendor can create draft listings while unverified; publishing requires admin approval. Vendor contact details (phone and email) are exposed to a traveler only after a booking is confirmed.

## API boundaries

- Supabase handles database, auth, storage (verification documents, images) and real-time updates, with row-level security as the primary access control.
- Next.js server actions and route handlers handle everything that needs secrets or trust: WiPay checkout and webhook, fee and refund calculation, booking state changes, payout records, external review import, vendor approval.
- Scheduled jobs (Vercel cron) trigger payout-due checks, review refresh and the daily purge of accounts archived more than seven days ago (`GET /api/cron/purge-archived`, protected by `CRON_SECRET`; it is the only code that uses the service-role key, kept in a server-only environment variable, to delete the account's files and auth user). TODO(bootstrap): confirm job list.
- Payments sit behind a payment adapter so split payouts can replace the manual transfer when WiPay supports them.
- Client-side state has three homes, each with one job:
  - **zustand** for UI state that lives only in the browser (theme today; later things like the in-progress itinerary draft or filter state, if they need to be shared across components). Stores are in `src/stores/`.
  - **TanStack Query** for data that comes from the server (listings, bookings, reviews). It caches and refetches; do not copy server data into zustand.
  - **react-hook-form with zod** for forms. One zod schema per form is the single source of validation, and the same schema should be reused in the server action that receives the data. Forms use shadcn's `field` component (shadcn no longer ships `form`) with `@hookform/resolvers` to connect zod.
- Email notifications only. TODO(bootstrap): email provider.
- External review APIs (Google Places and others) are fetched and cached short-term with attribution, subject to each provider's terms.

## Decisions

- **Supabase plus Next.js server code, no separate Node.js service.** One codebase and deploy for v1. Rejected: a separate Node API, which adds a second deployment. Payment logic can move out later if needed.
- **WiPay with funds held by YaadGuide, manual vendor payout.** WiPay does not support split payouts. Rejected: Stripe Connect (not verified to support Jamaican vendors, not decided), PayPal.
- **USD only for prices and payouts.** Simplest for tourists. Rejected: per-listing currency and JMD conversion.
- **Vendor-set cancellation policy from a fixed set.** Fits different vendor types. Rejected: one policy for all, and no self-serve refunds.
- **Planning fee per trip, not per booking.** A five-item trip would otherwise cost $100 in fees. Waived for VIBE-only trips.
- **Imported reviews kept separate from the YaadGuide rating.** Keeps the rating tied to verified bookings and avoids mixing data under different provider terms.
- **DINE as a subtype of VIBE, not a fourth pillar.** The brand is STAY, MOVE, VIBE, and a dining listing behaves like a VIBE listing. A `vibe_subtype` field makes a later split cheap.
- **One account, up to three vendor profiles (one per category).** Identity (name, phone, email, government ID) is stored once; verification, listings and reviews are per profile, so a person can be an approved MOVE vendor while their STAY profile is still pending. The unique constraint is on account plus category, which also stops a second MOVE sign-up without a special case. Rejected: one account per category (duplicate identity and logins), and one category per vendor.
- **Sponsored listings are admin-granted in v1.** No vendor payment flow needed. Self-serve comes later.
- **Email only for notifications.** WhatsApp dropped; in-app messaging is a later feature.
- **Hosting on Vercel.** Default for Next.js with cron support.
- **zustand for client UI state, and zustand owns the theme.** Small, no provider boilerplate, and it can be read outside React (the toaster, an inline pre-paint script). Rejected: `next-themes` (removed, since the founder wants one state library), and React context (re-renders and more boilerplate).
- **TanStack Query for server state.** Gives caching, refetching and loading and error states for listings and bookings. Rejected: hand-written `useEffect` fetching, and storing server data in zustand.
- **react-hook-form with zod for forms.** Matches shadcn's `field` component, and zod schemas can be shared between the browser and server actions. Rejected: uncontrolled hand-built forms.
- **Theme saved in `localStorage`, not in the database.** The preference is per device and needed before first paint, so an inline script reads `yg-theme`. The theme store skips automatic hydration and rehydrates after mount, so server and client markup match.
- **Mobile touch targets enforced in the shared components.** `Button` and the form controls (input, select, toggle, tabs, accordion, calendar, menu items) are at least 44px below the `md` breakpoint, and checkbox, radio and switch have enlarged tap areas, so screens do not each have to remember it. Rejected: setting sizes per screen.
- **Date-reading components render on the client only.** With Cache Components enabled, a component that reads the current date during prerender fails the production build (the dev server does not report it). The calendar is rendered after mount behind a `useIsClient` check, with its space reserved. Not tried: wrapping in `Suspense` so the date is read at request time; that may suit pages that are dynamic anyway.
- **Brand primary is `#0A7A49`.** It passes AA with white text (5.39:1) and replaces the original `#0E9A5D` (3.62:1), which failed for normal text. In dark mode it is too dim for text or borders, so primary buttons use a lighter green there.
