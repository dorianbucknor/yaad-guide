const GENERIC = "Something went wrong. Please try again.";
const BAD_CREDENTIALS = "Incorrect email or password.";
const BAD_CODE = "That code is wrong or has expired. Request a new one.";
const RATE_LIMITED = "Too many attempts. Please try again later.";

const BY_CODE: Record<string, string> = {
  // Wrong password and unknown user must be indistinguishable.
  invalid_credentials: BAD_CREDENTIALS,
  user_not_found: BAD_CREDENTIALS,
  email_not_confirmed: "Confirm your email first. Check your inbox for the link.",
  otp_expired: BAD_CODE,
  invalid_otp: BAD_CODE,
  sms_otp_invalid: BAD_CODE,
  over_request_rate_limit: RATE_LIMITED,
  over_sms_send_rate_limit: RATE_LIMITED,
  over_email_send_rate_limit: RATE_LIMITED,
  weak_password: "That password is too weak. Try a longer one.",
  same_password: "Choose a password you have not used before.",
};

/** Maps a Supabase auth error to a safe user-facing message. */
export function toAuthMessage(
  error: { code?: string; message?: string } | null | undefined,
): string {
  if (!error?.code) return GENERIC;
  return BY_CODE[error.code] ?? GENERIC;
}
