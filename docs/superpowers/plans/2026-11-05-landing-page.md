# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the starter page with the YaadGuide landing page: header, hero with plane intro, a quick-start that saves a guest draft and hands off to a stub `/plan` page, the scroll-driven MOVE/STAY/VIBE route with a cab, vendor CTA, app "coming soon" block and footer.

**Architecture:** `src/app/page.tsx` is a server component composing client islands in `src/components/landing/`. One zod schema defines the draft; a persisted zustand store holds it; `/plan` only reads it. Route geometry (`src/lib/route.ts`) and scroll progress (`src/hooks/use-scroll-progress.ts`) are independent; the route section wires them and writes the cab transform straight to the DOM (no React re-render while scrolling).

**Tech Stack:** Next.js 16 (App Router, Cache Components on), React 19, Tailwind v4, shadcn/ui (Base UI, `base-nova`), react-hook-form + zod 4, zustand 5, react-day-picker 10, Vitest (added in Task 1), sharp (dev, Task 6).

**Spec:** `docs/superpowers/specs/2026-11-05-landing-page-design.md`. Also read `DESIGN.md` and `ARCHITECTURE-ESSENTIAL.md`; before writing Next.js code read the relevant guide in `node_modules/next/dist/docs/` (this Next.js has breaking changes; `AGENTS.md`).

## Global Constraints

- TypeScript `strict`; server components by default; `"use client"` only where state, effects or browser APIs need it; imports from `src/` use `@/*`.
- shadcn/ui is the base. Do not hand-roll a control shadcn provides. Triggers take `render`, not `asChild`. Add new primitives with the shadcn CLI, not by hand.
- Forms: react-hook-form + the zod schema from `src/lib/schemas/quick-start.ts` (single definition of the draft).
- Anything that reads the current date (calendar, date pickers) renders on the client only via `useIsClient`; run `npm run build` after adding one (dev server will not show the failure).
- Buttons and controls are 44px tall below `md`; use the shared components, no overrides.
- Brand primary `#0A7A49`; never use it for text or borders on dark surfaces. Yellow `#FAC422` is never text/icon on light backgrounds. Use theme tokens (`primary`, `brand-*`, `sun-*`), not hex, except the logo's `#FAC422`.
- Fonts: Bricolage Grotesque (headings), Figtree (body), already wired in `layout.tsx`.
- Sentence case copy; no emoji (Lucide icons); no extra decorative devices beyond the route line.
- English only; v1 scope only (no flights, cruise, car rental, packages).
- Draft `localStorage` key: `yg-draft`. Footer links are `href="#"`; no newsletter box. Footer facts: Tel +1 876 285-9013, info@yaad-guide.com, Papine, Kingston, Jamaica.
- Respect `prefers-reduced-motion`: no plane flight, no scrolling cab (cab rests at route end), quick-start visible.
- Route and cab are decorative: `aria-hidden`, `alt=""`.
- Defaults: 2 passengers, 1 room, 2 adults, 0 children. Dates are `YYYY-MM-DD` strings.
- Repo has an initial commit only and many uncommitted files; commit just the files each task touches. Follow the `conventions` skill (`.claude/skills/conventions`): commits are `type(scope): subject` (imperative, lowercase, no period, 72 chars max), one logical change each; work happens on branch `feat/landing-page`, never on the default branch; no `any`, no enums, no unexplained `as` or `!`, explicit return types on exported functions, `kebab-case` file names.

## Review Focus

Inputs the spec implies but its listed tests do not exercise; each has a test or browser check in the owning task.

1. Submit fails on a field in a step hidden on mobile: the user must land on the step with the error, not see a silent no-op (Task 9).
2. Number fields cleared, `0`, negative or decimal (passengers, rooms, adults, children): field error, no `NaN` reaches the draft (Task 2, Task 9).
3. Date range with only check-in picked, or check-out equal to or before check-in: error on check-out, no navigation (Task 2, Task 9).
4. A saved draft whose dates have since passed (reload the next day): `/plan` still shows it rather than "No trip started yet"; only a structurally invalid or corrupt draft is dropped (Task 3).
5. Viewport crosses the `md` breakpoint while on the page: route re-samples and the cab never gets `NaN` or jumps off the track (Task 10).

---

### Task 1: Test tooling and scripts

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts `typecheck`, `test`; devDependencies)

**Interfaces:**
- Produces: `npm run test` (Vitest, jsdom, `@` alias to `src/`, includes `src/**/*.test.ts`), `npm run typecheck` (`tsc --noEmit`).

