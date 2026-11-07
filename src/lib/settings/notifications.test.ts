import { describe, expect, it } from "vitest";

import {
  defaultEnabled,
  isLocked,
  resolvePreferences,
  visibleCategories,
} from "./notifications";

describe("defaults and locks", () => {
  it("turns offers off for both channels and everything else on", () => {
    expect(defaultEnabled("offers", "email")).toBe(false);
    expect(defaultEnabled("offers", "sms")).toBe(false);
    expect(defaultEnabled("bookings", "email")).toBe(true);
    expect(defaultEnabled("account_security", "sms")).toBe(true);
  });

  it("locks only account security email", () => {
    expect(isLocked("account_security", "email")).toBe(true);
    expect(isLocked("account_security", "sms")).toBe(false);
    expect(isLocked("bookings", "email")).toBe(false);
  });
});

describe("visibleCategories", () => {
  it("hides vendor categories from travelers", () => {
    expect(visibleCategories("traveler")).toEqual(["account_security", "bookings", "offers"]);
  });
  it("shows all five to vendors and admins", () => {
    expect(visibleCategories("vendor")).toHaveLength(5);
    expect(visibleCategories("admin")).toHaveLength(5);
  });
});

describe("resolvePreferences", () => {
  it("returns defaults for a traveler with no rows", () => {
    const result = resolvePreferences([], "traveler");
    expect(result).toHaveLength(6);
    expect(result.find((r) => r.category === "offers" && r.channel === "sms")?.enabled).toBe(false);
  });
  it("lets a stored row override the default", () => {
    const result = resolvePreferences(
      [{ category: "bookings", channel: "sms", enabled: false }],
      "traveler",
    );
    expect(result.find((r) => r.category === "bookings" && r.channel === "sms")?.enabled).toBe(false);
  });
  it("keeps the locked entry enabled even if a disabled row is stored", () => {
    const result = resolvePreferences(
      [{ category: "account_security", channel: "email", enabled: false }],
      "traveler",
    );
    const entry = result.find((r) => r.category === "account_security" && r.channel === "email");
    expect(entry).toMatchObject({ enabled: true, locked: true });
  });
  it("ignores rows for unknown categories", () => {
    const result = resolvePreferences(
      [{ category: "nope", channel: "email", enabled: false }],
      "traveler",
    );
    expect(result).toHaveLength(6);
  });
});
