import type { FieldErrors } from "react-hook-form";
import type { QuickStartDraft } from "@/lib/schemas/quick-start";

/** Quick-start steps in order: MOVE, STAY, VIBE, TRIP. */
export type QuickStartStep = 0 | 1 | 2;

/**
 * The first step holding an error, so a failed submit on mobile can return to it.
 * Root-level errors (and no errors) belong to the TRIP step.
 */
export function firstInvalidStep(
	errors: FieldErrors<QuickStartDraft>,
): QuickStartStep {
	if (errors.move) return 0;
	if (errors.stay) return 1;
	if (errors.interests) return 2;
	return 2;
	// return 3;
}