- [ ] **Step 0:** Create and switch to branch `feat/landing-page` (`git switch -c feat/landing-page`); the existing uncommitted files come along. Commit only the files each task touches.
- [ ] **Step 1:** `npm i -D vitest jsdom`. Add scripts `"typecheck": "tsc --noEmit"` and `"test": "vitest run"`.
- [ ] **Step 2:** Create `vitest.config.ts` with `test.environment = "jsdom"`, `test.include = ["src/**/*.test.ts"]`, and `resolve.alias["@"] = path.resolve(__dirname, "src")`.
- [ ] **Step 3:** Create `src/lib/smoke.test.ts` asserting `1 + 1 === 2`; run `npm run test` (Expected: 1 passed), then delete the file. Run `npm run typecheck` (Expected: exits 0; if it fails on pre-existing files, record the errors in the commit message and do not fix them here).
- [ ] **Step 4:** Update the "Typecheck, test" line in `AGENTS.md` Commands to list the two scripts (replace the TODO(bootstrap)).
- [ ] **Step 5:** Commit `chore: add vitest, typecheck and test scripts`.

---

### Task 2: Quick-start schema

**Files:**
- Create: `src/lib/schemas/quick-start.ts`
- Test: `src/lib/schemas/quick-start.test.ts`

**Interfaces:**
- Produces (all exported from `quick-start.ts`):
  - `VEHICLES = ["sedan","suv","minivan","wagon","bus","coach"] as const`; `type Vehicle`; `VEHICLE_LABELS: Record<Vehicle,string>` ("Sedan","SUV","Minivan","Station Wagon/Hatchback","Bus","Coach").
  - `AREAS: readonly { id: string; place: string; parish: string }[]` — the 14 places in spec order, ids kebab-case of `place` (`half-way-tree`, `port-antonio`, …); `areaLabel(id: string): string` → `"Kingston"` when parish equals place, else `"Negril (Westmoreland)"` style.
  - `INTERESTS: readonly { id: string; label: string }[]` — the 17 chips in spec order; ids kebab-case (`jerk-chicken`, `horseback-riding`, `nature-wildlife`, `historical-sites`, `natural-pools`, `kfc`, …).
  - `quickStartShape` (zod object, structure only, no date or cross-field rules), `quickStartSchema` (shape + rules), `type QuickStartDraft = z.infer<typeof quickStartShape>`.
    - `move?: { kind: "taxi"|"driver"; passengers: int 1–50; vehicle: Vehicle; pickupDate: "YYYY-MM-DD"; pickupTime: "HH:mm" }`
    - `stay?: { type: "hotel"|"villa"; area: area id; rooms: int 1–20; adults: int 1–50; children: int 0–50; checkIn; checkOut }`
    - `interests: string[]` (ids from `INTERESTS`), default `[]`.
  - `todayISO(): string` (local date, `yyyy-MM-dd`); `tripStartDate(draft: QuickStartDraft): string | undefined` (earliest of `move.pickupDate`, `stay.checkIn`).
- Rules in `quickStartSchema`: at least one of `move`, `stay`, non-empty `interests` (issue path `[]`, message "Choose at least one of getting around, where you'll stay or things to do"); `stay.checkOut` after `stay.checkIn` (path `["stay","checkOut"]`, "Check-out must be after check-in"); `move.pickupDate` and `stay.checkIn` not before `todayISO()` (messages "Pick a date from today onwards").

- [ ] **Step 1: Write failing tests** in `quick-start.test.ts` (use `vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-05T12:00:00"))`):
  - `accepts a move-only draft`: `{ move: validMove, interests: [] }` → `quickStartSchema.safeParse(...).success === true`.
  - `rejects an empty draft`: `{ interests: [] }` → fails with an issue whose `path` is `[]`.
  - `rejects checkOut equal to checkIn` and `rejects checkOut before checkIn` → issue path `["stay","checkOut"]`.
  - `rejects a pickup date in the past` (`"2026-11-04"`) and `accepts today`.
  - `rejects passengers 0, -1, 2.5 and NaN` (Review Focus 2); same for `rooms`, `adults`; `children` accepts `0`, rejects `-1`.
  - `rejects an unknown interest id`, `rejects an unknown area id`, `rejects a malformed date ("5/11/2026")`.
  - `quickStartShape accepts past dates` (Review Focus 4: structure-only parse of `{ move: {…pickupDate:"2020-01-01"}, interests: [] }` succeeds).
  - `AREAS has 14 entries; areaLabel("kingston") === "Kingston"; areaLabel("negril") === "Negril (Westmoreland)"`; `INTERESTS has 17 entries`.
  - `tripStartDate returns the earliest of pickup and check-in`, and `undefined` for an interests-only draft.
