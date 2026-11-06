import type { ZodError } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type FailedResult = Extract<ActionResult, { ok: false }>;

/** Turns a zod error into a failed result with the first message per field. */
export function fromZod(error: ZodError): FailedResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in fieldErrors)) fieldErrors[field] = issue.message;
  }
  return {
    ok: false,
    error: "Please check the highlighted fields.",
    fieldErrors,
  };
}
