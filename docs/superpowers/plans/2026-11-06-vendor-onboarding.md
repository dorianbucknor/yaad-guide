# Vendor Onboarding (MOVE) and Admin Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in vendor completes a MOVE vendor profile (business, vehicles, documents), submits it, and sees the result; an admin reviews and approves or rejects, and vehicle transfers need the current owner's consent plus admin approval.

**Architecture:** Three migrations (tables with row-level security and audit triggers; security-definer functions as the only write path for status, review, activation and transfers; a private `vendor-documents` bucket). Pure logic and zod schemas in `src/lib/vendor/` and `src/lib/schemas/vendor.ts` are shared by forms and server actions. Server actions validate with zod and call the database functions. UI is a stepped draft flow under `/vendor` and an admin queue under `/admin/vendors`.

**Tech Stack:** Next.js 16.4 (Cache Components), Supabase (Postgres, RLS, Storage, pgTAP), `@supabase/ssr`, react-hook-form + zod 4, shadcn on Base UI, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-06-vendor-onboarding-design.md` (binding). Build on `docs/superpowers/specs/2026-11-06-auth-foundation-design.md`.

## Global Constraints

- Every Supabase table has row-level security. Never weaken it. The service-role key is never used; admins read documents through storage policies that check `app_metadata.role = 'admin'`.
- Status, review columns, `verified`, `is_active` and transfer status are written only by security-definer functions (`set search_path = ''`, execute granted to `authenticated` only, revoked from `public, anon`). Clients get column-level grants like `profiles`.
- Every form uses react-hook-form with a zod schema; server actions validate with the same schema (`fromZod`, `ActionResult` from `src/lib/auth/result.ts`).
- Components that read the session call `await connection()` (from `next/server`) first and render inside `<Suspense>`; pages follow the pattern in `src/app/profile/page.tsx`.
- Buttons and form controls are at least 44px tall below `md` (use the shared `src/components/ui` components; add new ones with the shadcn CLI).
- Files: PDF, JPG or PNG, 5 MB maximum. Storage path `<account_id>/<document_id>.<ext>`. Plates stored trimmed, upper-cased, inner spaces removed.
- Status values: `draft`, `pending`, `approved`, `rejected`. Transfer status: `requested`, `owner_agreed`, `owner_declined`, `approved`, `rejected`.
- Read the Next.js 16 docs in `node_modules/next/dist/docs/` before relying on routing or caching behavior (`params` is a Promise).
- No secrets in the repo. Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

Classes the tests must pin, each owned by a task below:
1. A vendor edits a profile, vehicle or document after submitting (Task 3 pgTAP).
2. A vendor reads or overwrites another vendor's file or rows (Tasks 3 and 5 pgTAP).
3. A document that is expired at submit time, or expires between steps (Tasks 1 and 4).
4. Two requests activate vehicles at once, or register the same plate in different spellings (Tasks 3 and 4).
5. A forged storage path or another account's path passed to a server action (Task 6).
6. Double submit, double review, and a second answer to a transfer (Task 4).
7. A rejected government ID cascades to every profile of that account (Task 4).

---

### Task 1: Pure vendor logic

**Files:**
- Create: `src/lib/vendor/plate.ts`, `src/lib/vendor/documents.ts`, `src/lib/vendor/readiness.ts`, `src/lib/vendor/queue.ts`
- Test: `src/lib/vendor/plate.test.ts`, `documents.test.ts`, `readiness.test.ts`, `queue.test.ts`

**Interfaces:**
- Produces:
  - `normalizePlate(input: string): string` (trim, upper-case, remove all spaces).
  - `DOC_TYPES = ["government_id","jtb_license","insurance","fitness"] as const`, `type DocType`; `needsExpiry(type: DocType): boolean` (true for all but `government_id`); `needsVehicle(type: DocType): boolean` (true for `insurance`, `fitness`); `ALLOWED_MIME = ["application/pdf","image/jpeg","image/png"]`, `MAX_FILE_BYTES = 5 * 1024 * 1024`; `validateFile(file: {type: string; size: number}): string | null` (message or null); `isExpired(expiresOn: string, today: string): boolean` (`yyyy-MM-dd` strings, expired when `expiresOn < today`); `documentPath(accountId: string, documentId: string, mime: string): string`; `isOwnDocumentPath(path: string, accountId: string): boolean`.
  - `checkReadiness(input: ReadinessInput): { ready: boolean; missing: string[] }` with `ReadinessInput = { vehicles: { id: string; isActive: boolean }[]; documents: { docType: DocType; vehicleId: string | null; expiresOn: string | null }[]; today: string }`.
  - `sortPending<T extends { submittedAt: string }>(rows: T[]): T[]` (oldest first, input not mutated).

- [ ] **Step 1: Write the failing tests.** `plate.test.ts`: `"1234 ab"`, `" 1234AB "` and `"1234AB"` all give `"1234AB"`. `documents.test.ts`: `needsExpiry("government_id")` false and the other three true; `validateFile({type:"image/gif",size:1})` returns a message, `{type:"application/pdf",size:5*1024*1024+1}` returns a message, `{type:"image/png",size:1000}` returns null; `isExpired("2026-11-05","2026-11-06")` true, equal dates false; `documentPath("a1","d1","image/png")` is `"a1/d1.png"` (pdf gives `.pdf`, jpeg gives `.jpg`); `isOwnDocumentPath("a1/d1.png","a1")` true, `"a2/d1.png"`, `"a1/../a2/d1.png"` and `"a1/x/d1.png"` false. `readiness.test.ts`: ready with ID, JTB license, one active vehicle with unexpired insurance and fitness; each of these alone makes it not ready, with a distinct `missing` entry: no ID, no license, expired license, no vehicle, no active vehicle, vehicle missing insurance, vehicle missing fitness, expired fitness; a second vehicle without certificates also blocks. `queue.test.ts`: oldest `submittedAt` first and the input array is unchanged.
- [ ] **Step 2: Run** `npx vitest run src/lib/vendor --reporter=dot`. Expected: FAIL (modules not found).
- [ ] **Step 3: Implement** the four modules to the signatures above. Pure functions only, no `Date` reads.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(vendor): pure plate, document, readiness and queue logic`.