- [ ] **Step 2:** Run `npx vitest run src/lib/schemas` — Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `src/lib/schemas/quick-start.ts` per the interface. Use `z.number().int().min().max()` (zod 4 rejects `NaN`); build the shape first, then `quickStartSchema = quickStartShape.superRefine(...)`; use `date-fns` `format` for `todayISO`.
- [ ] **Step 4:** Run `npx vitest run src/lib/schemas` — Expected: all PASS. Run `npm run typecheck`.
- [ ] **Step 5:** Commit `feat: add quick-start draft schema`.

---

### Task 3: Draft store

**Files:**
- Create: `src/stores/draft-store.ts`
- Test: `src/stores/draft-store.test.ts`

**Interfaces:**
- Consumes: `quickStartShape`, `QuickStartDraft` (Task 2).
- Produces:
  - `DRAFT_STORAGE_KEY = "yg-draft"`.
  - `useDraftStore` (zustand, `persist`, `skipHydration: true`, only `draft` persisted) with state `{ draft: QuickStartDraft | null; hydrated: boolean; setDraft(draft: QuickStartDraft): void; clear(): void }`.
  - `hydrateDraft(): Promise<void>` — calls `useDraftStore.persist.rehydrate()` then sets `hydrated: true` (also when storage is unavailable or the payload is corrupt).
- Behavior: the persisted payload is re-validated with `quickStartShape` (not `quickStartSchema`) on rehydrate; anything invalid, unparsable or unreadable yields `draft: null` without throwing. Storage access is wrapped in try/catch (`createJSONStorage` over a guarded `localStorage`).

- [ ] **Step 1: Write failing tests** (jsdom `localStorage`; reset store and storage in `beforeEach`):
  - `setDraft persists under yg-draft`: after `setDraft(d)`, `JSON.parse(localStorage.getItem("yg-draft")!).state.draft` deep-equals `d`.
  - `hydrateDraft restores a saved draft` (write storage, call `hydrateDraft()`, expect `draft` equal and `hydrated === true`).
  - `clear removes the draft` (state and persisted value).
  - `corrupt JSON starts empty`: storage holds `"{not json"` → after `hydrateDraft()`, `draft === null`, `hydrated === true`, no throw.
  - `structurally invalid draft is dropped`: storage holds a draft with `interests: "beach"` → `draft === null`.
  - `saved draft with now-past dates still loads` (Review Focus 4): fake time 2026-12-01, stored `move.pickupDate: "2026-11-05"` → `draft` not null.
  - `unavailable storage does not throw`: stub `Storage.prototype.getItem` to throw → `hydrateDraft()` resolves, `draft === null`, `hydrated === true`.
- [ ] **Step 2:** Run `npx vitest run src/stores` — Expected: FAIL.
- [ ] **Step 3:** Implement `draft-store.ts`. Use the `merge` option of `persist` to run `quickStartShape.safeParse` on the persisted `draft`, falling back to the current state; follow the structure of `src/stores/theme-store.ts`.
- [ ] **Step 4:** Run `npx vitest run src/stores` — Expected: PASS. Run `npm run typecheck`.
- [ ] **Step 5:** Commit `feat: add persisted draft store`.

---

### Task 4: Route geometry

**Files:**
- Create: `src/lib/route.ts`
- Test: `src/lib/route.test.ts`

**Interfaces:**
- Produces:
  - `type RoutePoint = { x: number; y: number }`; `type RouteTable = { samples: { x: number; y: number; length: number }[]; total: number }`.
  - `sampleRoute(pointAt: (length: number) => RoutePoint, total: number, steps?: number): RouteTable` — `steps` defaults to 240; samples at `i * total / steps` for `i = 0..steps`. Pure; the caller passes `path.getPointAtLength.bind(path)`.
  - `type CabPose = { x: number; y: number; angle: number; flip: boolean; length: number }`; `MAX_TILT_DEG = 25`; `poseAt(table: RouteTable, progress: number): CabPose` — progress clamped to 0–1, linear interpolation between samples; `flip` is true when the local direction heads left (dx < 0); `angle` is `atan2(dy, |dx|)` in degrees clamped to ±`MAX_TILT_DEG`; a zero-length table (`total === 0`) returns the first sample with `angle 0`, `flip false`.
  - `type RouteDef = { d: string; width: number; height: number }`; `ROUTES: { wide: RouteDef; narrow: RouteDef }` (wide viewBox 1200×1500, narrow 400×1800; path winds MOVE top-left → STAY right → VIBE bottom-left; start with simple cubic Béziers and tune by eye in Task 10); `ROUTE_STOPS: { move: number; stay: number; vibe: number }` (initial `0.06, 0.5, 0.94`; tuned in Task 10).

