# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **MOVE vendors**: independent Jamaican drivers who offer transfers and tours. They mostly use the dashboard on a phone, often between jobs, to answer booking requests inside a deadline, check what is coming up, and manage their listing and availability. (Confirmed: phone first.)
- **Admins**: YaadGuide staff. Their main job is working review queues: vendors waiting for approval, listings in review, flags on live listings, profile photo checks, place suggestions. (Confirmed: queues first.)
- **Travelers** use separate screens (browse, itinerary, checkout) that are out of scope here.

## Product Purpose

YaadGuide ("Your Digital Travel Agent") is a marketplace and itinerary planner for independent travelers in Jamaica, covering STAY, MOVE and VIBE. Local vendors list services; travelers build a trip and book. Success for the dashboards: a vendor never misses a request they wanted, and an admin clears the queue fast and with confidence.

## Positioning

A Jamaican, locally run marketplace where drivers and hosts are verified people, not anonymous listings. The route between places is how MOVE vendors think about their work.

## Operating Context

- MOVE requests expire. The response window is 24 hours, or half the time left before pickup if shorter, never under 1 hour. Deadlines are shown as countdowns.
- Vendors work one vehicle at a time (their current vehicle). Availability is a weekly schedule plus blocked dates; a pause switch hides the listing.
- A vendor's first listing is reviewed by an admin; later price and photo changes raise flags rather than blocking.
- Coverage is a list of named places (airports, towns, resort areas) with coordinates, not parishes.
- Prices are USD or JMD, set per listing.
- Development uses faker-seeded demo data on the local Docker Supabase stack.

## Capabilities and Constraints

- Next.js 16 (Cache Components), Tailwind v4, shadcn on Base UI, Supabase with row-level security.
- Vendor routes: `/vendor` (dashboard), `/vendor/requests`, `/vendor/listing`, `/vendor/calendar`, `/vendor/onboarding`. Admin routes: `/admin` (vendor review), `/admin/listings`, `/admin/places`.
- Dashboard map currently uses MapLibre with OpenFreeMap tiles behind one `DashboardMap` component.
- Earnings figures are demo data until payments exist.
- Tap targets are at least 44 px below the `md` breakpoint.

## Brand Commitments

Brand colors are fixed by the founder and recorded in DESIGN.md (primary green `#0A7A49`, primary dark `#042E1C`, primary light `#B7E1CE`, secondary yellow `#FAC422`, secondary dark `#443C08`, secondary light `#F1E48D`, plus the semantic and dark-mode tokens). For this redesign the founder asked to use only those colors and set aside the other design rules in DESIGN.md.

## Evidence on Hand

Seeded demo data (vendors, requests, listings) in the local stack. No real customer data, testimonials or metrics exist yet; none may be invented.

## Product Principles

- Time-sensitive work comes first: whatever expires leads the screen.
- One clear next action per screen; secondary tools stay reachable but quiet.
- Admin speed: decisions in as few taps as possible, with enough evidence on the row to decide.
- Navigation is predictable on every screen and works one-handed on a phone.
- Every number on a dashboard is either real or clearly labelled demo.
