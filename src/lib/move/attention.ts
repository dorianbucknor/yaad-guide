import type { ReadinessItem } from "./readiness";

export type AttentionScope = "dashboard" | "calendar" | "listing" | "profile";

export type AttentionInput = {
  profileStatus: "draft" | "pending" | "approved" | "rejected" | null;
  businessName: string | null;
  hasProfilePhoto: boolean;
  listing: { status: "draft" | "in_review" | "live"; paused: boolean } | null;
  /** What the listing still lacks (see `readiness`). */
  missing: readonly ReadinessItem[];
};

export type Attention = { title: string; detail: string; href: string };

const PROFILE_HREF = "/v/move/profile";
const LISTING_HREF = "/v/move/listing";

const LISTING_TEXT: Record<ReadinessItem, string> = {
  profile_approved: "Profile not approved yet.",
  vehicle: "No active vehicle.",
  luggage: "Luggage space missing.",
  photos: "Vehicle photos missing.",
  profile_photo: "Profile picture not checked yet.",
  coverage: "No places chosen.",
  pricing: "No prices set.",
  availability: "No weekly hours set.",
};

/** What the vendor must still do on the profile. Waiting on an admin is not on this list. */
function profileIssues(i: AttentionInput): string[] {
  const issues: string[] = [];
  if (i.profileStatus === null) issues.push("Business details not added.");
  else if (i.profileStatus === "rejected") issues.push("An admin sent your registration back.");
  else if (i.profileStatus === "draft") issues.push("Registration not sent for review.");
  else if (i.profileStatus === "approved" && !i.businessName) issues.push("Business name missing.");
  if (!i.hasProfilePhoto) issues.push("No profile picture uploaded.");
  return issues;
}

function listingIssues(i: AttentionInput): string[] {
  if (!i.listing) return i.profileStatus === null ? [] : ["No listing created yet."];
  if (i.listing.status === "live") return [];
  if (i.listing.status === "in_review") return [];
  // A missing profile photo already shows under the profile.
  const issues = i.missing.filter((m) => m !== "profile_photo" || i.hasProfilePhoto).map((m) => LISTING_TEXT[m]);
  if (issues.length === 0) issues.push("Not sent for review yet.");
  return issues;
}

const summarize = (issues: string[]): string => (issues.length === 1 ? issues[0] : "Multiple items need your attention.");

/** The red banner for a tab, or null when the vendor has nothing to handle there. */
export function attentionFor(scope: AttentionScope, input: AttentionInput): Attention | null {
  const profile = profileIssues(input);
  const listing = listingIssues(input);
  const paused = input.listing?.status === "live" && input.listing.paused;

  if (scope === "profile") {
    return profile.length ? { title: "Profile needs attention!", detail: summarize(profile), href: PROFILE_HREF } : null;
  }

  const issues = scope === "dashboard" ? [...profile, ...listing] : listing;
  if (issues.length > 0) {
    const href = scope === "dashboard" && profile.length > 0 ? PROFILE_HREF : LISTING_HREF;
    return { title: "Your listings aren't public!", detail: summarize(issues), href };
  }
  if (paused) {
    return { title: "Your listing is paused!", detail: "Travelers can't send you requests until you resume it.", href: LISTING_HREF };
  }
  return null;
}