- [ ] **Step 1: Write failing tests** using fake `pointAt`s:
  - `samples a straight line evenly`: `pointAt = (l) => ({x: l, y: 0})`, total 100, steps 10 → 11 samples, `samples[10].x === 100`.
  - `poseAt clamps progress`: `-1` → first sample, `2` → last.
  - `poseAt midpoint of a rightward line` → `x ≈ 50`, `angle 0`, `flip false`.
  - `poseAt leftward line flips`: `pointAt = (l) => ({x: 100 - l, y: 0})` → `flip true`, `angle 0`.
  - `tilt is clamped`: line with dx=1, dy=10 per unit → `Math.abs(angle) === MAX_TILT_DEG`; leftward steep line likewise.
  - `lengths are non-decreasing as progress increases` over 20 progress values.
  - `zero-length table does not produce NaN`.
  - `ROUTE_STOPS are increasing and within 0–1`; `ROUTES.wide.d` and `.narrow.d` are non-empty.
- [ ] **Step 2:** Run `npx vitest run src/lib/route` — Expected: FAIL.
- [ ] **Step 3:** Implement `route.ts` per the interface.
- [ ] **Step 4:** Run `npx vitest run src/lib/route` — Expected: PASS. Run `npm run typecheck`.
- [ ] **Step 5:** Commit `feat: add route geometry helpers`.

---

### Task 5: Scroll and client hooks

**Files:**
- Create: `src/hooks/use-scroll-progress.ts`, `src/hooks/use-is-client.ts`, `src/hooks/use-media-query.ts`
- Modify: `src/app/design/controls-demo.tsx` (import the shared `useIsClient` instead of its local copy)
- Test: `src/hooks/use-scroll-progress.test.ts`

**Interfaces:**
- Produces:
  - `progressThrough(top: number, height: number, viewportHeight: number): number` — `clamp((0.75 * viewportHeight - top) / max(1, height - 0.25 * viewportHeight), 0, 1)`; 0 when the section top is at 75% of the viewport height, 1 when its bottom reaches the viewport bottom. Returns `0` for non-finite inputs.
  - `useScrollProgress(ref: RefObject<HTMLElement | null>, onProgress: (progress: number) => void): void` — no state, no re-render. Under `prefers-reduced-motion: reduce` it calls `onProgress(1)` once and subscribes to nothing. Otherwise it calls `onProgress` once on mount, then on scroll and resize via `requestAnimationFrame`, only while an `IntersectionObserver` reports the element on screen (plus once more when it leaves, so the end state is exact). Everything in try/catch; on failure it calls `onProgress(0)` once and stops.
  - `useIsClient(): boolean` (`useSyncExternalStore`, same pattern as the current demo).
  - `useMediaQuery(query: string): boolean` (`useSyncExternalStore` over `matchMedia`; server snapshot `false`).

- [ ] **Step 1: Write failing tests** for `progressThrough` only (vh = 800): `top=600` → `0`; `top = -(height - 800)` (bottom at viewport bottom) → `1`; midpoint between them → `≈ 0.5`; `top` far above → `1`; far below → `0`; `height = 0` and `NaN` inputs → finite number in 0–1.
- [ ] **Step 2:** Run `npx vitest run src/hooks` — Expected: FAIL.
- [ ] **Step 3:** Implement the three hooks. Verify with `npm run typecheck` and `npm run lint` that `controls-demo.tsx` still compiles.
- [ ] **Step 4:** Run `npx vitest run src/hooks` — Expected: PASS.
- [ ] **Step 5:** Commit `feat: add scroll progress, client and media query hooks`.

---

### Task 6: Image assets and logo

**Files:**
- Create: `scripts/prepare-landing-images.mjs`, `public/landing/*` (generated), `src/components/landing/logo.tsx`
- Modify: `package.json` (devDependency `sharp`, script `images:landing`)

**Interfaces:**
- Produces: `public/landing/beach-water.jpg` (hero, max width 2560, JPEG quality 80), and `plane.webp`, `cab.webp`, `coach.webp`, `small-plane.webp`, `hotel.webp`, `beach.webp` (alpha kept, max width 1200, quality 82, never upscaled). `Logo({ className }: { className?: string })` — inline SVG, `role="img"`, `aria-label="YaadGuide"`.

