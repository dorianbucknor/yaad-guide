import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import type { FailedResult } from "@/lib/auth/result";

/** Pushes a failed action's field errors into the form; returns the form-level message. */
export function applyFailure<T extends FieldValues>(
  result: FailedResult,
  setError: UseFormSetError<T>,
): string {
  for (const [name, message] of Object.entries(result.fieldErrors ?? {})) {
    setError(name as Path<T>, { message });
  }
  return result.error;
}

/** Keeps `next` on links between auth screens. */
export function withNext(path: string, next: string): string {
  return next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`;
}
