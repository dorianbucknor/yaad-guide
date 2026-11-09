# YaadGuide auth emails

A matching set of Supabase auth emails in the YaadGuide brand. Each template below is a complete HTML email: paste the code block into the matching template in the Supabase dashboard (Authentication, Emails) and set the subject line shown above it.

## Design

- **Colors** (from `DESIGN.md`): header `#042E1C` with a white and `#FAC422` wordmark, page `#F4FAF7`, card white, text `#042E1C`, muted text `#46604F`, links `#0A7A49`, dividers `#BFDCCB`, code box `#E3F1EA`. The one yellow button is the call to action, as in the app.
- **Fonts**: Bricolage Grotesque for headings and Figtree for body, loaded from Google Fonts. Gmail and Outlook ignore web fonts, so the stack falls back to Trebuchet MS and Segoe UI.
- **Build**: table layout with inline styles, 560px wide, light only, with a hidden preheader line. The logo is a white PNG (`public/brand/logo-email.png`, rendered from `logo-white.svg` because email clients do not render SVG) served from `{{ .SiteURL }}/brand/logo-email.png`, next to the text wordmark. If images are blocked, the wordmark still identifies the sender. It only loads once the app is deployed at the Site URL; locally the 127.0.0.1 address is not reachable from a real inbox.

## How the links work

- Links go to the app's own `/auth/confirm` route using `{{ .TokenHash }}`. That route calls `verifyOtp` and then redirects to `next`. This works with the server-side session setup the app already uses.
- Supabase adds `{{ .SiteURL }}` from the project's Site URL. Set it to the real domain on the hosted project (local is `http://127.0.0.1:3000`).
- Security scanners can open a link before the person does and use up the token ("Token has expired or is invalid"). If that shows up, switch the link to a page that asks for a button press before it calls `verifyOtp`, or lead with the 6-digit `{{ .Token }}` code.
- Turn off click tracking in whichever mail provider sends these, since tracking rewrites the links.
- The footer and security emails mention `support@yaad-guide.com`. Change it if that is not the right address.

## Where to apply them

- **Hosted project:** Authentication, Emails, then each template. The seven security emails are only sent when the matching notification is switched on there.
- **Local (Mailpit):** save each block as `supabase/templates/<key>.html` and point `config.toml` at it, for example:

```toml
[auth.email.template.confirmation]
subject = "Confirm your YaadGuide account"
content_path = "./supabase/templates/confirmation.html"
```

Template keys in `config.toml`: `confirmation`, `invite`, `magic_link`, `email_change`, `recovery`, `reauthentication`. The security notifications are set on the hosted project's dashboard or through the management API (`mailer_subjects_*` and `mailer_templates_*_content`).

## Variables used

`{{ .ConfirmationURL }}` is not used, in favor of the token-hash link above. Others: `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .OldEmail }}`, `{{ .Phone }}`, `{{ .OldPhone }}`, `{{ .Provider }}`, `{{ .FactorType }}`.

Authentication emails are the first six. Security notifications are the last seven.

---

## Confirm sign up