- [ ] **Step 1:** `npm i -D sharp`. Write the script: first CLI argument is the source folder (default `C:\Users\buckn\Downloads\YG support images`); it processes only the files listed above, creates `public/landing/`, prints each output with its size, and exits non-zero if a source is missing. Add `"images:landing": "node scripts/prepare-landing-images.mjs"`.
- [ ] **Step 2:** Run `npm run images:landing`. Expected: seven files written; every file under 400 KB except `beach-water.jpg` (under 800 KB). Record the output dimensions of each; Tasks 7 and 10 need the real `width`/`height` for `next/image`.
- [ ] **Step 3:** Create `logo.tsx` from `yg-logo.svg` (same folder): keep the `viewBox`, drop the fixed `width`/`height`, replace every non-yellow fill with `className="fill-primary"`, keep `#FAC422` for yellow, give the clip-path id a unique name.
- [ ] **Step 4:** Check the logo on a throwaway route or the `/design` page in light and dark mode (green is `#0A7A49` light, `#4CC38A` dark). Remove the throwaway.
- [ ] **Step 5:** Commit `feat: add landing images and logo`.

---

### Task 7: Header, placeholder auth pages, shell

**Files:**
- Create: `src/components/landing/site-header.tsx`, `src/components/theme-toggle.tsx`, `src/app/auth/sign-in/page.tsx`, `src/app/auth/vendor/page.tsx`
- Leave `src/app/design/theme-toggle.tsx` (the three-button design-page control) unchanged.

**Interfaces:**
- Produces: `SiteHeader()` (client); `ThemeToggle()` in `src/components/theme-toggle.tsx` — a single icon `Button` with an accessible name that cycles light → dark → system through `useThemeStore` (`aria-label` states the current choice, e.g. "Theme: system. Switch to light"). Anchor ids the header links to: `#move`, `#stay`, `#vibe` (set in Task 10), `#route` (Task 10), skip link target `#main` (Task 12).
- Header: `Logo` (links to `/`), nav Move, Stay, Vibe (anchors), "Become a vendor" (`/auth/vendor`), `ThemeToggle`, "Sign in" (`/auth/sign-in`). A visible-on-focus skip link "Skip to main content" is the first focusable element. Below `md`, nav collapses into a `Sheet` opened by a menu button ("Open menu"); links in the sheet close it on click.
- Placeholder pages: server components, `metadata.title`, an `h1` ("Sign in" / "Become a vendor"), one sentence ("This page is coming soon."), and a link home.

- [ ] **Step 1:** Create `ThemeToggle`, `SiteHeader` and the two placeholder pages per the interface.
- [ ] **Step 2:** Temporarily render `<SiteHeader />` from `src/app/page.tsx`; run `npm run dev` and check at 1280px and 390px: links resolve (`/auth/sign-in`, `/auth/vendor` return the placeholders), the sheet opens/closes, Tab reaches the skip link first, the theme button cycles. Revert the temporary change.
- [ ] **Step 3:** Run `npm run lint` and `npm run typecheck`.
- [ ] **Step 4:** Commit `feat: add site header and auth placeholder pages`.

---

### Task 8: Hero and plane intro

**Files:**
- Create: `src/components/landing/hero.tsx`
- Modify: `src/app/globals.css` (keyframes and animation tokens)

**Interfaces:**
- Consumes: `/landing/beach-water.jpg`, `/landing/plane.webp` and their dimensions (Task 6); `<QuickStart />` from Task 9 passed as `children` so the hero stays decoupled: `Hero({ children }: { children: React.ReactNode })`.
- Produces: `Hero` (server component). `<section aria-labelledby>` with `h1` "From Vision to Voyage", sub-line "Design your vacation to enjoy Jamaica, how you desire.", a "Learn more" `Button` linking to `#route`, the beach photo (`next/image`, `fill`, `priority`, `sizes="100vw"`, `alt=""`), a dark-green scrim (`brand-dark` at about 50–60% opacity, tuned in Step 3), the plane behind the headline in stacking order, and `children` positioned to straddle the hero's lower edge (negative bottom margin; the following section has matching top padding so nothing overlaps).
- CSS: `@keyframes plane-fly` (from: small, opacity 0, offset to upper right; to: resting spot partly tucked behind the headline), animation `plane-fly 1.6s ease-out both`; `@keyframes quick-start-in` (opacity 0 → 1) `0.5s ease-out 1.4s both`; both disabled under `motion-reduce`, with the resting styles as the base state so no-animation shows everything.

