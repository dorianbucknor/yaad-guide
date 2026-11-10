# Vibe Entities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One Vibe vendor account can own several entities (businesses), each with its own documents and admin approval, and every Vibe listing belongs to exactly one entity.

**Architecture:** An entity is a `vendor_profiles` row. The table already holds one row per business with its own status, documents and listings, so the change is to stop forcing one VIBE row per account, make every Vibe code path take an explicit entity id instead of looking up "the" profile, and add entity pickers to the vendor screens. STAY gets the same rule in the database but no screens, because STAY is not built yet. No ban, subscription or limit logic is added.

**Tech Stack:** Next.js 16 server actions, Supabase Postgres with RLS, pgTAP, Vitest, zod.

**Spec:** `PRD.md`, vendor section "Entities (STAY and VIBE)" (commit `e356c57`).

## Global Constraints

- Branch `feat/vibe-entities` in a worktree at `.claude/worktrees/vibe-entities`, cut from `feat/move-listing-redesign` (`4d0bb71`). Do not touch the main folder, whose dev server on port 3000 must keep running. No push, no PR.
- MOVE stays exactly one profile per account. Only STAY and VIBE may have several.
- Never weaken RLS. Never run `supabase db reset`. Apply migrations to the local database only, with the scratchpad `applymig.sh`.
- Government ID stays one per account (`vendor_documents_one_id`); registration and venue permit stay one per profile.
- No entity limit, no billing, no ban column in this plan. The premium plan and bans are PRD "Later" items.
- `git add` specific paths only; never `supabase/config.toml` or `.env.example`. Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Quiet CLI flags, one full verification pass at the end (typecheck, eslint, vitest, pgTAP files touched).
- Keep `ARCHITECTURE.md` and `ARCHITECTURE-ESSENTIAL.md` in step.

## Review Focus

- A vendor with two Vibe entities: listing creation must say which entity; with no entity chosen it must refuse, never pick one silently.
- Entity A approved and entity B pending: a listing under B must not go live, and one under A must not be affected by B's status.
- Two entities with the same business name under one account: refused. The same name under different accounts: allowed.
- A vendor cannot create a listing under, or read documents of, another account's entity (RLS, not only app code).
- Existing single-profile vendors (all six demo vendors) keep working unchanged: one entity, no picker shown, same URLs.
- An entity with no business name: refused for VIBE and STAY (needed to tell entities apart).

---

### Task 1: Database rule

**Files:**
- Create: `supabase/migrations/20261110000900_vendor_entities.sql`
- Test: `supabase/tests/vendor_entities.test.sql`

**Interfaces:**
- Produces: `vendor_profiles` allows many rows per `(account_id, category)` for `stay` and `vibe`; at most one for `move`; business name unique per account for `stay` and `vibe`.

- [ ] **Step 1: Write the pgTAP test** `vendor_entities.test.sql`: as one account insert two `vibe` profiles with different names (passes); a second `vibe` with the same name (fails, case-insensitive); a second `move` profile (fails); two `stay` profiles (passes); a `vibe` profile with a null name (fails); a second account may reuse a name (passes); account B cannot insert a `vibe_listings` row under account A's profile (fails, RLS).
- [ ] **Step 2: Run it** with `scratchpad/pgt.sh supabase/tests/vendor_entities.test.sql`. Expected: FAIL on the first insert (the old unique constraint).
- [ ] **Step 3: Write the migration.** Drop `vendor_profiles_account_id_category_key`. Add partial unique index `vendor_profiles_one_move (account_id) where category = 'move'`. Add unique index `vendor_profiles_entity_name (account_id, category, lower(business_name)) where category in ('stay','vibe')`. Add check `vendor_profiles_entity_named` requiring `business_name is not null and btrim(business_name) <> ''` for `stay` and `vibe`, created `not valid` first and validated after a backfill that sets a null name on an existing stay or vibe row to `'My business'`.
- [ ] **Step 4: Apply and run** `applymig.sh` on the file, then the new test and `vendor_tables`, `vendor_functions`, `vendor_permissions`, `move_listing_tables` tests. Expected: new test passes; the others still pass (the `move_listing_tables` "an admin reads listings" failure is known and unrelated).
- [ ] **Step 5: Commit** the migration and test.

