# Auth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Travelers and vendors can sign up and sign in (email/password or Google), confirm email, reset passwords and verify a phone number, with roles enforced in the database and at the route level.

**Architecture:** Supabase Auth with `@supabase/ssr` cookie sessions. A `proxy.ts` refreshes the session and applies a pure `decideAccess` guard. Roles and profile data live in `profiles` (RLS, column grants, audit trigger). Forms use react-hook-form with zod schemas shared with server actions. Phone verification uses Supabase's phone-change flow.

**Tech Stack:** Next.js 16.4 (Cache Components, `proxy.ts`), React 19, `@supabase/ssr`, `@supabase/supabase-js`, zod 4, react-hook-form, shadcn/ui (Base UI), Vitest, Supabase CLI/pgTAP.

**Spec:** `docs/superpowers/specs/2026-11-06-auth-foundation-design.md`

## Global Constraints

- Supabase project URL: `https://hxhgbwatfosmnjadfukk.supabase.co`. Env names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The service-role key is never used or committed.
- TypeScript `strict`; `@/*` alias; server components by default; `"use client"` only where needed.
- Roles are `traveler` (default), `vendor`, `admin`. `admin` is assigned by SQL only. Sign-up metadata is never trusted for roles.
- Every form uses react-hook-form + a zod schema in `src/lib/schemas/`; its server action re-validates with the same schema.
- Controls are at least 44px tall below `md`; use the shared components.
- Server code reads claims with `getClaims()`; `getUser()` only before sensitive changes (password, phone).
- Code reading cookies is dynamic and sits inside `<Suspense>`; the landing page stays static.
- Every Supabase table has RLS. Migrations are not applied to the hosted project without the owner's go-ahead.
- Errors never reveal whether an email is registered. `next` must be a same-site relative path or it is dropped.
- No photo field at sign-up or on the phone step; the photo is asked for only on the profile page.
- Before writing proxy code, read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- Test: run only the named test files per task; one `lint`, `typecheck` and `build` in the last task; no browser or dev-server runs.
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Work on branch `feat/auth-foundation`.

## Review Focus

- `next` values such as `//evil.com`, `/\evil.com`, `https://x.com`, `javascript:alert(1)`, encoded slashes: all fall back to `/` (Task 2).
- A signed-in user whose token has no or an unknown role is treated as `traveler`, never as an error or as `admin` (Task 2).
- Phone numbers typed as `876 555 1234`, `(876) 555-1234`, `+1 876 555 1234`, `18765551234`: normalized to E.164 `+18765551234`; `555` and letters are rejected (Task 3).
- Names such as `O'Brien`, `Anne-Marie`, `Élodie` are accepted; whitespace-only and digits-only names are rejected (Task 3).
- `claim_vendor_role()` called twice, or by an admin, leaves the role unchanged for admins and `vendor` for vendors; it cannot produce `admin` (Task 4).

## File Structure

- `src/lib/supabase/{env,client,server,proxy-session}.ts`: Supabase wiring.
- `src/lib/auth/{next-path,guard,viewer,errors,actions,phone-actions,profile-actions}.ts`: auth logic and server actions.
- `src/lib/schemas/auth.ts`: zod schemas.
- `src/proxy.ts`: session refresh and guards.
- `src/components/auth/*`: forms, OTP step, account menu.
- `src/app/auth/{sign-in,sign-up,vendor,forgot-password,reset-password,phone,check-email,error,forbidden}/page.tsx`, `src/app/auth/{confirm,callback}/route.ts`, `src/app/auth/vendor/complete/route.ts`.
- `src/app/{vendor,profile}/page.tsx`.
- `supabase/migrations/*.sql`, `supabase/tests/auth_foundation.test.sql`.

---

