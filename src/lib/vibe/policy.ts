import type { CancellationPolicy } from "./types";

export const CANCELLATION_POLICIES = ["flexible", "moderate", "strict"] as const satisfies readonly CancellationPolicy[];

/** STAY and VIBE tiers from the PRD, counted back from the start of the slot to the moment of cancelling. */
export const POLICY_COPY: Record<CancellationPolicy, { name: string; summary: string; rules: string[] }> = {
  flexible: {
    name: "Flexible",
    summary: "More bookings, more cancellations.",
    rules: ["Full refund 24 hours or more before it starts", "No refund inside 24 hours"],
  },
  moderate: {
    name: "Moderate",
    summary: "A middle path for events with set-up costs.",
    rules: [
      "Full refund 120 hours (5 days) or more before it starts",
      "50% refund from 24 to 120 hours before",
      "No refund inside 24 hours",
    ],
  },
  strict: {
    name: "Strict",
    summary: "You are paid most often for late changes.",
    rules: ["50% refund 168 hours (7 days) or more before it starts", "No refund after that"],
  },
};

export const GRACE_NOTE =
  "Every policy has a 1-hour grace period: a traveler who cancels within an hour of paying gets a full refund if the slot is at least 24 hours away.";