- **Key:** `confirmation`
- **Subject:** `Confirm your YaadGuide account`
- **When:** Sent when someone signs up with email and password. Links to the app's `/auth/confirm` route.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Confirm your email</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F4FAF7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Confirm your email to start planning your Jamaica trip.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4FAF7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#042E1C;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="{{ .SiteURL }}/brand/logo-email.png" width="48" height="33" alt="" style="display:block;border:0;"></td>
<td><span style="font:700 24px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#FFFFFF;letter-spacing:-0.3px;">Yaad<span style="color:#FAC422;">Guide</span></span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 20px;border-left:1px solid #BFDCCB;border-right:1px solid #BFDCCB;">
<h1 style="margin:0 0 16px;font:700 26px/1.2 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#042E1C;">Confirm your email</h1>
<p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;">Welcome to YaadGuide. Confirm your email address to finish creating your account.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="background:#FAC422;border-radius:10px;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/" target="_blank" style="display:inline-block;padding:14px 28px;font:600 16px/1 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;text-decoration:none;">Confirm email</a></td></tr></table><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">Button not working? Paste this link into your browser:<br><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/" style="color:#0A7A49;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/</a></p><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">If you didn't sign up, you can ignore this email. No account will be activated.</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:0 32px 32px;border:1px solid #BFDCCB;border-top:0;border-radius:0 0 16px 16px;">
<hr style="border:0;border-top:1px solid #BFDCCB;margin:0 0 16px;">
<p style="margin:0;font:400 13px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">YaadGuide, your digital travel agent for Jamaica.<br>This message was sent to {{ .Email }}.<br>Questions? <a href="mailto:support@yaad-guide.com" style="color:#0A7A49;">support@yaad-guide.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
```

---

## Invite user

- **Key:** `invite`
- **Subject:** `You're invited to YaadGuide`
- **When:** Sent when an admin invites someone from the dashboard or API.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>You're invited</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F4FAF7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">You've been invited to join YaadGuide.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4FAF7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#042E1C;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="{{ .SiteURL }}/brand/logo-email.png" width="48" height="33" alt="" style="display:block;border:0;"></td>
<td><span style="font:700 24px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#FFFFFF;letter-spacing:-0.3px;">Yaad<span style="color:#FAC422;">Guide</span></span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 20px;border-left:1px solid #BFDCCB;border-right:1px solid #BFDCCB;">
<h1 style="margin:0 0 16px;font:700 26px/1.2 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#042E1C;">You're invited</h1>
<p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;">You've been invited to create a YaadGuide account. Accept the invite to choose a password and get started.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="background:#FAC422;border-radius:10px;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/" target="_blank" style="display:inline-block;padding:14px 28px;font:600 16px/1 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;text-decoration:none;">Accept invite</a></td></tr></table><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">Button not working? Paste this link into your browser:<br><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/" style="color:#0A7A49;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/</a></p><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">Weren't expecting this? You can ignore this email.</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:0 32px 32px;border:1px solid #BFDCCB;border-top:0;border-radius:0 0 16px 16px;">
<hr style="border:0;border-top:1px solid #BFDCCB;margin:0 0 16px;">
<p style="margin:0;font:400 13px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">YaadGuide, your digital travel agent for Jamaica.<br>This message was sent to {{ .Email }}.<br>Questions? <a href="mailto:support@yaad-guide.com" style="color:#0A7A49;">support@yaad-guide.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
```

---

## Magic link

- **Key:** `magic_link`
- **Subject:** `Your YaadGuide sign-in link`
- **When:** Sent for passwordless sign-in. Includes both a link and the 6-digit code, so users can use either.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Sign in to YaadGuide</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F4FAF7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Use this link or code to sign in to YaadGuide.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4FAF7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#042E1C;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="{{ .SiteURL }}/brand/logo-email.png" width="48" height="33" alt="" style="display:block;border:0;"></td>
<td><span style="font:700 24px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#FFFFFF;letter-spacing:-0.3px;">Yaad<span style="color:#FAC422;">Guide</span></span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 20px;border-left:1px solid #BFDCCB;border-right:1px solid #BFDCCB;">
<h1 style="margin:0 0 16px;font:700 26px/1.2 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#042E1C;">Sign in to YaadGuide</h1>
<p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;">Select the button to sign in. The link works once and expires soon.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="background:#FAC422;border-radius:10px;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/" target="_blank" style="display:inline-block;padding:14px 28px;font:600 16px/1 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;text-decoration:none;">Sign in</a></td></tr></table><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">Button not working? Paste this link into your browser:<br><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/" style="color:#0A7A49;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/</a></p><p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;">Or enter this code on the sign-in page:</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 24px;"><tr><td align="center" style="background:#E3F1EA;border-radius:10px;padding:18px;font:700 32px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;letter-spacing:10px;color:#042E1C;">{{ .Token }}</td></tr></table><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">If you didn't ask to sign in, ignore this email. Nobody can sign in without this link or code.</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:0 32px 32px;border:1px solid #BFDCCB;border-top:0;border-radius:0 0 16px 16px;">
<hr style="border:0;border-top:1px solid #BFDCCB;margin:0 0 16px;">
<p style="margin:0;font:400 13px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">YaadGuide, your digital travel agent for Jamaica.<br>This message was sent to {{ .Email }}.<br>Questions? <a href="mailto:support@yaad-guide.com" style="color:#0A7A49;">support@yaad-guide.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
```