### Task 1: Dependencies, env and Supabase clients

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/lib/supabase/env.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/proxy-session.ts`, `.env.example`
- Test: `src/lib/supabase/env.test.ts`

**Interfaces:**
- Produces: `getSupabaseEnv(source?: Record<string, string | undefined>): { url: string; publishableKey: string }` (throws `Error` naming the missing variable); `createClient(): SupabaseClient` in `client.ts`; `createClient(): Promise<SupabaseClient>` in `server.ts`; `updateSession(request: NextRequest): Promise<{ response: NextResponse; claims: Record<string, unknown> | null }>`.

- [ ] **Step 1: Write failing test** `env.test.ts`: returns `{url, publishableKey}` for a complete source; throws with `NEXT_PUBLIC_SUPABASE_URL` in the message when the URL is missing; throws naming `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` when the key is missing or empty.
- [ ] **Step 2: Run** `npx vitest run src/lib/supabase/env.test.ts -q`. Expected: FAIL (module missing).
- [ ] **Step 3: Install** `npm install @supabase/supabase-js @supabase/ssr --quiet`; implement `env.ts`. Its default `source` must reference `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` literally (Next only inlines literal references).
- [ ] **Step 4: Implement** `client.ts` (`createBrowserClient`), `server.ts` (`createServerClient` with `cookies()` from `next/headers`, `setAll` wrapped in try/catch because server components cannot set cookies), `proxy-session.ts` (create a server client bound to the request/response cookies, call `supabase.auth.getClaims()`, return the response and `claims?.claims ?? null`), and `.env.example` with the two names and no values.
- [ ] **Step 5: Run** the test again. Expected: PASS.
- [ ] **Step 6: Commit** `feat(auth): add supabase clients and env validation`.

### Task 2: Route guard and safe `next` path

**Files:**
- Create: `src/lib/auth/next-path.ts`, `src/lib/auth/guard.ts`, `src/lib/auth/viewer.ts`
- Test: `src/lib/auth/next-path.test.ts`, `src/lib/auth/guard.test.ts`, `src/lib/auth/viewer.test.ts`

**Interfaces:**
- Produces: `safeNextPath(value: string | null | undefined, fallback?: string): string`; `type Role = "traveler" | "vendor" | "admin"`; `type Viewer = { signedIn: boolean; role: Role; phoneVerified: boolean }`; `type Decision = { type: "allow" } | { type: "redirect"; to: string } | { type: "forbidden" }`; `decideAccess(pathname: string, viewer: Viewer, search?: string): Decision`; `getViewer(claims: Record<string, unknown> | null): Viewer`.

- [ ] **Step 1: Write failing tests.**
  - `next-path`: `/plan` and `/plan?x=1` pass; `//evil.com`, `/\evil.com`, `https://x.com`, `javascript:alert(1)`, `%2F%2Fevil.com`, empty, null, and a path containing a newline return the fallback `/`.
  - `viewer`: `null` claims give `{signedIn:false, role:"traveler", phoneVerified:false}`; claims with `app_metadata.role` `vendor` give role `vendor`; unknown or missing role gives `traveler` (never `admin`); a truthy `phone` claim gives `phoneVerified: true`.
  - `guard` (table-driven): guest on `/profile` → redirect `/auth/sign-in?next=%2Fprofile`; guest on `/plan/checkout` → sign-in; signed-in traveler without verified phone on `/plan/checkout` → redirect `/auth/phone?next=%2Fplan%2Fcheckout`; with verified phone → allow; traveler on `/vendor` → forbidden; vendor and admin on `/vendor` → allow; vendor on `/admin` → forbidden; admin on `/admin` → allow; signed-in on `/auth/sign-in?next=/plan` → redirect to `/plan`; signed-in on `/auth/reset-password`, `/auth/confirm`, `/auth/callback`, `/auth/phone`, `/auth/forbidden`, `/auth/error` → allow; guest on `/auth/sign-in`, `/` and `/plan` → allow; guest on `/vendor/anything` → sign-in redirect.
- [ ] **Step 2: Run** `npx vitest run src/lib/auth -q`. Expected: FAIL.
- [ ] **Step 3: Implement** the three modules. `safeNextPath` accepts only strings that start with a single `/`, contain no `\`, control characters or `//` after decoding, and fall back otherwise. Guard rules are those in the spec's Guards table.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(auth): add route guard and safe next-path`.

### Task 3: Auth zod schemas

**Files:**
- Create: `src/lib/schemas/auth.ts`
- Test: `src/lib/schemas/auth.test.ts`