### Task 2: Vendor zod schemas

**Files:**
- Create: `src/lib/schemas/vendor.ts`; Test: `src/lib/schemas/vendor.test.ts`

**Interfaces:**
- Consumes: `normalizePlate`, `DOC_TYPES`, `needsExpiry`, `needsVehicle` (Task 1).
- Produces: `JAMAICA_PARISHES` (the 14 parishes), `VEHICLE_TYPES = ["Sedan","SUV","Minivan","Station Wagon/Hatchback","Bus","Coach"] as const`; `businessSchema` (`businessName` optional, trimmed, at most 80; `primaryRegion` one of the parishes); `vehicleSchema` (`vehicleType`, `make`, `model` trimmed 1-40, `year` integer from 1980 to next calendar year checked at parse time, `plate` normalized then 2-10 characters of letters, digits, `-`, `passengerCapacity` integer 1-80); `documentMetaSchema` (`docType`, `vehicleId` optional uuid, `expiresOn` optional `yyyy-MM-dd`, `path` string) refined so expiring types need `expiresOn`, vehicle types need `vehicleId`, and `government_id` and `jtb_license` must not carry a `vehicleId`; `transferRequestSchema` (`plate` normalized); input types `BusinessInput`, `VehicleInput`, `DocumentMetaInput`.