- [ ] **Step 1:** Add the keyframes and Tailwind animation tokens to `globals.css`; build `Hero` per the interface.
- [ ] **Step 2:** Render `<Hero>` with a placeholder child from a temporary `page.tsx` and check in the browser: the plane flies in over ~1.6s then the child fades in; with DevTools "Emulate prefers-reduced-motion: reduce" the plane is at rest and the child visible immediately. Revert the temporary change.
- [ ] **Step 3:** Measure contrast of the white headline and sub-line against the scrim over the lightest part of the photo (target 4.5:1 for the sub-line, 3:1 for the large headline) in light and dark mode; adjust scrim opacity until both pass. Note the final value in a code comment.
- [ ] **Step 4:** Run `npm run lint` and `npm run typecheck`. Commit `feat: add hero with plane intro`.

---

### Task 9: Quick-start

**Files:**
- Create: `src/components/landing/quick-start.tsx`, `src/components/landing/quick-start-cards.tsx`, `src/components/landing/date-fields.tsx`
- Add primitives only if missing: none expected (`field`, `select`, `toggle-group`, `calendar`, `popover`, `input`, `button`, `progress`, `card` are installed).

**Interfaces:**
- Consumes: `quickStartSchema`, `QuickStartDraft`, `VEHICLES`, `VEHICLE_LABELS`, `AREAS`, `areaLabel`, `INTERESTS` (Task 2); `useDraftStore().setDraft` (Task 3); `useIsClient` (Task 5).
- Produces:
  - `QuickStart()` (client): react-hook-form with `zodResolver(quickStartSchema)`, form values typed `DeepPartial<QuickStartDraft>`, `shouldFocusError: true`. On valid submit: `setDraft(parsed)`, then `router.push("/plan")`; the submit button is disabled while submitting.
  - `MoveCard`, `StayCard`, `VibeCard`, `TripCard` in `quick-start-cards.tsx`, each taking the RHF `control`/`form` plus `onTouch: () => void`.
  - `DateField` and `DateRangeField` in `date-fields.tsx`: Popover + `Calendar` (`mode="single"` / `mode="range"`), values as `YYYY-MM-DD` strings, rendered only when `useIsClient()` is true with a reserved-height placeholder of the same size (no layout shift); past days disabled.
- Behavior:
  - A card is "touched" on first focus or change inside it (`onFocusCapture`); touching sets its default object (`move: { passengers: 2 }`, `stay: { rooms: 1, adults: 2, children: 0 }`); untouched cards stay `undefined` and are not validated. Required fields then show errors via `Field` / `FieldError` (announced, `role="alert"`), each with a visible label.
  - Fields: MOVE — Taxi/Personal driver (`toggle-group` single), passengers (number `Input`), vehicle (`Select`), pickup date, pickup time (`Input type="time"`). STAY — Hotel/Villa, area (`Select` with `areaLabel`), rooms/adults/children (number `Input`), check-in/check-out via `DateRangeField`. VIBE — `ToggleGroup` in multiple mode with one chip per `INTERESTS` entry (check `src/components/ui/toggle-group.tsx` for the Base UI multiple-selection prop), no dates. TRIP — summary of chosen values, the root-level "at least one" error (`role="alert"`), and the "Create itinerary" button.
  - Number inputs: an emptied field is stored as `undefined`, never `NaN`.
  - Layout: four cards in a grid from `md` up; below `md` one card at a time with Back, Next and a `Progress` indicator ("Step 2 of 4"). Same DOM for both (inactive steps use `hidden md:block`) so values survive step changes. Next validates only the current card (`trigger("move" | "stay" | "interests")`); an untouched card can be skipped.
  - On a failed submit below `md`, the step jumps to the first step containing an error and focuses its first invalid field (Review Focus 1).
- **Pure helper tested here:** `firstInvalidStep(errors: FieldErrors<QuickStartDraft>): 0 | 1 | 2 | 3` exported from `quick-start.tsx`'s sibling `src/lib/quick-start-steps.ts`; `move` → 0, `stay` → 1, `interests` → 2, root → 3.