### Task 2: Entity helpers and entity-aware actions

**Files:**
- Create: `src/lib/vibe/entities.ts`, `src/lib/vibe/entities.test.ts`
- Modify: `src/lib/vibe/queries.ts` (`vibeProfile`, `getVibeOverview`), `src/lib/vibe/profile-actions.ts`, `src/lib/vibe/actions.ts` (`createListingAction`), `src/lib/schemas/vibe.ts`, `src/lib/vibe/types.ts`, and their `*.test.ts`.

**Interfaces:**
- Produces:
  - `listMyVibeEntities(supabase, userId): Promise<VibeEntity[]>` where `VibeEntity = { id; businessName; primaryRegion; status: VendorStatus; reviewNote: string | null }`, ordered by creation.
  - `resolveVibeEntity(supabase, userId, entityId: string | undefined): Promise<VibeEntity | null>`: with an id, returns that entity only if the account owns it; with no id, returns the only entity if there is exactly one, else `null`.
  - `vibeBusinessSchema` gains `entityId: z.uuid().optional()` and `businessName` becomes required (1 to 100 characters, message "Enter your business name.").
  - `VibeOverview` gains `entities: VibeEntity[]` and keeps `profile` as the resolved one (the `entity` search parameter, else the only one, else `null`).
  - `saveVibeBusinessAction(input)` creates a new entity when `entityId` is absent, updates when present. `recordVibeDocumentAction` input gains `entityId`. `createListingAction` input gains `entityId`, required when the account has more than one entity, and refused with "Choose which business this listing is for." when ambiguous.

- [ ] **Step 1: Write failing tests** in `entities.test.ts` and the existing action tests: `resolveVibeEntity` returns null for two entities and no id, returns the entity for one, returns null for another account's id; `createListingAction` refuses with two entities and no id, and with an id of an unapproved entity creates a draft; `saveVibeBusinessAction` with no id creates a second entity.
- [ ] **Step 2: Run** `npx vitest run src/lib/vibe` quietly. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the helpers and thread `entityId` through the three functions, replacing each `.eq("category","vibe").maybeSingle()` lookup with `resolveVibeEntity`. Create a `vibe_entities` read model only if a query needs more than `VibeEntity`; otherwise do not.
- [ ] **Step 4: Run** `npx vitest run src/lib/vibe src/lib/schemas` and typecheck. Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 3: Vendor screens for entities

**Files:**
- Create: `src/components/vibe/entity-switcher.tsx`, `src/components/vibe/entity-cards.tsx`
- Modify: `src/app/v/vibe/page.tsx`, `src/app/v/vibe/profile/page.tsx`, `src/app/v/vibe/onboarding/page.tsx`, `src/components/vibe/business-form.tsx`, `src/components/vibe/dashboard.tsx`, `src/components/vendor/setup-prompt.tsx` (copy only).

**Interfaces:**
- Consumes: `VibeOverview.entities`, `VibeOverview.profile` from Task 2.
- Produces: URL form `/v/vibe/profile?entity=<id>` and `/v/vibe/onboarding?entity=<id>`; `/v/vibe/onboarding?new=1` starts a new entity.