---

## Change email address

- **Key:** `email_change`
- **Subject:** `Confirm your new YaadGuide email`
- **When:** Sent to the address being changed to. Supports `{{ .NewEmail }}`. With secure email change on, Supabase sends one to the old and one to the new address.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Confirm your new email</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F4FAF7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Confirm the change to your YaadGuide email address.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4FAF7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#042E1C;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="{{ .SiteURL }}/brand/logo-email.png" width="48" height="33" alt="" style="display:block;border:0;"></td>
<td><span style="font:700 24px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#FFFFFF;letter-spacing:-0.3px;">Yaad<span style="color:#FAC422;">Guide</span></span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 20px;border-left:1px solid #BFDCCB;border-right:1px solid #BFDCCB;">
<h1 style="margin:0 0 16px;font:700 26px/1.2 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#042E1C;">Confirm your new email</h1>
<p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;">You asked to change your YaadGuide email from <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="background:#FAC422;border-radius:10px;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/settings" target="_blank" style="display:inline-block;padding:14px 28px;font:600 16px/1 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;text-decoration:none;">Confirm change</a></td></tr></table><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">Button not working? Paste this link into your browser:<br><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/settings" style="color:#0A7A49;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/settings</a></p><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">If you didn't request this, don't select the button, and change your password right away.</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:0 32px 32px;border:1px solid #BFDCCB;border-top:0;border-radius:0 0 16px 16px;">
<hr style="border:0;border-top:1px solid #BFDCCB;margin:0 0 16px;">
<p style="margin:0;font:400 13px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">YaadGuide, your digital travel agent for Jamaica.<br>This message was sent to {{ .Email }}.<br>Questions? <a href="mailto:support@yaad-guide.com" style="color:#0A7A49;">support@yaad-guide.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
```

---

## Reset password

- **Key:** `recovery`
- **Subject:** `Reset your YaadGuide password`
- **When:** Sent from the forgot-password page. The link lands on the app's `/auth/confirm` route, which then redirects to `/auth/reset-password`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Reset your password</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F4FAF7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Choose a new password for your YaadGuide account.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4FAF7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#042E1C;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="{{ .SiteURL }}/brand/logo-email.png" width="48" height="33" alt="" style="display:block;border:0;"></td>
<td><span style="font:700 24px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#FFFFFF;letter-spacing:-0.3px;">Yaad<span style="color:#FAC422;">Guide</span></span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 20px;border-left:1px solid #BFDCCB;border-right:1px solid #BFDCCB;">
<h1 style="margin:0 0 16px;font:700 26px/1.2 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#042E1C;">Reset your password</h1>
<p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;">We got a request to reset the password for your YaadGuide account. Select the button to choose a new one.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="background:#FAC422;border-radius:10px;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password" target="_blank" style="display:inline-block;padding:14px 28px;font:600 16px/1 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;text-decoration:none;">Reset password</a></td></tr></table><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">Button not working? Paste this link into your browser:<br><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password" style="color:#0A7A49;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password</a></p><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">If you didn't ask for this, ignore this email. Your password stays the same.</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:0 32px 32px;border:1px solid #BFDCCB;border-top:0;border-radius:0 0 16px 16px;">
<hr style="border:0;border-top:1px solid #BFDCCB;margin:0 0 16px;">
<p style="margin:0;font:400 13px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">YaadGuide, your digital travel agent for Jamaica.<br>This message was sent to {{ .Email }}.<br>Questions? <a href="mailto:support@yaad-guide.com" style="color:#0A7A49;">support@yaad-guide.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
```

---

## Reauthentication

