import { createHash, timingSafeEqual } from "node:crypto";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/** Constant-time check of a `Bearer <secret>` header; hashes both sides so lengths match. */
export function isCronAuthorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  return timingSafeEqual(sha256(header), sha256(`Bearer ${secret}`));
}
