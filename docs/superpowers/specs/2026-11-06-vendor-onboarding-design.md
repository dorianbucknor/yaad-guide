# Vendor onboarding (MOVE) and admin review: design

Date: 2026-11-06. Status: awaiting review. Follows `2026-11-06-auth-foundation-design.md`.

## Goal

A signed-in vendor can complete a MOVE vendor profile (business details, vehicles, verification documents), submit it for review, and learn the result. An admin can review the profile and its documents and approve or reject it. STAY and VIBE reuse the same engine in later pieces.

## Decisions (from the brainstorm)

- Scope is MOVE only. The profile, document, status, review and transfer machinery is category-agnostic so STAY and VIBE add a details table and a form each.
- Admin review is in scope. Vendors are told the result in the app only. Transactional email is a later piece (recorded in `PRD.md`).
- One account can have up to three vendor profiles, one per category, unique on (account, category).
- A MOVE vendor can register several vehicles but operates one at a time (the active vehicle). A vehicle can change owner only through a transfer: the new owner requests it, the current owner agrees or declines, and only then does an admin approve or reject.
- The primary region is informational. It never limits where a driver can work; service areas belong to listings.
- Every document that lapses (JTB license, insurance, fitness certificate) has a required expiry date.
- The form is a stepped flow that saves a draft at each step, so a vendor can leave and resume from `/vendor`.
- Account first, details second: the vendor creates the account (already built), then fills in the profile. This replaces the PRD's "held in the browser until sign-up is confirmed" wording.

## Data model

All tables have row-level security and the audit trigger from `audit_log`. Authoring columns (`created_at`, `created_by`, `updated_at`, `updated_by`) follow the `profiles` pattern.

**`vendor_profiles`**
- `id`, `account_id` (auth user), `category` (`move`, `stay`, `vibe`), `business_name` (optional), `primary_region`, `status` (`draft`, `pending`, `approved`, `rejected`), `review_note`, `submitted_at`, `reviewed_at`, `reviewed_by`.
- Unique on (`account_id`, `category`). `draft` replaces the architecture doc's `unverified`.

**`vendor_vehicles`**
- `id`, `vendor_profile_id`, `vehicle_type` (Sedan, SUV, Minivan, Station Wagon/Hatchback, Bus, Coach), `make`, `model`, `year`, `plate`, `passenger_capacity`, `is_active`.
- `plate` is stored trimmed, upper-cased and with inner spaces removed, and is unique across the platform.
- A partial unique index allows one `is_active` row per profile.

**`vendor_documents`**
- `id`, `account_id`, `vendor_profile_id` (null for the government ID), `vehicle_id` (set for insurance and fitness certificates), `doc_type` (`government_id`, `jtb_license`, `insurance`, `fitness`), `storage_path`, `expires_on` (required for `jtb_license`, `insurance`, `fitness`), `verified` (set by an admin), `uploaded_at`.
- Ownership by type: government ID belongs to the account, JTB license to the profile, insurance and fitness to the vehicle. A check constraint enforces which columns each type sets.

**`vehicle_transfers`**
- `id`, `vehicle_id`, `from_profile_id`, `to_profile_id`, `status` (`requested`, `owner_agreed`, `owner_declined`, `approved`, `rejected`), `note`, `requested_by`, `owner_responded_at`, `reviewed_by`, `reviewed_at`.
- The new owner requests by plate. The current owner sees the request on `/vendor` and agrees or declines. Only an `owner_agreed` transfer reaches the admin. Approval moves `vendor_vehicles.vendor_profile_id`, clears `is_active`, and sets the vehicle's documents back to unverified for the new owner.

**Storage**
- Private bucket `vendor-documents`, path `<account_id>/<document_id>.<ext>`. PDF, JPG or PNG, 5 MB maximum, enforced by the bucket and by client-side checks.
- Vendors read and write only their own folder. Admins view documents through short-lived signed URLs created on the server after a role check. Nothing is public.

## Security

- Vendors read and write only their own rows, and only while the profile is `draft` or `rejected`. After submission the profile is locked until an admin decides.
- Vendors cannot write `status`, `review_note`, `submitted_at`, `reviewed_*`, `verified` or `is_active` on vehicles directly. Column-level grants plus these security-definer functions are the only paths:
  - `submit_vendor_profile(profile_id)`: owner only, status `draft` or `rejected`. Requires the government ID, the JTB license, at least one vehicle with insurance and fitness certificates, and an active vehicle, with no required document expired. Sets `pending`. A repeat call does nothing.
  - `review_vendor_profile(profile_id, decision, note)`: admin only, status `pending`. `rejected` requires a note. Sets the status, reviewer and time. A repeat call does nothing.
  - `set_active_vehicle(vehicle_id)`: owner only. The vehicle needs verified insurance and fitness certificates that have not expired.
  - `request_vehicle_transfer(plate)`: any vendor profile owner, for a vehicle held by another profile; one open request per vehicle.
  - `respond_vehicle_transfer(transfer_id, agree)`: the current owner only, status `requested`.
  - `review_vehicle_transfer(transfer_id, decision, note)`: admin only, status `owner_agreed` only.
  - `verify_vendor_document(document_id, verified)`: admin only.
