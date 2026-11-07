export const ARCHIVED_MESSAGE = "This account is scheduled for deletion. Restore it to continue.";

/** Reads the flag from a user the server just verified (not from a possibly stale token). */
export function isArchivedUser(
  user: { app_metadata?: Record<string, unknown> } | null | undefined,
): boolean {
  return user?.app_metadata?.archived === true;
}