**Interfaces:**
- Produces: `passwordSchema`, `nameSchema`, `phoneSchema` (transforms to E.164 string), `signUpSchema {firstName,lastName,email,password,confirmPassword}`, `vendorSignUpSchema` (signUp + `phone`), `signInSchema {email,password}`, `forgotPasswordSchema {email}`, `resetPasswordSchema {password,confirmPassword}`, `phoneNumberSchema {phone}`, `phoneOtpSchema {code}`, `profileSchema {firstName,lastName}`, and inferred types `SignUpInput`, `VendorSignUpInput`, `SignInInput`, `ForgotPasswordInput`, `ResetPasswordInput`, `PhoneNumberInput`, `PhoneOtpInput`, `ProfileInput`.

- [ ] **Step 1: Write failing tests.**
  - Password: 7 chars rejected, 8 accepted. Mismatched `confirmPassword` fails with the issue on `confirmPassword`.
  - Names: `O'Brien`, `Anne-Marie`, `Élodie` accepted and trimmed; `"   "`, `"123"`, a 61-char name rejected.
  - Phone: `876 555 1234`, `(876) 555-1234`, `+1 876 555 1234`, `18765551234` all parse to `+18765551234`; `555`, `abc`, `+0123` rejected.
  - OTP: `123456` accepted; `12345`, `1234567`, `12345a` rejected.
  - Email is trimmed and lowercased.
- [ ] **Step 2: Run** `npx vitest run src/lib/schemas/auth.test.ts -q`. Expected: FAIL.
- [ ] **Step 3: Implement** with zod 4. Name regex `^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$` with `u`. Phone: strip spaces, dashes, dots and parentheses; a bare 10-digit number gets `+1`; an 11-digit number starting with `1` gets `+`; result must match `^\+[1-9]\d{7,14}$`.
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `feat(auth): add auth zod schemas`.

### Task 4: Database migrations and pgTAP tests

**Files:**
- Create: `supabase/migrations/20261106000100_profiles.sql`, `supabase/migrations/20261106000200_audit_log.sql`, `supabase/migrations/20261106000300_avatars_storage.sql`, `supabase/tests/auth_foundation.test.sql`
- Track: the existing untracked `supabase/config.toml`.

**Interfaces:**
- Produces (SQL): table `public.profiles` with the columns in the spec; `public.claim_vendor_role() returns text`; table `public.audit_log`; bucket `avatars`.

