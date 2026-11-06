# Auth foundation: design

Date: 2026-11-06. Status: draft for review.

## Goal

Travelers and vendors can sign up and sign in with email/password or Google, confirm their email, reset a forgotten password, and verify a phone number. Roles (`traveler`, `vendor`, `admin`) are enforced in the database and at the route level. Vendor sign-up (account, phone, vendor landing page) is included. Per-category vendor business details and documents are the next piece and are out of scope here.

## Decisions

- Roles live in a `profiles` table and are copied into `app_metadata` so they appear in the JWT. Users cannot edit `app_metadata`. Admin is granted by SQL only.
- Phone verification uses Supabase's built-in phone-change flow (`updateUser({ phone })`, then `verifyOtp({ type: 'phone_change' })`). The SMS provider is not chosen; development uses Supabase test phone numbers with fixed codes.
- Sessions use `@supabase/ssr` cookies. Session refresh and route guards run in `src/proxy.ts` (Next 16 name for middleware; confirm conventions in `node_modules/next/dist/docs/` first).
- Server code reads claims with `getClaims()`. `getUser()` is used only before sensitive changes (password, phone).
- Every form uses react-hook-form with a zod schema in `src/lib/schemas/`, and its server action validates with the same schema.

## Data model

Supabase project: `https://hxhgbwatfosmnjadfukk.supabase.co`. Migrations are plain SQL in `supabase/migrations/`. They are not applied to the hosted project without the owner's go-ahead.

### `profiles`

One row per `auth.users` row, created by a trigger at sign-up.

| Column | Notes |
| --- | --- |
| `id` | primary key, references `auth.users` |
| `role` | `traveler` (default), `vendor`, `admin` |
| `first_name`, `last_name` | from the sign-up form or Google metadata |
| `phone` | mirrored from `auth.users.phone`, never written by the client |
| `phone_verified_at` | mirrored from `phone_confirmed_at`, never written by the client |
| `profile_photo_link` | path in the `avatars` bucket (`<user id>/avatar.webp`), not a full URL |
| `profile_status` | `active` (default), `suspended`, `deactivated`; whether the account may use the app |
| `created_at`, `updated_at`, `updated_by` | set by a trigger, not the client |

`created_by` and a per-row `update_action` are deliberately omitted: `created_by` always equals `id`, and a single action column would lose history.

### `audit_log`

`id`, `table_name`, `row_id`, `action`, `actor_id`, `old_values`, `new_values`, `created_at`. Written by a trigger on `profiles` now; later tables can reuse it. Admins can read it. Nobody can write to it through the API.

### Roles

- A trigger writes `role` into `app_metadata` on insert and on role change.
- Vendors sign up through `/auth/vendor`. After email confirmation (or the Google return), `/auth/vendor/complete` calls the database function `claim_vendor_role()`. It is a security-definer function that upgrades only `traveler` to `vendor` for the calling user, is idempotent, and never touches `admin`. It is the only app path that changes a role, and sign-up metadata is never trusted for roles.
- Client updates to `profiles` are limited by column grants to `first_name`, `last_name` and `profile_photo_link`, so `role`, phone fields and `profile_status` cannot be written by the client.

### RLS

- `profiles`: users read their own row and update only `first_name`, `last_name` and `profile_photo_link`. Admins read all rows. `role`, phone fields and `profile_status` are changed only by SQL, the verified phone flow or admin tooling.
- `audit_log`: admin read only; no client writes.
- Storage bucket `avatars`: public read; a user can write and delete only inside their own `<user id>/` folder.

## Sessions and routes

`src/lib/supabase/`: `client.ts` (browser, client components only), `server.ts` (cookie-based, for server components, actions and route handlers), `proxy.ts` (session refresh logic, called from `src/proxy.ts`). Keys: `NEXT_PUBLIC_SUPABASE_URL` and the publishable key in `.env.local`. The service-role key is not used.

Under Cache Components, code reading cookies is dynamic and sits inside `<Suspense>`. The header account menu is a client component fed by a small provider, so the landing page stays static.

### Guards (`src/proxy.ts`)

| Path | Requires |
| --- | --- |
| `/profile`, `/plan/checkout` | signed in |
| `/plan/checkout` | verified phone; otherwise phone step, then back |
| `/vendor/*` | role `vendor` or `admin` |
| `/admin/*` | role `admin` |
| `/auth/*` | redirects signed-in users away, except `reset-password`, `confirm`, `callback` |

Guests go to `/auth/sign-in?next=<path>`. A wrong role gets a 403 page. `next` must be a same-site relative path or it is dropped. The guard decision is a pure function of role, path and phone state so it can be unit tested.

### Auth routes under `/auth`

`sign-in`, `sign-up`, `vendor`, `forgot-password`, `reset-password`, `confirm` (email-link handler), `callback` (Google return), `error`, and a phone step.

## Screens

- The added shadcn `LoginForm` and `SignupForm` move to `src/components/auth/` and are mounted at `/auth/sign-in` and `/auth/sign-up`. The `/login` and `/signup` pages are removed. Keep the two-column layout; replace "Acme Inc." with the YaadGuide logo and the placeholder image with a landing photo.
- GitHub buttons become Google on every auth form.
- Sign-up: first name and last name side by side, email, password, confirm password. No photo field. After submit: "Check your email".
- Vendor sign-up (`/auth/vendor`): the same form plus a required phone number, role `vendor`. After email confirmation: phone code step (send, 6-digit input, resend), then a vendor home page.
- Sign-in: email, password, Google, forgot-password link, sign-up link. Errors never reveal whether an email exists.
- Forgot password, reset password, check-your-email notice, phone code step, 403 page, header account menu (name and sign out).
- Profile page: name, email, phone with Verify or Change number (re-verification required), and photo upload and remove. The photo is asked for only after the user reaches their dashboard or profile, never during sign-up or phone steps.
- Controls are at least 44px tall below `md`.

## Errors

Server actions return `{ ok: false, error }` with friendly messages for wrong password, unconfirmed email, expired links, a wrong or expired phone code, and rate limits. Failed auth callbacks go to `/auth/error?reason=…` with a link back to sign-in.

## Testing

- Vitest unit tests: zod schemas, `next` path validator, pure guard function.
- SQL (triggers, RLS) is exercised once against a local or branch database with queries as different roles. It is not run against the hosted project without approval.
- One `lint`, `typecheck` and `build` at the end. No browser passes unless requested.

## Setup (owner, dashboard)

- Hosted project: turn on Confirm email; set Site URL and redirect URLs; Google provider enabled (done).
- Phone: enable the Phone provider in the dashboard and add test phone numbers with fixed codes; real SMS waits until a provider is chosen.
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (rename the existing `SUPABASE_ANON_KEY`, which the browser cannot read).

## Launch checklist (not built now)

- Publish the Google consent screen and add a privacy policy page.
- Choose an SMS provider.
- Add the production domain to Supabase redirect URLs and Google JavaScript origins.
- Grant admin by SQL.

## Out of scope

Vendor profiles, documents, geopoint pins, admin approval, trips table and draft persistence to the database.