- [ ] **Step 1: Write component tests** (Vitest, Testing Library as the repo does): `EntitySwitcher` renders nothing for one entity and a labelled select for two or more; `EntityCards` shows each entity's name and status and an "Add a business" link to `/v/vibe/onboarding?new=1`.
- [ ] **Step 2: Run them.** Expected: FAIL (components missing).
- [ ] **Step 3: Implement.** Dashboard: when approved entities exist, show them as cards above the listings; when there is exactly one entity, show nothing new (same screen as today). Profile and onboarding pages read `?entity` and pass it to the forms and document uploads; `new=1` shows an empty business form. Use shadcn components already in the repo; no new component by hand. Follow `DESIGN.md` and the 44px tap rule. Business form label: "Business name" with help "The name travelers see as the host."
- [ ] **Step 4: Typecheck, eslint, run the component tests.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 4: Listings under an entity

**Files:**
- Modify: `src/app/v/vibe/listings/new/page.tsx`, `src/components/vibe/listing-list.tsx`, `src/components/vibe/sorted-listings.tsx`, `src/lib/vibe/queries.ts` (`getMyVibeListings`, `VibeListingSummary` gains `entityId`, `entityName`), `src/app/v/vibe/listings/[id]/page.tsx`, `src/app/v/vibe/calendar/page.tsx`, `src/components/vibe/slot-calendar.tsx`, and tests.

**Interfaces:**
- Consumes: `VibeEntity`, `createListingAction({ entityId })`.
- Produces: `VibeListingSummary.entityName: string` shown on list rows and in the editor description when the vendor has more than one entity; the new-listing form shows an entity select listing approved and draft entities (not rejected), required when more than one.

- [ ] **Step 1: Write failing tests**: listing sort and list rendering with two entities shows the entity name on each row and with one entity shows none; the calendar's listing select label becomes "Listing title (Entity name)" only with two or more entities.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the query join (`vendor_profiles(business_name)`), the row label, the entity select on the new-listing form, and the editor description line "Hosted by <entity>". A listing under an unapproved entity can be drafted but the editor's send-for-review readiness already requires `profile_approved`; confirm `vibeReadiness` reads that entity's status, not the account's first profile, and fix if not.
- [ ] **Step 4: Typecheck, eslint, vitest on the touched folders.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 5: Admin review and browser check

**Files:**
- Modify: `src/lib/vendor/admin-queries.ts`, `src/lib/vibe/admin-queries.ts`, the admin queue row and detail components that show the business (find with `grep -rn "businessName" src/components/admin`).

- [ ] **Step 1: Write a failing test** that two VIBE entities of one account appear as two separate queue items, each showing its business name and the owner's name, and that approving one leaves the other pending.
- [ ] **Step 2: Run.** Expected: FAIL if the queue groups by account; if it already lists per profile, record that in the commit message and skip to Step 4.
- [ ] **Step 3: Implement** per-profile items and show "Business name (owner)" in the row.
- [ ] **Step 4: Browser check** on a throwaway dev server on a free port started from the worktree (stopped afterwards; leave port 3000 alone): sign in as `vendor1@example.test` (password in `scripts/seed-demo.ts`), add a second entity, confirm the picker appears, create a listing under each, confirm the admin queue shows both. Delete the test entity and listings afterwards.
- [ ] **Step 5: Commit.**

### Task 6: Documents and verification

**Files:**
- Modify: `ARCHITECTURE.md`, `ARCHITECTURE-ESSENTIAL.md`, `README.md` (the Vibe section only).

- [ ] **Step 1:** Describe entities in both architecture files: the entity is a `vendor_profiles` row, the new uniqueness rules, `?entity=` URLs, the "no entity chosen" refusal, and that bans, entity limits and subscriptions are not built.
- [ ] **Step 2: One verification pass:** `npm run typecheck`, `npx eslint --quiet src`, `npx vitest run --reporter=dot`, and the pgTAP files `vendor_entities`, `vendor_tables`, `vendor_functions`, `vendor_permissions`. Expected: all pass apart from the known unrelated `move_listing_tables` test 32.
- [ ] **Step 3: Commit** the docs. Report that hosted Supabase still needs `npx supabase db push --linked` (now also `20261110000900`).