- [ ] **Step 1: Write the pgTAP test** covering: inserting an `auth.users` row creates a profile with role `traveler`, names from `raw_user_meta_data` (`first_name`/`last_name`, falling back to Google's `given_name`/`family_name`, then splitting `full_name`/`name`), and `app_metadata.role = 'traveler'`; as `authenticated`, updating `first_name` succeeds and updating `role`, `phone`, `phone_verified_at` or `profile_status` raises a permission error; `claim_vendor_role()` turns `traveler` into `vendor` and the JWT-facing `app_metadata.role` follows; a second call is a no-op; for an `admin` user it returns `admin` and changes nothing; updating `auth.users.phone` and `phone_confirmed_at` mirrors to `profiles.phone` and `phone_verified_at`; a profile update writes an `audit_log` row with old and new values and `actor_id`; a non-admin selecting from `audit_log` sees zero rows and cannot insert; a user can read their own profile only, an admin can read all; the `avatars` write policy allows only the user's own folder.
- [ ] **Step 2: Run** `npx supabase test db`. Expected: FAIL (objects missing). Needs the Supabase CLI and Docker; if either is unavailable, mark the SQL "unverified" in the final report rather than skipping the tests' creation.
- [ ] **Step 3: Write `profiles.sql`:** the table with check constraints for `role` and `profile_status`; `handle_new_user()` (security definer, `set search_path = ''`) trigger on `auth.users` after insert, which also writes `role` into `raw_app_meta_data`; `sync_profile_phone()` trigger after update of `phone, phone_confirmed_at` on `auth.users`; `set_updated_fields()` before-update trigger setting `updated_at = now()` and `updated_by = auth.uid()`; `claim_vendor_role()` (security definer, updates the profile and `auth.users.raw_app_meta_data` only where `role = 'traveler'`, returns the resulting role, executable by `authenticated` only); RLS enabled; policies for own-row select, admin select-all (role read from `auth.jwt() -> 'app_metadata' ->> 'role'`), own-row update; `revoke update on public.profiles from anon, authenticated` then `grant update (first_name, last_name, profile_photo_link) on public.profiles to authenticated`.
- [ ] **Step 4: Write `audit_log.sql`:** the table, RLS enabled, `revoke all` from `anon, authenticated` then `grant select to authenticated` with an admin-only select policy, and a security-definer trigger function `audit_row_change()` attached to `public.profiles` for insert, update and delete, recording `to_jsonb(old)`/`to_jsonb(new)` and `auth.uid()`.
- [ ] **Step 5: Write `avatars_storage.sql`:** bucket `avatars` (public, 2 MB limit, `image/webp`, `image/jpeg`, `image/png`) and insert, update, delete policies on `storage.objects` requiring `bucket_id = 'avatars'` and `(storage.foldername(name))[1] = auth.uid()::text`.
- [ ] **Step 6: Run** `npx supabase test db`. Expected: all tests PASS (or reported unverified as in step 2).
- [ ] **Step 7: Commit** `feat(db): add profiles, audit log and avatar storage migrations`. Do not run `db push`; the owner applies migrations to the hosted project after review.

### Task 5: Proxy and system pages

**Files:**
- Create: `src/proxy.ts`, `src/app/auth/forbidden/page.tsx`, `src/app/auth/error/page.tsx`, `src/app/auth/check-email/page.tsx`

**Interfaces:**
- Consumes: `updateSession` (Task 1), `getViewer`, `decideAccess` (Task 2).
- Produces: `proxy(request: NextRequest): Promise<NextResponse>`; `config.matcher` excluding `_next/static`, `_next/image`, `favicon.ico` and static asset extensions.

- [ ] **Step 1: Implement `proxy`:** call `updateSession`, build the viewer, call `decideAccess(pathname, viewer, search)`; on `redirect` return `NextResponse.redirect` carrying the refreshed session cookies; on `forbidden` return a rewrite to `/auth/forbidden` with status 403 (also carrying cookies); on `allow` return the session response.
- [ ] **Step 2: Implement the three pages** (server components, same card layout as other pages): 403 with a link home; error showing a message chosen from a fixed map by `reason` and a link to `/auth/sign-in`; check-email telling the user to open the link they were sent.
- [ ] **Step 3: Verify** `npx tsc --noEmit -p . --pretty false`. Expected: no errors in the new files.
- [ ] **Step 4: Commit** `feat(auth): add proxy guard and system pages`.

### Task 6: Server actions and auth route handlers

**Files:**
- Create: `src/lib/auth/errors.ts`, `src/lib/auth/actions.ts`, `src/app/auth/confirm/route.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/vendor/complete/route.ts`
- Test: `src/lib/auth/errors.test.ts`

**Interfaces:**
- Produces: `toAuthMessage(error: { code?: string; message?: string } | null | undefined): string`; `type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; fieldErrors?: Record<string, string> }`; server actions in `actions.ts`: `signUpAction(input: unknown, next?: string): Promise<ActionResult>`, `vendorSignUpAction(input: unknown): Promise<ActionResult>`, `signInAction(input: unknown, next?: string): Promise<ActionResult>`, `signOutAction(): Promise<void>`, `forgotPasswordAction(input: unknown): Promise<ActionResult>`, `resetPasswordAction(input: unknown): Promise<ActionResult>`, `signInWithGoogleAction(next?: string, intent?: "vendor"): Promise<void>` (redirects).

- [ ] **Step 1: Write failing test** `errors.test.ts`: `invalid_credentials` and `user_not_found` return the identical generic message; `email_not_confirmed` returns a "confirm your email" message; `otp_expired` and `invalid_otp`/`sms_otp_invalid` return code-specific messages; `over_request_rate_limit` returns a try-again-later message; unknown codes and `null` return a generic message that includes no raw error text.
- [ ] **Step 2: Run** `npx vitest run src/lib/auth/errors.test.ts -q`. Expected: FAIL.
- [ ] **Step 3: Implement `errors.ts`, then the actions.** Each action parses with the Task 3 schema first (returning `fieldErrors` on failure) and maps Supabase errors through `toAuthMessage`. Email sign-up passes `options.data` `{first_name, last_name}` and `emailRedirectTo` of `<origin>/auth/confirm?next=<safeNextPath>`; vendor sign-up also passes `{pending_phone}` and sets `next` to `/auth/vendor/complete`. Sign-up for an already-registered email returns the same "check your email" success as a new one. Google uses `signInWithOAuth({provider:"google"})` with `redirectTo` of `<origin>/auth/callback?next=…` (vendor intent sets `next` to `/auth/vendor/complete`) and `redirect()`s to the returned URL. Compute the origin from request headers, never from user input.
- [ ] **Step 4: Implement the route handlers.** `confirm`: `verifyOtp({type, token_hash})` from the query, then redirect to `safeNextPath(next)`, or to `/auth/error?reason=confirm` on failure. `callback`: `exchangeCodeForSession(code)` then the same redirect, or `/auth/error?reason=oauth`. `vendor/complete`: requires a session, calls `supabase.rpc("claim_vendor_role")`, then redirects to `/auth/phone?next=/vendor`; on failure `/auth/error?reason=vendor`.
- [ ] **Step 5: Run** the errors test. Expected: PASS.
- [ ] **Step 6: Commit** `feat(auth): add server actions and auth route handlers`.

### Task 7: Auth screens

**Files:**
- Create: `src/components/auth/auth-shell.tsx`, `src/components/auth/login-form.tsx`, `src/components/auth/signup-form.tsx`, `src/components/auth/vendor-signup-form.tsx`, `src/components/auth/forgot-password-form.tsx`, `src/components/auth/reset-password-form.tsx`, `src/components/auth/google-button.tsx`
- Modify: `src/app/auth/sign-in/page.tsx`, `src/app/auth/vendor/page.tsx`
- Create: `src/app/auth/sign-up/page.tsx`, `src/app/auth/forgot-password/page.tsx`, `src/app/auth/reset-password/page.tsx`
- Delete: `src/app/login/`, `src/app/signup/`, `src/components/login-form.tsx`, `src/components/signup-form.tsx` (untracked files the owner added; their markup moves into the new components).

**Interfaces:**
- Consumes: Task 3 schemas and Task 6 actions.
- Produces: `AuthShell({children}): JSX` (the two-column layout with the YaadGuide logo and a landing photo from `public/landing/`); form components taking optional `next?: string`.

- [ ] **Step 1: Build the components** from the owner's shadcn forms: keep the markup and `Field` structure, import `cn` from `@/lib/utils`, wire react-hook-form with `zodResolver` and the Task 3 schemas, show field errors with `FieldError`, disable the submit button while pending, replace the GitHub button and icon with a Google button (`signInWithGoogleAction`). Sign-up splits the name into First name and Last name side by side. The vendor form adds a required phone field. Sign-in has the forgot-password and sign-up links. Success states show "Check your email" via `/auth/check-email`.
- [ ] **Step 2: Build the pages.** Read `next` from `searchParams`, pass it through `safeNextPath`. Pages that read `searchParams` render their form inside `<Suspense>`. Remove the old `/login`, `/signup` routes and any links to them.
- [ ] **Step 3: Verify** `npx tsc --noEmit -p . --pretty false` and `npx eslint src/components/auth src/app/auth --quiet`. Expected: clean.
- [ ] **Step 4: Commit** `feat(auth): add sign-in, sign-up, vendor and password-reset screens`.

### Task 8: Phone verification

**Files:**
- Create: `src/lib/auth/phone-actions.ts`, `src/components/auth/phone-form.tsx`, `src/app/auth/phone/page.tsx`, `src/components/ui/input-otp.tsx` (via CLI)

**Interfaces:**
- Consumes: `phoneNumberSchema`, `phoneOtpSchema`, `toAuthMessage`.
- Produces: `sendPhoneCodeAction(input: unknown): Promise<ActionResult>` and `verifyPhoneCodeAction(input: unknown): Promise<ActionResult>`.

- [ ] **Step 1: Add the component** with `npx shadcn@latest add input-otp` (CLI, not by hand).
- [ ] **Step 2: Implement the actions.** Both require a session and call `getUser()` first. `sendPhoneCodeAction`: validate, `supabase.auth.updateUser({ phone })`. `verifyPhoneCodeAction`: validate, `supabase.auth.verifyOtp({ phone, token, type: "phone_change" })`, then `supabase.auth.refreshSession()` so the new `phone` claim reaches the token.
- [ ] **Step 3: Build the phone step.** It prefills the number from `user_metadata.pending_phone` when present, sends a code, shows a 6-digit OTP input with a resend button on a 30-second cooldown, then redirects to `safeNextPath(next)`. No photo field.
- [ ] **Step 4: Verify** typecheck and eslint on the touched paths. Expected: clean.
- [ ] **Step 5: Commit** `feat(auth): add phone verification step`.

### Task 9: Account menu and vendor home

**Files:**
- Modify: the landing header component that links to `/auth/sign-in` (find it with a search of `src/components/landing/`)
- Create: `src/components/auth/account-menu.tsx`, `src/components/auth/auth-provider.tsx`, `src/app/vendor/page.tsx`

**Interfaces:**
- Produces: `AuthProvider({initial, children})` exposing `useViewer(): { signedIn: boolean; firstName: string | null; email: string | null }`; `AccountMenu(): JSX`.

- [ ] **Step 1: Implement** the provider so the layout fetches the viewer in a server component wrapped in `<Suspense>` with a static fallback; the landing page itself stays static. `AccountMenu` shows a Sign in link for guests, and for signed-in users an avatar dropdown with name, Profile, and Sign out (`signOutAction`).
- [ ] **Step 2: Create `/vendor`:** a short vendor home page saying business details and documents are coming next, with a profile link. Guarded by the proxy.
- [ ] **Step 3: Verify** typecheck and eslint on the touched paths.
- [ ] **Step 4: Commit** `feat(auth): add account menu and vendor home`.

### Task 10: Profile page

**Files:**
- Create: `src/lib/auth/profile-actions.ts`, `src/components/auth/profile-form.tsx`, `src/components/auth/avatar-upload.tsx`, `src/app/profile/page.tsx`

**Interfaces:**
- Produces: `updateProfileAction(input: unknown): Promise<ActionResult>` (uses `profileSchema`); `updateProfilePhotoAction(path: string | null): Promise<ActionResult>`.

- [ ] **Step 1: Implement the actions.** `updateProfilePhotoAction` accepts only `null` or a path equal to `<current user id>/avatar.<webp|jpg|png>` and updates `profile_photo_link`.
- [ ] **Step 2: Build the page** (dynamic content inside `<Suspense>`): name form; email read-only; phone with a "Verify" or "Change number" link to `/auth/phone?next=/profile` (changing the number always re-verifies); avatar upload and remove, uploading from the browser client to `avatars/<user id>/avatar.<ext>` with a client-side 2 MB and type check, then calling `updateProfilePhotoAction`. The public URL is built from the stored path.
- [ ] **Step 3: Verify** typecheck and eslint on the touched paths.
- [ ] **Step 4: Commit** `feat(auth): add profile page`.

### Task 11: Docs and final verification

**Files:**
- Modify: `ARCHITECTURE.md` (Auth section), `ARCHITECTURE-ESSENTIAL.md` (mirror), `README.md` (env setup and routes)

- [ ] **Step 1: Update `ARCHITECTURE.md` > Auth** with: `profiles` table and columns, `claim_vendor_role()`, column grants, `audit_log`, the proxy guards, phone verification via the phone-change flow, and env names. Update `ARCHITECTURE-ESSENTIAL.md` in the same change with only facts present in `ARCHITECTURE.md`. Add the setup steps (env names, Confirm email, Phone provider and test numbers, redirect URLs) to `README.md`.
- [ ] **Step 2: Run once:** `npm run lint --silent`, `npm run typecheck --silent`, `npm run test -- --reporter=dot`, `npm run build --silent`. Expected: all pass. Report anything that fails with its output; report SQL tests as verified or unverified.
- [ ] **Step 3: Commit** `docs: document auth foundation`.
- [ ] **Step 4: Hand off to the owner:** apply migrations to the hosted project after reviewing them, rename `SUPABASE_ANON_KEY` to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, turn on Confirm email, enable the Phone provider with test numbers, and add the redirect URLs.