- [ ] **Step 1: Write failing test** `src/lib/quick-start-steps.test.ts`: `firstInvalidStep({ stay: {...} }) === 1`; `{ move: {...}, stay: {...} } === 0`; `{ root: {...} } === 3`; `{ interests: {...} } === 2`; `{}` → `3`.
- [ ] **Step 2:** Run `npx vitest run src/lib/quick-start-steps` — Expected: FAIL. Implement `src/lib/quick-start-steps.ts`; run again — Expected: PASS.
- [ ] **Step 3:** Build `date-fields.tsx`, `quick-start-cards.tsx` and `quick-start.tsx` per the interface.
- [ ] **Step 4:** Temporarily render `<QuickStart />` from `page.tsx` and run the browser checks at 1280px and 390px:
  - Empty submit → root error, no navigation.
  - MOVE only, valid → lands on `/plan` (404 until Task 11 is fine) and `localStorage["yg-draft"]` holds the draft.
  - Passengers cleared, `0`, `-1`, `2.5` → field error each time, no navigation (Review Focus 2).
  - Check-in only, then check-out equal to check-in → check-out error (Review Focus 3).
  - Mobile: fill STAY wrongly, jump to step 4, submit → returns to the STAY step with the error focused (Review Focus 1).
  - Keyboard-only run of the whole flow; screen-reader labels present on every control; no horizontal scroll at 390px.
  Revert the temporary change.
- [ ] **Step 5:** Run `npm run build` (calendar prerender check), `npm run lint`, `npm run typecheck`. Commit `feat: add quick-start form`.

---

### Task 10: Route section and cab

**Files:**
- Create: `src/components/landing/route-section.tsx`, `route-line.tsx`, `cab.tsx`

**Interfaces:**
- Consumes: `ROUTES`, `ROUTE_STOPS`, `sampleRoute`, `poseAt`, `CabPose` (Task 4); `useScrollProgress`, `useMediaQuery` (Task 5); images from Task 6.
- Produces:
  - `RouteSection()` (client, `id="route"`): picks `ROUTES.wide` at `(min-width: 768px)` else `ROUTES.narrow`; on mount and whenever the route changes, measures the path (`getTotalLength`, `getPointAtLength`) once into a `RouteTable`; passes progress to the cab and the driven stretch via `useScrollProgress` with no React state updates.
  - `RouteLine({ route, pathRef, drivenRef }: …)`: `aria-hidden` SVG with `viewBox` from the `RouteDef`; a dashed track in a light brand token and a solid overlay (`stroke-primary`) whose `stroke-dasharray`/`dashoffset` the section updates directly.
  - `Cab({ ref })`: absolutely positioned wrapper holding the `cab.webp` image (`alt=""`, `aria-hidden`); the section sets `left`/`top` as percentages of the viewBox and `transform: translate(-50%,-50%) rotate(angle) scaleX(flip ? -1 : 1)` in a `requestAnimationFrame`-driven callback. Cab is smaller below `md`.
  - Stops: three text blocks with ids `move`, `stay`, `vibe` (MOVE top-left, STAY right, VIBE bottom-left; single column on mobile). Text is always visible; each stop's isometric image(s) fade in once `progress >= ROUTE_STOPS[key]` (class toggle written directly to the element, no state). MOVE copy promises only airport transfers and personal drivers, with `cab`, `coach`, `small-plane` images; STAY shows `hotel`; VIBE shows `beach`. Headings are real `h2`s in order; pillar names are the only uppercase text.
- Failure/edge behavior: if measuring throws or `getTotalLength()` is 0 or non-finite, the cab stays at the start pose and the section renders normally. When the route changes (breakpoint crossing) the table is rebuilt and the current progress re-applied immediately; non-finite poses are never written (Review Focus 5). Under reduced motion the cab sits at the end of the route and the driven stretch is complete.

- [ ] **Step 1:** Build the three components per the interface.
- [ ] **Step 2:** Tune `ROUTES.*.d` and `ROUTE_STOPS` in `src/lib/route.ts` by eye so the cab visits the three stops at the right scroll positions; re-run `npx vitest run src/lib/route` (Expected: PASS).
- [ ] **Step 3:** Browser checks at 1280px and 390px, light and dark: cab follows the road, tilt never exceeds ~25 degrees and the image mirrors when heading left; images fade in at stops; reduced motion → cab at end, all visible. Resize the window across 768px mid-scroll: the cab stays on the new track, no console errors (Review Focus 5). Confirm in the Performance panel that scrolling triggers no React renders of `RouteSection`.
- [ ] **Step 4:** Run `npm run lint`, `npm run typecheck`. Commit `feat: add scroll-driven route section`.

---

### Task 11: `/plan` stub page

**Files:**
- Create: `src/app/plan/page.tsx`, `src/components/plan/plan-draft.tsx`
- Test: none beyond the store tests (the page is a thin reader); verified in the browser.

