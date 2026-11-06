# Account settings: design

Date: 2026-11-06. Status: awaiting review. Builds on `2026-11-06-auth-foundation-design.md` and `2026-11-06-vendor-onboarding-design.md`.

## Goal

A signed-in person can manage their account in one place: personal info, security, notification preferences, and deleting the account. Deleting archives the account for seven days (restorable by signing in), then removes it permanently.

## Decisions (from the brainstorm)

- Settings is its own area with a page per section (`/settings/personal`, `/settings/security`, `/settings/notifications`). `/profile` redirects to Personal.
- Notification preferences are stored now. Nothing is sent yet; each feature honors them when it starts sending.
- Security covers: change password, change email, sign-in methods, sign out other devices, delete account. Two-factor sign-in and adding Google to an email account are out of scope.
- Delete account is an archive. Everything linked stays for seven days and is then deleted. A person who signs in during those days is offered a restore. Archived accounts are hidden from travelers at once.
- Notification channels are email and SMS per category.
- Vendor and admin dashboards are not part of this piece: they wait for listings, bookings and payouts.
- The permanent-deletion job is the one place the Supabase service-role key is used, server-side only.

## Routes and layout

- `/settings` redirects to `/settings/personal`. `/profile` redirects to `/settings/personal`.
- A shared layout shows a left-aligned heading and a section list (links with `aria-current`, 44px targets): a side list from `md` up, a list above the content below it.
- **Personal:** the existing profile form, photo upload and phone block, moved without changes.
- **Security:** sign-in methods, change password, change email, sign out other devices, and a Delete account section at the bottom.
- **Notifications:** a table of categories with an Email and an SMS switch per row.
- `/auth/restore`: shown to an archived person after sign-in. `/auth/archived`: shown right after deleting.
- Styling follows `DESIGN.md`: sentence case, left aligned, labels above inputs, errors beside fields, status with icon and text, one decision per screen on mobile, controls at least 44px tall below `md`, native date and standard shadcn controls only.

## Data model

All changes are in new migrations; applied migrations are not edited.

**`profiles`**
- `profile_status` gains `archived`. New column `archived_at timestamptz` (null unless archived).
- A trigger copies `archived` (true when the status is `archived`) into `auth.users.raw_app_meta_data` like the role, so the proxy can see it in the token.
- Clients still cannot write these columns. Archive and restore go through functions.

**`notification_preferences`**
- `account_id`, `category`, `channel` (`email`, `sms`), `enabled`; primary key (`account_id`, `category`, `channel`); authoring columns.
- Categories: `account_security`, `bookings`, `vendor_review`, `document_expiry`, `offers`. Defaults live in code: on for the first four, off for `offers`. A missing row means the default.
- A check constraint keeps (`account_security`, `email`) from being stored as disabled.
- Row-level security: a person reads and writes only their own rows. The `enabled` column is the only writable column on update; insert sets account, category, channel and enabled.

**Functions** (security definer, `search_path = ''`, execute for `authenticated` only unless noted, revoked from `public` and `anon`):
- `archive_account()`: caller only, only from `active`. Sets `archived` and `archived_at`.
- `restore_account()`: caller only, only from `archived`. Sets `active` and clears `archived_at`.
- `account_is_active(p_account_id uuid) returns boolean`: true unless the account is archived. The rule for any future listing policy.
- `accounts_due_for_purge(p_older_than interval)`: returns ids of archived accounts older than the interval. Callable by `service_role` only.
- `scrub_audit_for_account(p_account_id uuid)`: blanks personal values (names, phone, business name, file paths) in `audit_log` rows about that account's rows. `service_role` only.

**Permissions:** no new admin permission. Account functions act on the caller only.

## Flows

