# Landing page: design

Date: 2026-11-05. Status: awaiting founder review. Scope: the landing page only. The guest itinerary builder and the pre-checkout estimate page are separate cycles.

## Purpose

The home page for Free Independent Travelers. It gets visitors into "Plan my trip" through a quick-start, and explains the three pillars: STAY, MOVE and VIBE (dining is a VIBE subtype). Success: a visitor can fill the quick-start, land on a stub `/plan` page that shows what they entered, and have the draft survive a reload.

## Decisions already made

- A signed-out visitor who completes the quick-start goes to the itinerary builder as a guest. The draft is kept in the browser. A pre-checkout page with an estimated price range comes before any sign-in. This cycle ends at a stub `/plan` page.
- v1 scope only. No flights, cruise tickets, car rental or all-inclusive packages. English only, so no language selector.
- Scroll-driven cab built with a small scroll hook and SVG path math (approach B). A 3D scene with Three.js is a v3 upgrade and is recorded in `PRD.md`.
- The hero button is "Learn more" and anchors to the route section. The quick-start itself is the main action.
- Brand: palette and tokens from `DESIGN.md` and `globals.css`; Bricolage Grotesque for headings and Figtree for body.

## Page structure

1. **Header:** logo, Move, Stay, Vibe, Become a vendor (links to `/auth/vendor`), theme toggle, Sign in (links to `/auth/sign-in`). Move, Stay and Vibe anchor to the route section stops. On mobile it collapses into a menu sheet.
2. **Hero:** full-bleed beach photo, headline "From Vision to Voyage", sub-line "Design your vacation to enjoy Jamaica, how you desire.", a "Learn more" button, the plane intro, and the quick-start straddling the hero's lower edge.
3. **The route:** MOVE, STAY and VIBE along one winding SVG line, with the scroll-driven cab.
4. **Become a vendor:** a short pitch and a button.
5. **Download the app:** a "coming soon" block on the dark green background. No store buttons.
6. **Footer:** Tel +1 876 285-9013, info@yaad-guide.com, Papine, Kingston, Jamaica, plus the Figma link groups (About, Features, Pricing, Gallery, Team, Privacy Policy, Terms of Use, Sales and Refunds, Legal, Site Map). All of these links are empty (`href="#"`) for now; no newsletter box.

## Files

- `src/app/page.tsx`: server component that composes the sections (replaces the starter page).
- `src/components/landing/`: `site-header`, `logo`, `hero`, `quick-start`, `route-section`, `route-line`, `cab`, `vendor-cta`, `app-coming-soon`, `site-footer`.
- `src/hooks/use-scroll-progress.ts`: returns scroll progress (0 to 1) through an element.
- `src/lib/route.ts`: samples position and tangent angle along the route path.
- `src/lib/schemas/quick-start.ts`: the zod schema, the single definition of the draft.
- `src/stores/draft-store.ts`: zustand store persisted to `localStorage` under `yg-draft`.
- `src/app/plan/page.tsx`: stub hand-off page that reads the draft and displays it.
- `src/app/auth/sign-in/page.tsx` and `src/app/auth/vendor/page.tsx`: placeholder pages so the header links resolve. Their real content is the auth and vendor onboarding cycle (below). All auth routes live under `/auth`.
- `public/landing/`: optimized copies of the images, loaded with `next/image`.

Boundaries: the quick-start only writes the draft; `/plan` only reads it. The scroll hook knows nothing about the cab, and the route geometry knows nothing about scrolling.

## Quick-start

Four cards on desktop, a step-by-step flow with Back, Next and a progress indicator on mobile. A card counts once the visitor touches it, and then its fields are required. At least one of the first three must be used.

1. **Getting around (MOVE):** Taxi or Personal driver, passengers, vehicle (Sedan, SUV, Minivan, Station Wagon/Hatchback, Bus, Coach), pickup date and pickup time.
2. **Where you'll stay (STAY):** Hotel or Villa, area, rooms, adults, children, and a check-in and check-out date range.
3. **Things to do (VIBE):** interest chips, no dates. River, Beach, ATV, Jerk Chicken, Gardens, Rafting, Cuisine, Parties, Camping, Zipline, Horseback Riding, Snorkeling, Nature and Wildlife, Historical Sites, Boat Rides, Natural Pools, KFC.
4. **Your trip:** a summary of what was chosen, and the "Create itinerary" button.

The area list is the most recognized place in each of Jamaica's 14 parishes (label shows the place, with the parish in brackets where it differs): Kingston, Half Way Tree (St. Andrew), Morant Bay (St. Thomas), Port Antonio (Portland), Port Maria (St. Mary), Ocho Rios (St. Ann), Falmouth (Trelawny), Montego Bay (St. James), Lucea (Hanover), Negril (Westmoreland), Treasure Beach (St. Elizabeth), Mandeville (Manchester), May Pen (Clarendon), Spanish Town (St. Catherine).

Draft shape (zod):

- `move?`: `kind` (`taxi` or `driver`), `passengers`, `vehicle`, `pickupDate`, `pickupTime`.
- `stay?`: `type` (`hotel` or `villa`), `area`, `rooms`, `adults`, `children`, `checkIn`, `checkOut`.
- `interests`: array of chip ids.

Rules: at least one of `move`, `stay` or `interests`. Check-out is after check-in. Dates are not in the past. Defaults: 2 passengers, 1 room, 2 adults, 0 children. The form uses react-hook-form with the zod schema, shadcn `field`, and the shadcn calendar (client-only, see below). Errors appear next to the field and are announced to screen readers. On submit the draft is saved and the visitor goes to `/plan`.

The trip's start date, used later for the planning fee refund rule, is the earliest date in the draft.

## Hero and motion

