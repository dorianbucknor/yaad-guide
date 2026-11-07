import { describe, expect, it } from "vitest";

import { getViewer } from "./viewer";

describe("getViewer", () => {
  it("treats null claims as a signed-out traveler", () => {
    expect(getViewer(null)).toEqual({
      signedIn: false,
      role: "traveler",
      phoneVerified: false,
      archived: false,
    });
  });

  it("reads the role from app_metadata", () => {
    const viewer = getViewer({ sub: "u1", app_metadata: { role: "vendor" } });
    expect(viewer).toEqual({
      signedIn: true,
      role: "vendor",
      phoneVerified: false,
      archived: false,
    });
  });

  it.each([
    [{ sub: "u1" }],
    [{ sub: "u1", app_metadata: {} }],
    [{ sub: "u1", app_metadata: { role: "superuser" } }],
    [{ sub: "u1", app_metadata: { role: 7 } }],
    [{ sub: "u1", user_metadata: { role: "admin" } }],
  ])("falls back to traveler when the role is absent or unknown: %j", (claims) => {
    expect(getViewer(claims).role).toBe("traveler");
  });

  it("marks the phone as verified when the phone claim is present", () => {
    expect(getViewer({ sub: "u1", phone: "+18765551234" }).phoneVerified).toBe(
      true,
    );
    expect(getViewer({ sub: "u1", phone: "" }).phoneVerified).toBe(false);
  });

  it("reads the archived flag only when it is exactly true", () => {
    expect(getViewer({ sub: "u1", app_metadata: { archived: true } }).archived).toBe(true);
    expect(getViewer({ sub: "u1", app_metadata: { archived: "true" } }).archived).toBe(false);
    expect(getViewer({ sub: "u1", app_metadata: {} }).archived).toBe(false);
    expect(getViewer({ sub: "u1" }).archived).toBe(false);
  });
});
