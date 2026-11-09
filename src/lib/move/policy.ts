export const CANCELLATION_POLICIES = ["flexible", "moderate"] as const;
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

/** MOVE tiers from the PRD, counted back from pickup to the moment of cancelling. */
export const POLICY_COPY: Record<CancellationPolicy, { name: string; summary: string; rules: string[] }> = {
  flexible: {
    name: "Flexible",
    summary: "More bookings, more cancellations.",
    rules: ["Full refund 24 hours or more before pickup", "50% refund from 3 to 24 hours before", "No refund inside 3 hours or on a no-show"],
  },
  moderate: {
    name: "Moderate",
    summary: "Stricter, so you are paid more often for late changes.",
    rules: ["Full refund 72 hours or more before pickup", "50% refund from 24 to 72 hours before", "No refund inside 24 hours or on a no-show"],
  },
};