- **Change password** (`changePasswordAction`): verifies the user with the server. For an account with a password identity, checks the current password by signing in with it; a wrong one is a field error. Then `updateUser({ password })` and signs out other devices. A Google-only account shows "Set a password" without the current-password field.
- **Change email** (`changeEmailAction`): `updateUser({ email })` with the confirm redirect. The page shows the pending new address until it is confirmed; the old address works until then.
- **Sign-in methods:** read from the user's identities. Read-only.
- **Sign out other devices** (`signOutOthersAction`): `signOut({ scope: "others" })`.
- **Delete account** (`archiveAccountAction`): input is the word DELETE and, for an account with a password, the password. Calls `archive_account()`, signs out everywhere (`scope: "global"`), redirects to `/auth/archived` with the deletion date.
- **Restore** (`restoreAccountAction`): calls `restore_account()` and refreshes the session so the token flag clears; **Keep deleting** signs out.
- **Notifications** (`savePreferenceAction`): saves one switch on change. SMS switches are disabled unless the phone is verified. Vendor-only categories (`vendor_review`, `document_expiry`) are hidden for travelers.
- **Routing:** `decideAccess` gains an `archived` viewer flag. An archived person can reach only `/auth/restore`, the sign-out action and static assets; every other path redirects to `/auth/restore`.
- **Purge** (`GET /api/cron/purge-archived`, scheduled daily by Vercel): requires `Authorization: Bearer ${CRON_SECRET}` (constant-time compare); a missing `CRON_SECRET` refuses every request. With the service-role client it calls `accounts_due_for_purge('7 days')`; for each account it re-reads that the account is still archived and past seven days, calls `scrub_audit_for_account`, removes the account's files in `avatars` and `vendor-documents` through the storage API, then deletes the auth user (cascading profile, vendor profiles, vehicles, documents, preferences). One account's failure is logged and does not stop the others; the next run retries it.

## Security

- The service-role key is read only by the purge route, from a server-only environment variable (`SUPABASE_SERVICE_ROLE_KEY`), never exposed to the client and never committed. `.env.example` lists the names only.
- Password, email, delete and restore actions verify the user with `getUser()`. Rate-limit errors reuse the sign-in message.
- Archived accounts are excluded from anything public through `account_is_active`.
- Audit rows keep ids for traceability; personal values are scrubbed at purge.

## Errors and edge cases

- A restore after seven days is impossible: the account is gone and sign-in fails like an unknown account.
- A restore and a purge racing: the purge re-checks status and age right before deleting and skips accounts no longer archived.
- Notification switches save on change, show a toast, and roll back with an error if the save fails. SMS preferences stay stored while the phone is unverified but are disabled in the UI.
- Deleting is blocked for an account with future confirmed bookings. That rule is added with bookings; it is not built now.
- A purge failure after the files were removed but before the user was deleted leaves an archived account without files; the next run finishes the deletion.

## Components and files

- Pure logic in `src/lib/settings/`: `notifications.ts` (categories, defaults, `resolvePreferences`, which categories a role sees), `archive.ts` (`purgeDeadline`, countdown text input).
- Schemas in `src/lib/schemas/settings.ts`: change password, change email, delete confirmation, preference.
- Actions in `src/lib/settings/actions.ts`; queries in `src/lib/settings/queries.ts` (identities, preferences, phone state).
- Components in `src/components/settings/` (section nav, password form, email form, methods list, sign-out-others button, delete dialog, preferences table) and `src/components/auth/restore-panel.tsx`.
- Routes: `src/app/settings/layout.tsx` and its three pages, `src/app/auth/restore/page.tsx`, `src/app/auth/archived/page.tsx`, `src/app/api/cron/purge-archived/route.ts`, `vercel.json` cron entry.
- `src/lib/auth/guard.ts` and `viewer.ts` learn the archived flag; `src/app/profile/page.tsx` becomes a redirect.
- Migrations: archive status and preferences, then the functions.

## Testing

- **pgTAP:** preference row-level security (own rows only; the locked row cannot be disabled; no writes to another person's rows); archive and restore (own account only, status and token flag follow, restore only while archived); `account_is_active`; `accounts_due_for_purge` not callable by app users and returns only accounts past the interval; audit scrubbing.
- **Vitest:** `decideAccess` for archived viewers; `resolvePreferences` and role visibility; the schemas; the settings actions with Supabase mocked; the cron route (no secret, wrong secret, missing environment variable, right secret deletes only due accounts, one failure does not stop the others).
- **By hand:** delete, sign in, restore; the cron route once with the secret; the Security forms.

## Out of scope

Two-factor sign-in, adding Google to an email account, data export, vendor and admin dashboards, sending any notification, the future-bookings block on deletion.