- **Key:** `reauthentication`
- **Subject:** `Your YaadGuide security code`
- **When:** Sent before a sensitive action such as changing a password. Code only, no link.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Confirm it's you</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F4FAF7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your security code is {{ .Token }}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4FAF7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#042E1C;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="{{ .SiteURL }}/brand/logo-email.png" width="48" height="33" alt="" style="display:block;border:0;"></td>
<td><span style="font:700 24px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#FFFFFF;letter-spacing:-0.3px;">Yaad<span style="color:#FAC422;">Guide</span></span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 20px;border-left:1px solid #BFDCCB;border-right:1px solid #BFDCCB;">
<h1 style="margin:0 0 16px;font:700 26px/1.2 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#042E1C;">Confirm it's you</h1>
<p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;">Enter this code to confirm the change you're making to your account:</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 24px;"><tr><td align="center" style="background:#E3F1EA;border-radius:10px;padding:18px;font:700 32px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;letter-spacing:10px;color:#042E1C;">{{ .Token }}</td></tr></table><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">The code expires soon. If you didn't start this, change your password.</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:0 32px 32px;border:1px solid #BFDCCB;border-top:0;border-radius:0 0 16px 16px;">
<hr style="border:0;border-top:1px solid #BFDCCB;margin:0 0 16px;">
<p style="margin:0;font:400 13px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">YaadGuide, your digital travel agent for Jamaica.<br>This message was sent to {{ .Email }}.<br>Questions? <a href="mailto:support@yaad-guide.com" style="color:#0A7A49;">support@yaad-guide.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
```

---

## Password changed

- **Key:** `password_changed_notification`
- **Subject:** `Your YaadGuide password was changed`
- **When:** Security notification. Only sent when the matching notification is switched on for the project.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Your password was changed</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F4FAF7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your YaadGuide password was changed</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4FAF7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#042E1C;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="{{ .SiteURL }}/brand/logo-email.png" width="48" height="33" alt="" style="display:block;border:0;"></td>
<td><span style="font:700 24px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#FFFFFF;letter-spacing:-0.3px;">Yaad<span style="color:#FAC422;">Guide</span></span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 20px;border-left:1px solid #BFDCCB;border-right:1px solid #BFDCCB;">
<h1 style="margin:0 0 16px;font:700 26px/1.2 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#042E1C;">Your password was changed</h1>
<p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;">The password for your YaadGuide account was just changed.</p><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">If this was you, nothing more to do. If it wasn't, reset your password straight away and contact us at support@yaad-guide.com.</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:0 32px 32px;border:1px solid #BFDCCB;border-top:0;border-radius:0 0 16px 16px;">
<hr style="border:0;border-top:1px solid #BFDCCB;margin:0 0 16px;">
<p style="margin:0;font:400 13px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">YaadGuide, your digital travel agent for Jamaica.<br>This message was sent to {{ .Email }}.<br>Questions? <a href="mailto:support@yaad-guide.com" style="color:#0A7A49;">support@yaad-guide.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
```

---

## Email address changed