**Interfaces:**
- Consumes: `useDraftStore`, `hydrateDraft` (Task 3); `areaLabel`, `VEHICLE_LABELS`, `INTERESTS`, `tripStartDate` (Task 2).
- Produces: `page.tsx` (server component, `metadata.title = "Your trip"`) rendering `<PlanDraft />` (client). `PlanDraft` calls `hydrateDraft()` in an effect; until `hydrated` it shows a `Skeleton` sized like the summary; then, with a draft, a read-only summary (MOVE, STAY, VIBE chips, and "Trip starts {date}" from `tripStartDate`, formatted with `date-fns`) and a "Back to home" link; with `draft === null`, the text "No trip started yet" and a link home. It never writes the draft.

- [ ] **Step 1:** Build the page and component.
- [ ] **Step 2:** Browser checks: fill the quick-start, land on `/plan`, see the entered values; reload — still shown; delete `yg-draft` in DevTools and reload — "No trip started yet"; set `yg-draft` to `{not json` and reload — same, no console error; edit the stored dates into the past and reload — the draft still shows (Review Focus 4).
- [ ] **Step 3:** Run `npm run build`, `npm run lint`, `npm run typecheck`. Commit `feat: add plan stub page`.

---

### Task 12: Remaining sections and page composition

**Files:**
- Create: `src/components/landing/vendor-cta.tsx`, `app-coming-soon.tsx`, `site-footer.tsx`
- Modify: `src/app/page.tsx` (replace the starter), `src/app/layout.tsx` (metadata title/description only: "YaadGuide — Your Digital Travel Agent" style, keep existing fonts and providers)
- Delete: unused starter assets in `public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) once nothing references them.

**Interfaces:**
- Produces: `VendorCta()` (server): short pitch plus a `Button` linking to `/auth/vendor` ("Become a vendor"). `AppComingSoon()` (server): block on the `brand-dark` background with "Download the app" and "Coming soon" copy; no store buttons. `SiteFooter()` (server): contact details and the ten link groups (About, Features, Pricing, Gallery, Team, Privacy Policy, Terms of Use, Sales and Refunds, Legal, Site Map), all `href="#"`; no newsletter box.
- `page.tsx` order: `SiteHeader`, `<main id="main">` containing `Hero` (with `QuickStart` as its child), `RouteSection`, `VendorCta`, `AppComingSoon`, then `SiteFooter`. Section padding 64px mobile / 128px desktop; max content width 1200px.

- [ ] **Step 1:** Build the three components and compose `page.tsx`; remove the starter assets.
- [ ] **Step 2:** Run `npm run lint`, `npm run typecheck`, `npm run test` (all green).
- [ ] **Step 3:** Run `npm run build` — Expected: succeeds with no prerender errors; then `npm run start` and run the full browser pass below against the production server.
- [ ] **Step 4:** Browser pass (1440, 1024, 768, 390px; light and dark; reduced motion on and off): plane intro and quick-start fade; quick-start end to end on desktop and 390px; header anchors scroll to the stops; skip link works; headings in order; visible focus everywhere; no horizontal scroll; no layout shift when the calendar mounts; all images lazy except the hero; console free of errors.
- [ ] **Step 5:** Update `DESIGN.md` Open items (hero scrim value, plane resting position, logo asset done) and the `Components` table notes only where they changed; update `AGENTS.md` Commands. Commit `feat: compose landing page`.

---

## Self-review

- **Spec coverage:** header (T7), hero + plane + reduced motion (T8), quick-start incl. draft shape, defaults, area list, chips, mobile stepper (T2, T9), route + cab + stops + failure behavior (T4, T5, T10), vendor CTA / app block / footer (T12), `/plan` stub + corrupt storage (T3, T11), placeholder auth pages (T7), assets and logo (T6), `typecheck`/`test` scripts and Vitest unit tests for schema, store, route (T1–T4), production build (T9, T11, T12), trip start date helper (T2).
- **Deliberate additions beyond the spec:** passenger/room/guest upper bounds (50/20/50) in the schema; the `firstInvalidStep` helper; `use-media-query` and `use-is-client` hooks; a shared `ThemeToggle`. Adjust the bounds if the founder disagrees.
- **Conventions:** commit messages in this plan already fit `type(scope): subject`; executors may add a scope (for example `feat(landing): …`).
- **Open (from the spec):** scrim strength and plane resting position are tuned by eye in Task 8; `cruise.png` is unused.
