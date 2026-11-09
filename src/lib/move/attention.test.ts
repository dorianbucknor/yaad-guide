import { describe, expect, it } from "vitest";

import { attentionFor, type AttentionInput } from "./attention";

const ready: AttentionInput = {
  profileStatus: "approved",
  businessName: "Island Rides",
  hasProfilePhoto: true,
  listing: { status: "live", paused: false },
  missing: [],
};

describe("attentionFor", () => {
  it("says nothing when everything is handled", () => {
    for (const scope of ["dashboard", "calendar", "listing", "profile"] as const) {
      expect(attentionFor(scope, ready)).toBeNull();
    }
  });

  it("names a single profile problem", () => {
    const a = attentionFor("profile", { ...ready, hasProfilePhoto: false });
    expect(a).toEqual({ title: "Profile needs attention!", detail: "No profile picture uploaded.", href: "/v/move/profile" });
  });

  it("sums up several profile problems", () => {
    const a = attentionFor("profile", { ...ready, hasProfilePhoto: false, businessName: null });
    expect(a?.detail).toBe("Multiple items need your attention.");
  });

  it("does not nag while an admin is reviewing the registration", () => {
    expect(attentionFor("profile", { ...ready, profileStatus: "pending" })).toBeNull();
  });

  it("flags a listing that is not public, and says why", () => {
    const a = attentionFor("listing", { ...ready, listing: { status: "draft", paused: false }, missing: ["pricing"] });
    expect(a).toEqual({ title: "Your listings aren't public!", detail: "No prices set.", href: "/v/move/listing" });
  });

  it("sums up several listing problems", () => {
    const a = attentionFor("calendar", { ...ready, listing: { status: "draft", paused: false }, missing: ["pricing", "coverage"] });
    expect(a?.detail).toBe("Multiple items need your attention.");
  });

  it("flags a paused live listing", () => {
    const a = attentionFor("listing", { ...ready, listing: { status: "live", paused: true } });
    expect(a?.title).toBe("Your listing is paused!");
  });

  it("stays quiet while the listing is in review", () => {
    expect(attentionFor("listing", { ...ready, listing: { status: "in_review", paused: false } })).toBeNull();
  });

  it("points the dashboard at the profile when that is what is wrong", () => {
    const a = attentionFor("dashboard", { ...ready, hasProfilePhoto: false });
    expect(a?.href).toBe("/v/move/profile");
  });
});
