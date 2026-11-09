import type { VendorStatus } from "./types";

export type SetupCategory = "move" | "vibe";

const CATEGORIES: Record<SetupCategory, { label: string; needs: string; unlocks: string; canDraft: boolean }> = {
  move: {
    label: "Move",
    needs: "business details, vehicles and documents",
    unlocks: "requests, calendar and listing",
    canDraft: false,
  },
  vibe: {
    label: "Vibe",
    needs: "business details and documents",
    unlocks: "listings",
    canDraft: true,
  },
};

export type SetupPromptCopy = {
  title: string;
  body: string;
  cta: string;
  /** "continue" goes to the setup steps; "view" goes to the profile page (it is with an admin). */
  step: "continue" | "view";
};

/**
 * One wording for every "set up your vendor profile" prompt, so the same state reads the same on
 * every vendor page. `lead` adds a sentence about the page the vendor was trying to open.
 */
export function setupPromptCopy({
  category,
  status,
  lead,
}: {
  category: SetupCategory;
  status: VendorStatus | undefined;
  lead?: string;
}): SetupPromptCopy {
  const { label, needs, unlocks, canDraft } = CATEGORIES[category];

  if (status === "pending") {
    return {
      title: `Your ${label} vendor profile is under review`,
      body: `An admin is checking your documents. ${canDraft ? "You can still draft listings." : `You can open your ${unlocks} as soon as they approve you.`}`,
      cta: "View your profile",
      step: "view",
    };
  }

  if (status === "rejected") {
    return {
      title: `Update your ${label} vendor profile`,
      body: "An admin sent it back. Fix what they mention, then send it for review again.",
      cta: "Continue setup",
      step: "continue",
    };
  }

  const then = canDraft ? "You can draft listings while you wait." : `You can open your ${unlocks} once an admin approves you.`;
  return {
    title: status === "draft" ? `Finish setting up your ${label} vendor profile` : `Set up your ${label} vendor profile`,
    body: `${lead ? `${lead} ` : ""}Add your ${needs}, then send them for review. ${then}`,
    cta: status === "draft" ? "Continue setup" : "Start setup",
    step: "continue",
  };
}
