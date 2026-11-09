import { describe, expect, it } from "vitest";

import { setupPromptCopy } from "./setup-copy";

describe("setupPromptCopy", () => {
  it("names the category and the vendor profile, and says Start setup, when there is no profile yet", () => {
    const move = setupPromptCopy({ category: "move", status: undefined });
    expect(move.title).toBe("Set up your Move vendor profile");
    expect(move.cta).toBe("Start setup");
    expect(move.step).toBe("continue");
    expect(setupPromptCopy({ category: "vibe", status: undefined }).title).toBe("Set up your Vibe vendor profile");
  });

  it("says Finish and Continue setup for a draft", () => {
    const copy = setupPromptCopy({ category: "move", status: "draft" });
    expect(copy.title).toBe("Finish setting up your Move vendor profile");
    expect(copy.cta).toBe("Continue setup");
    expect(copy.step).toBe("continue");
  });

  it("asks a rejected vendor to update the profile", () => {
    const copy = setupPromptCopy({ category: "vibe", status: "rejected" });
    expect(copy.title).toBe("Update your Vibe vendor profile");
    expect(copy.body).toContain("sent it back");
    expect(copy.cta).toBe("Continue setup");
  });

  it("points a pending profile at the profile page, not at setup", () => {
    const copy = setupPromptCopy({ category: "move", status: "pending" });
    expect(copy.title).toBe("Your Move vendor profile is under review");
    expect(copy.cta).toBe("View your profile");
    expect(copy.step).toBe("view");
  });

  it("explains what Move needs and what opens once approved", () => {
    const body = setupPromptCopy({ category: "move", status: undefined }).body;
    expect(body).toBe(
      "Add your business details, vehicles and documents, then send them for review. You can open your requests, calendar and listing once an admin approves you.",
    );
  });

  it("tells a Vibe vendor they can draft listings meanwhile", () => {
    expect(setupPromptCopy({ category: "vibe", status: "draft" }).body).toBe(
      "Add your business details and documents, then send them for review. You can draft listings while you wait.",
    );
    expect(setupPromptCopy({ category: "vibe", status: "pending" }).body).toBe(
      "An admin is checking your documents. You can still draft listings.",
    );
  });

  it("says when a Move vendor can open the gated pages while their profile is pending", () => {
    expect(setupPromptCopy({ category: "move", status: "pending" }).body).toBe(
      "An admin is checking your documents. You can open your requests, calendar and listing as soon as they approve you.",
    );
  });

  it("puts a page-specific lead sentence first, for the setup states only", () => {
    const lead = "You need a vendor profile before you can add listings.";
    expect(setupPromptCopy({ category: "vibe", status: undefined, lead }).body.startsWith(`${lead} Add your`)).toBe(true);
    expect(setupPromptCopy({ category: "vibe", status: "pending", lead }).body).not.toContain(lead);
  });
});
