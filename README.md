# YaadGuide

Your Digital Travel Agent for Jamaica. YaadGuide is a multi-sided marketplace and itinerary planner for Free Independent Travelers. Travelers build itineraries across **MOVE** (transport), **STAY** (lodging) and **VIBE** (experiences and dining) and book them. Local vendors list services through a dashboard. All prices are in USD.

Status: v1 web app in progress. The landing page and a `/plan` stub are built; booking, vendor dashboard and payments are not.

## Stack

Next.js 16 (App Router, Cache Components), React, TypeScript (strict), Tailwind CSS v4, shadcn/ui on Base UI, react-hook-form + zod 4, zustand 5, Vitest. Planned: Supabase, WiPay, Vercel.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Auth needs a Supabase project. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (never the service-role key). In the Supabase dashboard: turn on **Confirm email**, enable the Google provider, enable the Phone provider and add test phone numbers (real SMS needs a provider), and add `http://localhost:3000/**` to the redirect URLs. Migrations are in `supabase/migrations/` (profiles, audit log, avatars, then the three vendor onboarding migrations); apply them with `npx supabase db push` after review. `npx supabase test db` runs the SQL tests against a local stack (needs Docker).

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run images:landing` | Resize source images into `public/landing/` |

## What exists today

- **Landing page** (`/`): hero with the plane on the V-shaped photo edge, quick-start planner (dates, travelers, vehicle, area, interests), a scroll-driven route section, vendor call to action, app coming soon, footer.
- **Trip draft**: the quick-start is validated with zod (`src/lib/schemas/quick-start.ts`) and saved in the browser under `yg-draft` (zustand `persist`).
- **`/plan`**: stub page that reads the saved draft.
- **Auth** (`/auth/*`): email/password and Google sign-in and sign-up, email confirmation, password reset, phone verification, and vendor sign-up (`/auth/vendor`). Roles are `traveler`, `vendor` and `admin`; `src/proxy.ts` guards `/profile`, `/plan/checkout`, `/vendor` and `/admin`.
- **`/profile`**: name, phone and profile photo.
- **Vendor onboarding** (`/vendor`): a MOVE vendor completes business details, vehicles and documents (with expiry dates) in steps that save as a draft, then submits for review. Documents are stored privately and viewed by admins only. Vehicles can change owner through a transfer that the new owner requests, the current owner agrees to, and an admin approves.
- **Admin review** (`/admin/vendors`): a queue of submitted profiles, a document viewer, approve or reject with a reason, and transfer approval. `admin` is granted in the database only.
- Light and dark themes.

## Project layout

```
src/app/                 routes (/, /plan, /auth/*, /vendor, /admin/vendors)
src/components/landing/  landing sections
src/components/plan/     plan page pieces
src/components/ui/       shadcn/ui components (add via the shadcn CLI)
src/lib/                 schemas, route geometry, formatting
src/stores/              zustand draft store
src/hooks/               scroll progress, media query, client-only helpers
scripts/                 image preparation
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
