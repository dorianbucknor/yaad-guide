# YaadGuide

Your Digital Travel Agent for Jamaica. YaadGuide is a multi-sided marketplace and itinerary planner for Free Independent Travelers. Travelers build itineraries across **MOVE** (transport), **STAY** (lodging) and **VIBE** (experiences and dining) and book them. Local vendors list services through a dashboard. Vendors price in USD or JMD; fixed YaadGuide amounts are in USD.

Status: v1 web app in progress. The landing page and a `/plan` stub are built; booking, vendor dashboard and payments are not.

## Stack

Next.js 16 (App Router, Cache Components), React, TypeScript (strict), Tailwind CSS v4, shadcn/ui on Base UI, react-hook-form + zod 4, zustand 5, Vitest. Planned: Supabase, WiPay, Vercel.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Auth needs a Supabase project. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (never the service-role key in these). In the Supabase dashboard: turn on **Confirm email**, enable the Google provider, enable the Phone provider and add test phone numbers (real SMS needs a provider), and add `http://localhost:3000/**` to the redirect URLs. Migrations are in `supabase/migrations/` (profiles, audit log, avatars, the three vendor onboarding migrations, permissions, the two account settings migrations, the MOVE listing and request migrations, then the three VIBE migrations for vendor documents, listing tables and listing functions, the document-write fix, the three dining migrations, the distance-pricing switch, and the date-range closing function); apply them with `npx supabase db push` after review. `npx supabase test db` runs the SQL tests against a local stack (needs Docker).

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run images:landing` | Resize source images into `public/landing/` |
| `npm run seed:demo` | Fill the local Docker Supabase with faker demo MOVE vendors and requests (refuses non-local URLs). Sign in as `vendor1@example.test`, password `demo-password-1` |

## What exists today

- **Landing page** (`/`): hero with the plane on the V-shaped photo edge, quick-start planner (dates, travelers, vehicle, area, interests), a scroll-driven route section, vendor call to action, app coming soon, footer.
- **Trip draft**: the quick-start is validated with zod (`src/lib/schemas/quick-start.ts`) and saved in the browser under `yg-draft` (zustand `persist`).
- **`/plan`**: stub page that reads the saved draft.
- **Auth** (`/auth/*`): email/password and Google sign-in and sign-up, email confirmation, password reset, phone verification, and vendor sign-up (`/auth/vendor`). Roles are `traveler`, `vendor` and `admin`; `src/proxy.ts` guards `/settings`, `/plan/checkout`, `/vendor` and `/admin`.
- **Settings** (`/settings`): Personal info (name, phone, photo), Security (sign-in methods, change password, change email, sign out other devices, delete account) and Notifications (email and text switches per category; stored now, sent when each feature starts sending). `/profile` redirects to it.
- **Delete and restore**: deleting an account archives it and hides it at once; signing in within 7 days offers a restore (`/auth/restore`). A daily job (`/api/cron/purge-archived`, scheduled in `vercel.json`) then deletes it for good. It needs two server-only environment variables, never committed: `SUPABASE_SERVICE_ROLE_KEY` (the Supabase secret key; `SUPABASE_SECRET_KEY` also works) and `CRON_SECRET` (the job only runs for requests that send it as a bearer token).
- **Vendor onboarding** (`/vendor`): a MOVE vendor completes business details, vehicles and documents (with expiry dates) in steps that save as a draft, then submits for review. Documents are stored privately and viewed by admins only. Vehicles can change owner through a transfer that the new owner requests, the current owner agrees to, and an admin approves.
- **MOVE listing and dashboard** (`/vendor`, `/vendor/listing`, `/vendor/calendar`, `/vendor/requests`): an approved MOVE vendor builds one listing (prices in USD or JMD, places served, weekly hours, photos, luggage space), blocks dates on a calendar, and works from a dashboard with a map, a requests inbox with Accept and Decline, response performance and earnings. Booking does not exist yet, so requests come from `npm run seed:demo` (local Docker stack only). A second cron route, `/api/cron/expire-move-requests` (every 10 minutes, same `CRON_SECRET`), expires overdue requests. Vehicle photos use the public `listing-photos` bucket.
- **Admin review** (`/admin/vendors`, `/admin/listings`, `/admin/places`): a queue of submitted profiles, a document viewer, approve or reject with a reason, and transfer approval. `admin` is granted in the database only.
- Light and dark themes.

## Project layout

```
src/app/                 routes (/, /plan, /auth/*, /vendor/*, /admin/*)
src/components/landing/  landing sections
src/components/plan/     plan page pieces
src/components/ui/       shadcn/ui components (add via the shadcn CLI)
src/lib/                 schemas, route geometry, formatting
src/stores/              zustand draft store
src/hooks/               scroll progress, media query, client-only helpers
scripts/                 image preparation, place route generator, demo seed
```

## Notes for contributors

- Cache Components is on. Anything reading dates or `localStorage` must render client-only (see `useIsClient`), or the production build fails.
- Do not expose vendor contact details before a booking is confirmed. Fees and commissions come from configuration, never hard-coded.
- Never commit secrets (Supabase service-role key, WiPay keys, Google API keys).
- Commit, branch and PR rules are in the `conventions` skill (`.claude/skills/conventions`).

## Docs

- [`PRD.md`](PRD.md) product scope
- [`ARCHITECTURE-ESSENTIAL.md`](ARCHITECTURE-ESSENTIAL.md) architecture digest, and [`ARCHITECTURE.md`](ARCHITECTURE.md) in full
- [`DESIGN.md`](DESIGN.md) design system and open design decisions
- [`AGENTS.md`](AGENTS.md) instructions for AI coding agents