- A rejected government ID rejects every profile of that account with the reason. The vendor replaces the ID once and resubmits each profile.
- Every decision writes an `audit_log` row.
- Admins read all rows through the existing `admin` role check on `app_metadata`.

## Vendor flow (`/vendor`)

A status banner and a checklist: business, vehicle, documents, review. Each step saves a draft as the vendor goes.

1. **Business:** optional business name and primary region, with a note that the region does not limit where they work.
2. **Vehicle:** type, make, model, year, plate, passenger capacity. More vehicles can be added later. A plate that belongs to another vendor fails with an offer to request a transfer.
3. **Documents:** government ID (skipped when the account already has one), JTB license with expiry, and insurance and fitness certificates with expiry for each vehicle.
4. **Review:** a summary and **Submit for review**, disabled until the readiness check passes.

After submit the profile shows Pending and is locked. On rejection the vendor sees the admin's reason, edits what is needed and resubmits, replacing only the rejected or missing documents. On approval the banner turns green. Draft listings are a later piece.

## Admin flow (`/admin/vendors`)

- A queue of `pending` profiles, oldest first, and a tab for transfer requests that the current owner has agreed to.
- The detail page shows the profile, its vehicles and each document through a signed URL. Expiry dates are shown and expired ones are highlighted.
- **Approve** and **Reject** (reject needs a written reason). Each document can be marked verified.

## Components and files

- Pure logic in `src/lib/vendor/`: `readiness.ts` (submit checklist as a pure function), `plate.ts` (normalize), `documents.ts` (file type and size rules, which types need an expiry), `queue.ts` (admin queue ordering).
- Schemas in `src/lib/schemas/vendor.ts` (business, vehicle, document metadata), shared by forms and server actions as elsewhere.
- Server actions in `src/lib/vendor/actions.ts` and `src/lib/vendor/admin-actions.ts`. Each validates with zod, then calls the matching database function.
- Components in `src/components/vendor/` (status banner, checklist, step forms, document uploader) and `src/components/admin/` (queue, review panel).
- Routes: `src/app/vendor/page.tsx` extended, `src/app/vendor/onboarding/[step]/page.tsx`, `src/app/admin/vendors/page.tsx` and `src/app/admin/vendors/[id]/page.tsx`. The proxy already guards `/vendor` and `/admin` by role.
- Migrations: tables and indexes, functions and grants, and the storage bucket with its policies.
- Cookie-reading components stay inside `<Suspense>` and call `connection()` before reading the session, as in the auth work.

## Errors and edge cases

- Upload failures and wrong type or size give a plain message and leave the draft unchanged.
- An upload that succeeds when saving its row fails is replaced on the next save of that document. A cleanup for files with no row is a later maintenance task.
- Replacing a document while pending is blocked by row-level security.
- Expiry is checked at submit and again on the admin screen. A document that expires after approval changes nothing yet; reminders and suspension are a later piece.
- A duplicate plate is rejected by the unique index. Two simultaneous activations cannot both succeed because of the partial unique index.
- Double submit and double decision are no-ops.
- Documents of a vehicle cannot be moved to another profile except through an approved transfer.
- A transfer request the current owner never answers stays `requested`; the new owner can withdraw it. An owner who is unreachable is handled by the admin outside the app for now.
- A vendor cannot activate or edit a vehicle that has an open transfer request against it until the request is answered.

## Testing

- **pgTAP:** row-level security (no cross-vendor access to rows or files; no writes to status, review columns or documents once submitted); submit refuses when anything required is missing or expired; only admins can review, verify or approve transfers; one active vehicle per profile; platform-unique plates; transfer approval moves the vehicle and resets document review; audit rows for every decision.
- **Vitest:** zod schemas, `readiness.ts`, `plate.ts`, `documents.ts`, `queue.ts`, and server actions with the Supabase client mocked.
- **By hand:** the upload flow against real storage, and the full submit, approve and reject round trip once built.

## Out of scope

STAY and VIBE details and the map pin picker, listings, bookings, payouts, transactional email, document expiry reminders and auto-suspension, orphaned file cleanup, public vendor profile pages.