- **Key:** `email_changed_notification`
- **Subject:** `Your YaadGuide email address was changed`
- **When:** Security notification. Only sent when the matching notification is switched on for the project. Variable: `{{ .OldEmail }}`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Your email address was changed</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F4FAF7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your YaadGuide email address was changed</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4FAF7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#042E1C;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="{{ .SiteURL }}/brand/logo-email.png" width="48" height="33" alt="" style="display:block;border:0;"></td>
<td><span style="font:700 24px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#FFFFFF;letter-spacing:-0.3px;">Yaad<span style="color:#FAC422;">Guide</span></span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 20px;border-left:1px solid #BFDCCB;border-right:1px solid #BFDCCB;">
<h1 style="margin:0 0 16px;font:700 26px/1.2 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#042E1C;">Your email address was changed</h1>
<p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;">The email on your YaadGuide account was changed from <strong>{{ .OldEmail }}</strong> to <strong>{{ .Email }}</strong>.</p><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">If this was you, nothing more to do. If it wasn't, reset your password straight away and contact us at support@yaad-guide.com.</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:0 32px 32px;border:1px solid #BFDCCB;border-top:0;border-radius:0 0 16px 16px;">
<hr style="border:0;border-top:1px solid #BFDCCB;margin:0 0 16px;">
<p style="margin:0;font:400 13px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">YaadGuide, your digital travel agent for Jamaica.<br>This message was sent to {{ .Email }}.<br>Questions? <a href="mailto:support@yaad-guide.com" style="color:#0A7A49;">support@yaad-guide.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
```

---

## Phone number changed

- **Key:** `phone_changed_notification`
- **Subject:** `Your YaadGuide phone number was changed`
- **When:** Security notification. Only sent when the matching notification is switched on for the project. Variables: `{{ .OldPhone }}`, `{{ .Phone }}`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Your phone number was changed</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F4FAF7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your YaadGuide phone number was changed</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4FAF7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#042E1C;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="{{ .SiteURL }}/brand/logo-email.png" width="48" height="33" alt="" style="display:block;border:0;"></td>
<td><span style="font:700 24px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#FFFFFF;letter-spacing:-0.3px;">Yaad<span style="color:#FAC422;">Guide</span></span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 20px;border-left:1px solid #BFDCCB;border-right:1px solid #BFDCCB;">
<h1 style="margin:0 0 16px;font:700 26px/1.2 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#042E1C;">Your phone number was changed</h1>
<p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;">The phone number on your YaadGuide account was changed from <strong>{{ .OldPhone }}</strong> to <strong>{{ .Phone }}</strong>.</p><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">If this was you, nothing more to do. If it wasn't, reset your password straight away and contact us at support@yaad-guide.com.</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:0 32px 32px;border:1px solid #BFDCCB;border-top:0;border-radius:0 0 16px 16px;">
<hr style="border:0;border-top:1px solid #BFDCCB;margin:0 0 16px;">
<p style="margin:0;font:400 13px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">YaadGuide, your digital travel agent for Jamaica.<br>This message was sent to {{ .Email }}.<br>Questions? <a href="mailto:support@yaad-guide.com" style="color:#0A7A49;">support@yaad-guide.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
```

---

## Sign-in method linked

- **Key:** `identity_linked_notification`
- **Subject:** `A sign-in method was added to YaadGuide`
- **When:** Security notification. Only sent when the matching notification is switched on for the project. Variable: `{{ .Provider }}`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Sign-in method added</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F4FAF7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">A sign-in method was added to YaadGuide</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4FAF7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#042E1C;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="{{ .SiteURL }}/brand/logo-email.png" width="48" height="33" alt="" style="display:block;border:0;"></td>
<td><span style="font:700 24px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#FFFFFF;letter-spacing:-0.3px;">Yaad<span style="color:#FAC422;">Guide</span></span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 20px;border-left:1px solid #BFDCCB;border-right:1px solid #BFDCCB;">
<h1 style="margin:0 0 16px;font:700 26px/1.2 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#042E1C;">Sign-in method added</h1>
<p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;"><strong>{{ .Provider }}</strong> was linked to your YaadGuide account as a way to sign in.</p><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">If this was you, nothing more to do. If it wasn't, reset your password straight away and contact us at support@yaad-guide.com.</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:0 32px 32px;border:1px solid #BFDCCB;border-top:0;border-radius:0 0 16px 16px;">
<hr style="border:0;border-top:1px solid #BFDCCB;margin:0 0 16px;">
<p style="margin:0;font:400 13px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">YaadGuide, your digital travel agent for Jamaica.<br>This message was sent to {{ .Email }}.<br>Questions? <a href="mailto:support@yaad-guide.com" style="color:#0A7A49;">support@yaad-guide.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
```

---

## Sign-in method removed

- **Key:** `identity_unlinked_notification`
- **Subject:** `A sign-in method was removed from YaadGuide`
- **When:** Security notification. Only sent when the matching notification is switched on for the project. Variable: `{{ .Provider }}`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Sign-in method removed</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F4FAF7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">A sign-in method was removed from YaadGuide</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4FAF7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#042E1C;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="{{ .SiteURL }}/brand/logo-email.png" width="48" height="33" alt="" style="display:block;border:0;"></td>
<td><span style="font:700 24px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#FFFFFF;letter-spacing:-0.3px;">Yaad<span style="color:#FAC422;">Guide</span></span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 20px;border-left:1px solid #BFDCCB;border-right:1px solid #BFDCCB;">
<h1 style="margin:0 0 16px;font:700 26px/1.2 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#042E1C;">Sign-in method removed</h1>
<p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;"><strong>{{ .Provider }}</strong> was removed from your YaadGuide account as a way to sign in.</p><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">If this was you, nothing more to do. If it wasn't, reset your password straight away and contact us at support@yaad-guide.com.</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:0 32px 32px;border:1px solid #BFDCCB;border-top:0;border-radius:0 0 16px 16px;">
<hr style="border:0;border-top:1px solid #BFDCCB;margin:0 0 16px;">
<p style="margin:0;font:400 13px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">YaadGuide, your digital travel agent for Jamaica.<br>This message was sent to {{ .Email }}.<br>Questions? <a href="mailto:support@yaad-guide.com" style="color:#0A7A49;">support@yaad-guide.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
```