- [ ] **Step 1: Write the failing tests** covering: business accepts empty name, rejects unknown region and a name over 80; vehicle rejects year 1979 and next-year-plus-one, rejects capacity 0 and 81, rejects unknown type, normalizes `"ab 12"` to `"AB12"`; document meta: insurance without `vehicleId` fails, insurance without `expiresOn` fails, `government_id` with `expiresOn` absent passes, `jtb_license` with a `vehicleId` fails.
- [ ] **Step 2: Run** `npx vitest run src/lib/schemas/vendor.test.ts --reporter=dot`. Expected: FAIL.
- [ ] **Step 3: Implement** the schemas.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(vendor): zod schemas for business, vehicle and document metadata`.

### Task 3: Tables, constraints and row-level security

**Files:**
- Create: `supabase/migrations/20261107000100_vendor_tables.sql`, `supabase/tests/vendor_tables.test.sql`

**Interfaces:**
- Consumes: `public.profiles`, `public.audit_row_change()`, admin check `((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'`.
- Produces: tables `vendor_profiles`, `vendor_vehicles`, `vendor_documents`, `vehicle_transfers` exactly as in the spec's Data model, with authoring columns, an `updated_at`/`updated_by` trigger (reuse `set_updated_fields`), and `audit_row_change` triggers on all four. Constraints: unique (`account_id`, `category`); unique `plate`; partial unique index on `vendor_vehicles (vendor_profile_id) where is_active`; `vendor_documents` check that `government_id` has null `vendor_profile_id` and `vehicle_id`, `jtb_license` has a profile and no vehicle, and `insurance` and `fitness` have a vehicle; `expires_on` not null for the three expiring types; one document per slot (unique on account, profile, vehicle, type, using coalesced nulls); one open transfer per vehicle (partial unique where status in `requested`, `owner_agreed`).
- RLS: owners select their own rows; admins select all. Owners insert and update their own `vendor_profiles` columns `business_name` and `primary_region`, vehicles' descriptive columns, and documents' `storage_path`/`expires_on`, only while the owning profile is `draft` or `rejected`; owners may delete vehicles and documents under the same condition. Column grants exclude `status`, review columns, `is_active`, `verified`. Transfers are readable by the requester, the current owner and admins; all writes go through functions (Task 4).

- [ ] **Step 1: Write the failing pgTAP file** `vendor_tables.test.sql` (same style as `supabase/tests/auth_foundation.test.sql`: users inserted into `auth.users`, `set local role authenticated` plus `request.jwt.claims` to impersonate). Assertions: owner reads own profile and not another's; admin reads all; owner cannot update `status`; owner cannot edit a vehicle or document once the profile is `pending` (update affects zero rows); owner cannot insert a vehicle under another account's profile; duplicate plate (`"ab 12"` vs `"AB12"` after normalization trigger or check) fails; second active vehicle in one profile fails; document check constraints reject a government ID with a vehicle and an insurance row without one; a second profile for the same account and category fails; audit rows exist for an insert and an update.
- [ ] **Step 2: Run** `npx supabase test db` (needs Docker and a started local stack). Expected: FAIL (tables missing).
- [ ] **Step 3: Write the migration** to the spec. Plate normalization happens in a `before insert or update` trigger that sets `plate := upper(replace(trim(plate), ' ', ''))`.
- [ ] **Step 4: Run** `npx supabase test db`. Expected: the new file passes and `auth_foundation.test.sql` still passes.
- [ ] **Step 5: Commit** `feat(db): vendor profiles, vehicles, documents and transfers with RLS`.

### Task 4: Security-definer functions

**Files:**
- Create: `supabase/migrations/20261107000200_vendor_functions.sql`, `supabase/tests/vendor_functions.test.sql`

**Interfaces:**
- Consumes: Task 3 tables.
- Produces (all `security definer`, `set search_path = ''`, execute for `authenticated`, revoked from `public, anon`; each checks `auth.uid()` and role itself):
  - `submit_vendor_profile(p_profile_id uuid) returns text`: owner only; from `draft` or `rejected`; requires the government ID, the JTB license, at least one vehicle, an active vehicle, and unexpired insurance and fitness for every vehicle and an unexpired license (compare `expires_on` to `current_date`); sets `pending`, `submitted_at`; returns the new status; a repeat on `pending` returns `pending` without change; raises with a message naming what is missing.
  - `review_vendor_profile(p_profile_id uuid, p_decision text, p_note text) returns text`: admin only; only from `pending`; `rejected` requires a non-empty note; sets status, `review_note`, `reviewed_by`, `reviewed_at`; a repeat is a no-op.
  - `set_active_vehicle(p_vehicle_id uuid) returns void`: owner only; vehicle must have verified, unexpired insurance and fitness and no open transfer; clears the profile's other active vehicle and sets this one in one statement.
  - `verify_vendor_document(p_document_id uuid, p_verified boolean) returns void`: admin only.
  - `reject_account_identity(p_account_id uuid, p_note text) returns void`: admin only; sets every `pending` or `approved` profile of the account to `rejected` with the note, clears the ID's `verified`.
  - `request_vehicle_transfer(p_plate text) returns uuid`: a vendor-profile owner (the caller's MOVE profile becomes `to_profile_id`) for a vehicle held by another profile; normalizes the plate; one open request per vehicle; returns the transfer id.
  - `respond_vehicle_transfer(p_transfer_id uuid, p_agree boolean) returns void`: current owner only, from `requested` only; sets `owner_agreed` or `owner_declined`; a second answer raises.
  - `withdraw_vehicle_transfer(p_transfer_id uuid) returns void`: the requester only, while `requested` or `owner_agreed`.
  - `review_vehicle_transfer(p_transfer_id uuid, p_decision text, p_note text) returns void`: admin only, from `owner_agreed` only; `approved` moves the vehicle to the new profile, clears `is_active`, and sets that vehicle's documents' `verified` to false; `rejected` leaves it.

- [ ] **Step 1: Write the failing pgTAP file.** Cover: submit refused (with each missing item) and then accepted; submit with an expired license refused; double submit leaves `submitted_at` unchanged; a non-owner cannot submit; review by a non-admin fails; reject without a note fails; approve sets reviewer and time; double review no-op; activation needs verified, unexpired certificates; two sequential activations leave exactly one active; ID rejection cascades to two profiles of one account; transfer happy path request, agree, approve moves the vehicle and resets `verified`; admin cannot approve a `requested` transfer; non-owner cannot respond; second answer raises; withdraw works for the requester only; duplicate-spelling plate request finds the same vehicle; audit rows written for review and transfer decisions.
- [ ] **Step 2: Run** `npx supabase test db`. Expected: FAIL.
- [ ] **Step 3: Write the migration** to the signatures above.
- [ ] **Step 4: Run** `npx supabase test db`. Expected: all files pass.
- [ ] **Step 5: Commit** `feat(db): vendor submit, review, activation and transfer functions`.

### Task 5: Private document storage

**Files:**
- Create: `supabase/migrations/20261107000300_vendor_documents_storage.sql`, `supabase/tests/vendor_storage.test.sql`

**Interfaces:**
- Produces: private bucket `vendor-documents` (`public false`, 5 MB limit, mime `application/pdf`, `image/jpeg`, `image/png`) with policies modeled on `20261106000300_avatars_storage.sql`: authenticated users insert, update, select and delete only inside their own `<uid>/` folder, and only while their profile is `draft` or `rejected` for insert, update and delete; admins select any object in the bucket.

- [ ] **Step 1: Write the failing pgTAP file.** A vendor can insert into their own folder and cannot insert into another's; a vendor cannot select another vendor's object; an admin can select any object; a vendor cannot insert while all their profiles are `pending`; the bucket is not public and has the 5 MB limit and the three mime types.
- [ ] **Step 2: Run** `npx supabase test db`. Expected: FAIL.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run** `npx supabase test db`. Expected: all files pass.
- [ ] **Step 5: Commit** `feat(db): private vendor-documents bucket with owner and admin policies`.

### Task 6: Vendor server actions and queries

**Files:**
- Create: `src/lib/vendor/actions.ts` (`"use server"`), `src/lib/vendor/queries.ts`, `src/lib/vendor/types.ts`
- Test: `src/lib/vendor/actions.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 2, 4; `createClient` (`src/lib/supabase/server`), `fromZod`, `ActionResult`, `toAuthMessage` style error logging (`console.error` with the Supabase message before returning a generic message).
- Produces (all validate with zod, verify the user with `getUser()`, return `ActionResult`):
  - `saveBusinessAction(input: unknown)`: upserts the caller's MOVE profile as `draft` (creating it on first save).
  - `addVehicleAction(input: unknown)`, `removeVehicleAction(vehicleId: string)`.
  - `recordDocumentAction(input: unknown)`: validates `documentMetaSchema`, requires `isOwnDocumentPath(path, user.id)`, upserts the document row in its slot, and removes the replaced file.
  - `submitProfileAction()`, `setActiveVehicleAction(vehicleId: string)`.
  - `requestTransferAction(input: unknown)`, `respondTransferAction(transferId: string, agree: boolean)`, `withdrawTransferAction(transferId: string)`.
  - `getVendorOverview(): Promise<VendorOverview | null>` in `queries.ts` (profile, vehicles, documents, transfers in and out, readiness from `checkReadiness`), with `VendorOverview` in `types.ts`. Calls `await connection()` first.

- [ ] **Step 1: Write the failing tests** with the Supabase server client mocked (`vi.mock("@/lib/supabase/server")`, same style as `src/app/auth/vendor/complete/route.test.ts`): `recordDocumentAction` rejects a path from another account and a path with `..`; rejects insurance without an expiry; `saveBusinessAction` returns field errors for an unknown region; `submitProfileAction` returns the function's error message for a missing item and logs the real one; actions return the sign-in-again message when there is no user; `addVehicleAction` maps a duplicate-plate database error to a message offering a transfer request.
- [ ] **Step 2: Run** `npx vitest run src/lib/vendor/actions.test.ts --reporter=dot`. Expected: FAIL.
- [ ] **Step 3: Implement** actions and queries.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(vendor): server actions and overview query`.

### Task 7: Vendor onboarding UI

**Files:**
- Create: `src/components/vendor/{status-banner,checklist,business-form,vehicle-form,document-uploader,submit-panel,transfer-inbox}.tsx`, `src/app/vendor/onboarding/[step]/page.tsx`
- Modify: `src/app/vendor/page.tsx`

**Interfaces:**
- Consumes: Task 6 actions and `getVendorOverview`, Task 2 schemas, Task 1 helpers, `src/components/auth/{text-field,apply-failure}`, shadcn `card`, `badge`, `alert`, `select`, `progress`, `dialog`, `field`.
- Produces: `/vendor` shows the status banner (Draft, Pending, Approved, Rejected with the admin's reason), the checklist (business, vehicles, documents, review) with each step's state and a link, and the transfer inbox (requests for the vendor's vehicles with Agree and Decline, and the vendor's own outgoing requests with Withdraw). `/vendor/onboarding/[step]` renders `business`, `vehicles`, `documents` or `review`; unknown steps call `notFound()`. The document uploader checks `validateFile`, uploads straight to the `vendor-documents` bucket with the browser client (same approach as `avatar-upload.tsx`), then calls `recordDocumentAction`; it skips the government ID slot when the account already has one. The submit panel disables **Submit for review** until `checkReadiness` says ready and lists `missing`. When a profile is pending or approved, forms are read-only. A duplicate-plate error offers a "Request a transfer" form.
- Forms use react-hook-form with the Task 2 schemas, toast on success and failure, and `connection()` plus `<Suspense>` in the pages.

- [ ] **Step 1: Write the failing test** `src/components/vendor/checklist.test.tsx` (or a pure helper `checklistSteps(overview)` in `src/lib/vendor/checklist.ts` with its test): the four steps' states derive from the overview (business done when a profile exists, vehicles done when at least one vehicle, documents done when `checkReadiness` has no document items missing, review enabled only when ready).
- [ ] **Step 2: Run** that test. Expected: FAIL.
- [ ] **Step 3: Implement** the helper, then the components and pages. Keep each component focused; follow the spacing and field patterns of `profile-form.tsx` and `vendor-signup-form.tsx`.
- [ ] **Step 4: Run** `npx vitest run src/lib/vendor --reporter=dot`, then `npm run typecheck`. Expected: PASS and exit 0.
- [ ] **Step 5: Commit** `feat(vendor): stepped onboarding flow, status banner and transfer inbox`.

### Task 8: Admin review

**Files:**
- Create: `src/lib/vendor/admin-actions.ts` (`"use server"`), `src/components/admin/{vendor-queue,review-panel,transfer-queue}.tsx`, `src/app/admin/vendors/page.tsx`, `src/app/admin/vendors/[id]/page.tsx`
- Test: `src/lib/vendor/admin-actions.test.ts`

**Interfaces:**
- Consumes: Task 4 functions, Task 5 admin storage policy, `sortPending` (Task 1).
- Produces: `reviewProfileAction(input: unknown)` (`{profileId, decision: "approved"|"rejected", note?}`, reject needs a note), `verifyDocumentAction(documentId: string, verified: boolean)`, `rejectIdentityAction(accountId: string, note: string)`, `signedDocumentUrlAction(documentId: string): Promise<ActionResult<{url: string}>>` (60-second signed URL through the admin's own session), `reviewTransferAction(input: unknown)`. Each action first confirms the caller's role is `admin` from `getClaims()` and rejects otherwise, then calls the function. Pages: `/admin/vendors` lists pending profiles oldest first plus a tab of transfers in `owner_agreed`; `/admin/vendors/[id]` shows the profile, vehicles and each document with its expiry (expired ones highlighted), Approve, Reject with a required reason, per-document verify, and Reject ID.

- [ ] **Step 1: Write the failing tests** (mocked client): each action returns a forbidden message for a non-admin viewer without calling the database; `reviewProfileAction` rejects a reject without a note via zod; `signedDocumentUrlAction` returns a URL for an admin and an error otherwise.
- [ ] **Step 2: Run** `npx vitest run src/lib/vendor/admin-actions.test.ts --reporter=dot`. Expected: FAIL.
- [ ] **Step 3: Implement** the actions, components and pages (`connection()` plus `<Suspense>`).
- [ ] **Step 4: Run** the same command, then `npm run typecheck`. Expected: PASS and exit 0.
- [ ] **Step 5: Commit** `feat(admin): vendor review queue, document viewer and transfer approval`.

### Task 9: Docs and final verification

**Files:**
- Modify: `README.md` (what exists today: vendor onboarding and admin review), `.env.example` only if a new variable appeared (none expected).

- [ ] **Step 1:** Update `README.md` to describe `/vendor` onboarding and `/admin/vendors`, and the `npx supabase db push` note for the three new migrations.
- [ ] **Step 2: Run** `npx vitest run --reporter=dot`, `npm run typecheck`, `npm run lint` and `npx supabase test db`. Expected: all green, no new lint errors in vendor or admin files.
- [ ] **Step 3: Run** `npm run build`. Expected: exit 0 and `/vendor/onboarding/[step]`, `/admin/vendors` listed as dynamic or partial prerender; no blocking-route errors.
- [ ] **Step 4: Commit** `docs: describe vendor onboarding and admin review`.
