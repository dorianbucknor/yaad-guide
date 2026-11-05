Derived from ARCHITECTURE.md, updated 2026-11-05. It mirrors ARCHITECTURE.md: update it in the same change whenever ARCHITECTURE.md changes.

# Architecture (essential)

## Stack

- Next.js (App Router), TypeScript, Tailwind v4, shadcn/ui (Base UI based), `src/` directory, `@/*` alias. Deployed on Vercel.
- Client state: zustand for browser-only UI state (owns the theme), TanStack Query for server data, react-hook-form with zod for forms.
- Supabase for database, auth, storage and real-time. No separate Node.js service; server-side logic runs in Next.js server actions and route handlers.
- Payments through WiPay into YaadGuide's account; vendors are paid out manually. All prices in USD.

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
- All auth routes live under `/auth`. Vendor onboarding data is held in the browser until sign-up is confirmed, then added to the profile.
- Roles are `traveler`, `vendor`, `admin`. `admin` is assigned in the database only.
- One account (name, phone, email, government ID) can have up to three vendor profiles, one per category; unique on account plus category. Verification, listings, ratings and reviews are per vendor profile.
- Vendors may build drafts while unverified; listings go live only after admin approval of that vendor profile.
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