---

## Verification method added

- **Key:** `mfa_factor_enrolled_notification`
- **Subject:** `A verification method was added to YaadGuide`
- **When:** Security notification. Only sent when the matching notification is switched on for the project. Variable: `{{ .FactorType }}`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Verification method added</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F4FAF7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">A verification method was added to YaadGuide</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4FAF7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#042E1C;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="{{ .SiteURL }}/brand/logo-email.png" width="48" height="33" alt="" style="display:block;border:0;"></td>
<td><span style="font:700 24px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#FFFFFF;letter-spacing:-0.3px;">Yaad<span style="color:#FAC422;">Guide</span></span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 20px;border-left:1px solid #BFDCCB;border-right:1px solid #BFDCCB;">
<h1 style="margin:0 0 16px;font:700 26px/1.2 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#042E1C;">Verification method added</h1>
<p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;">A <strong>{{ .FactorType }}</strong> verification method was added to your YaadGuide account.</p><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">If this was you, nothing more to do. If it wasn't, reset your password straight away and contact us at support@yaad-guide.com.</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:0 32px 32px;border:1px solid #BFDCCB;border-top:0;border-radius:0 0 16px 16px;">
<hr style="border:0;border-top:1px solid #BFDCCB;margin:0 0 16px;">
<p style="margin:0;font:400 13px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">YaadGuide, your digital travel agent for Jamaica.<br>This message was sent to {{ .Email }}.<br>Questions? <a href="mailto:support@yaad-guide.com" style="color:#0A7A49;">support@yaad-guide.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
```

---

## Verification method removed

- **Key:** `mfa_factor_unenrolled_notification`
- **Subject:** `A verification method was removed from YaadGuide`
- **When:** Security notification. Only sent when the matching notification is switched on for the project. Variable: `{{ .FactorType }}`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Verification method removed</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Figtree:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F4FAF7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">A verification method was removed from YaadGuide</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4FAF7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#042E1C;border-radius:16px 16px 0 0;padding:24px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="{{ .SiteURL }}/brand/logo-email.png" width="48" height="33" alt="" style="display:block;border:0;"></td>
<td><span style="font:700 24px/1 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#FFFFFF;letter-spacing:-0.3px;">Yaad<span style="color:#FAC422;">Guide</span></span></td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;padding:36px 32px 20px;border-left:1px solid #BFDCCB;border-right:1px solid #BFDCCB;">
<h1 style="margin:0 0 16px;font:700 26px/1.2 'Bricolage Grotesque','Trebuchet MS',Arial,sans-serif;color:#042E1C;">Verification method removed</h1>
<p style="margin:0 0 16px;font:400 16px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#042E1C;">A <strong>{{ .FactorType }}</strong> verification method was removed from your YaadGuide account.</p><p style="margin:0 0 12px;font:400 14px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">If this was you, nothing more to do. If it wasn't, reset your password straight away and contact us at support@yaad-guide.com.</p>
</td></tr>
<tr><td style="background:#FFFFFF;padding:0 32px 32px;border:1px solid #BFDCCB;border-top:0;border-radius:0 0 16px 16px;">
<hr style="border:0;border-top:1px solid #BFDCCB;margin:0 0 16px;">
<p style="margin:0;font:400 13px/1.6 Figtree,'Segoe UI',Helvetica,Arial,sans-serif;color:#46604F;">YaadGuide, your digital travel agent for Jamaica.<br>This message was sent to {{ .Email }}.<br>Questions? <a href="mailto:support@yaad-guide.com" style="color:#0A7A49;">support@yaad-guide.com</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
```