- **Photo:** `beach-water.jpg` (2560 by 1708) via `next/image` with priority, and a dark-green scrim so the white headline is readable (check contrast).
- **Plane intro (CSS only):** `plane.png` sits behind the headline in the stacking order. It starts small, faded out and offset to the upper right, and flies to a resting spot partly tucked behind the text over about 1.6 seconds. The quick-start then fades in. The keyframes fill forwards, so without animation everything is simply visible.
- **Reduced motion:** no plane flight and no scrolling cab. The plane is at rest, the quick-start is visible, and the cab sits at the end of the route.

## The route and the cab

- A tall section with one inline SVG route. MOVE sits top left, STAY on the right and VIBE bottom left. Not pinned; the cab travels with the page scroll.
- Cab position comes from scroll progress through the section. The point and tangent come from `getPointAtLength`, sampled once into a table. The tilt is limited to about 25 degrees and the image is mirrored when the road heads left, because a flat 3/4-view picture looks wrong rotated further.
- The cab's transform is written straight to the element in an animation frame, with no React re-render while scrolling. Updates run only while the section is on screen (IntersectionObserver).
- Track: dashed in the light brand color. The stretch already driven: solid in `primary`. Both use theme tokens.
- Isometric images fade in as the cab reaches each stop. All text is always visible.
- Mobile: a narrower, single-column route and a smaller cab.
- The route and the cab are decorative: `aria-hidden`, empty alt text.
- MOVE copy promises only v1: airport transfers and personal drivers. MOVE shows the cab, the coach and the small plane. STAY shows the hotel. VIBE shows the beach scene.

## Assets

Source folder: `C:\Users\buckn\Downloads\YG support images`.

- Used on the landing page: `beach-water.jpg` (hero), `plane.png` (hero), `cab.png`, `coach.png`, `small-plane.png`, `hotel.png`, `beach.png`, `yg-logo.svg`.
- Not used on the landing page, reserved as vendor-page placeholders: `room.png`, `waterpark.png`, `store.png`, `airport.png`, `cruise.png`, `cab 2.png`.
- The logo becomes an inline SVG component. Its green fill uses the `primary` token (`#0A7A49` light, `#4CC38A` dark); the yellow stays `#FAC422`.
- Large PNGs (for example `beach.png` at 2383 by 3021) are resized when copied into `public/landing/`.

## Theming, accessibility, performance

- Works in light and dark mode. The scrim, track, logo and images are checked in both.
- Every button and control is 44px tall below `md` (already built into the shared components).
- Visible focus, a skip link to the main content, headings in order, and the quick-start fully usable with the keyboard.
- Calendar components render on the client only (`useIsClient`), or the production build fails under Cache Components.
- Hero image prioritized, other images lazy, and dimensions set to avoid layout shift. A production build, not only the dev server, must pass.

## Testing and error handling

- **Unit tests (Vitest; to be added):** the zod schema (valid and invalid drafts, date rules), the draft store (save, load, clear, corrupt `localStorage`), the route math (progress maps to points in order, angle clamped, mirroring).
- **Browser checks:** the plane intro, the quick-start flow on desktop and a 390px viewport, the scrolling cab, dark mode, and reduced motion.
- **Errors:** invalid quick-start input shows field errors and does not navigate. If `localStorage` is unavailable or holds a corrupt draft, the store starts empty and `/plan` shows "No trip started yet" with a link home. If the scroll hook or the SVG measurement fails, the cab stays at rest and the page remains usable.
- `package.json` needs `typecheck` and `test` scripts (the stop hook expects them).

## Out of scope

The itinerary builder, the estimate page, authentication, real listing data, the 3D scene, a language selector, a newsletter signup, and any store badges for the app. The content of the `/auth` pages is a separate cycle (next section).

## Next cycle: auth and vendor onboarding (decided, not built here)

- All auth routes live under `/auth`: `/auth/sign-in`, `/auth/sign-up`, `/auth/vendor` and the confirmation callback.
- One person has one account and up to three vendor profiles, one per category (see `PRD.md`). The onboarding form therefore has two parts: account details (name, phone, email, government ID), asked once, and profile details for the chosen category. A returning vendor adding a category later sees only the profile part.
- "Become a vendor" opens a form at `/auth/vendor` that collects the vendor information needed for the chosen vendor type (STAY, MOVE or VIBE). The form data is held in the browser while the visitor moves on to sign-up with email or Google. Nothing is written to the database until sign-up is confirmed; after confirmation the held data is added to the vendor's profile and the browser copy is cleared.
- After the form and sign-up, the vendor is redirected to `/auth/sign-in`. The held data expires after 24 hours.
- Verification documents are uploaded to Supabase Storage in a per-vendor folder. Uploads need a signed-in user, so files are held in the browser (IndexedDB, not `localStorage`) until the first sign-in, then uploaded.
- Decided for the form: MOVE requires both an insurance certificate and a fitness certificate. STAY and VIBE profiles include a map where the vendor pins the exact location (stored as a geopoint). The vehicle types match the quick-start list (Sedan, SUV, Minivan, Station Wagon/Hatchback, Bus, Coach). The map is Google Maps, used only in the vendor's pin picker; listings show no map. The pin belongs to the listing, not the profile. Travelers see only the area name until a booking is confirmed; after confirmation a button opens the device's map app at the exact location.
- To settle in that cycle: the Google Maps Platform key (restricted by domain, kept in environment variables) and its billing, the fields per vendor type, and what a vendor sees if they sign in on a device that has no held data (proposal: the form is shown again, empty, before the dashboard).

## Open items

- Hero scrim strength and the exact plane resting position, to tune by eye.
- The `cruise.png` edge shading, if it is ever used.
