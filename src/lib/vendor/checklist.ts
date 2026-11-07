import type { VendorOverview } from "./types";

export type StepKey = "business" | "vehicles" | "documents" | "review";
export type StepState = "done" | "todo" | "locked";

export type ChecklistStep = {
  key: StepKey;
  label: string;
  hint: string;
  href: string;
  state: StepState;
};

const VEHICLE_GAPS = new Set(["A vehicle", "An active vehicle"]);

/**
 * edit: draft or rejected, everything can change.
 * add: approved, a vendor may add a vehicle or replace a document.
 * locked: pending, nothing changes until an admin decides.
 */
export function profileMode(overview: VendorOverview | null): "edit" | "add" | "locked" {
  const status = overview?.profile?.status;
  if (status === "pending") return "locked";
  if (status === "approved") return "add";
  return "edit";
}

/** The four onboarding steps and where the vendor stands in each. */
export function checklistSteps(overview: VendorOverview | null): ChecklistStep[] {
  const profile = overview?.profile ?? null;
  const missing = overview?.readiness.missing ?? [];
  const documentsMissing = missing.some((item) => !VEHICLE_GAPS.has(item));
  const vehicles = overview?.vehicles ?? [];
  const submitted = profile?.status === "pending" || profile?.status === "approved";

  const vehiclesDone = vehicles.length > 0 && vehicles.some((v) => v.isActive);
  const documentsDone = vehicles.length > 0 && !documentsMissing;

  return [
    {
      key: "business",
      label: "Business details",
      hint: "Your name for the business and your main region.",
      href: "/vendor/onboarding/business",
      state: profile ? "done" : "todo",
    },
    {
      key: "vehicles",
      label: "Vehicles",
      hint: "Add each vehicle and choose the one you drive now.",
      href: "/vendor/onboarding/vehicles",
      state: !profile ? "locked" : vehiclesDone ? "done" : "todo",
    },
    {
      key: "documents",
      label: "Documents",
      hint: "Government ID, JTB license, insurance and fitness certificates.",
      href: "/vendor/onboarding/documents",
      state: !profile ? "locked" : documentsDone ? "done" : "todo",
    },
    {
      key: "review",
      label: "Submit for review",
      hint: "An admin checks your documents before you go live.",
      href: "/vendor/onboarding/review",
      state: submitted ? "done" : overview?.readiness.ready ? "todo" : "locked",
    },
  ];
}
