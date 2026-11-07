import { describe, expect, it } from "vitest";

import {
  changeEmailSchema,
  changePasswordSchema,
  deleteAccountSchema,
  preferenceSchema,
} from "./settings";

const goodPassword = { newPassword: "Str0ngPass!word", confirmPassword: "Str0ngPass!word" };

describe("changePasswordSchema", () => {
  it("rejects a short new password", () => {
    expect(changePasswordSchema.safeParse({ newPassword: "a", confirmPassword: "a" }).success).toBe(false);
  });
  it("reports a mismatch on confirmPassword", () => {
    const r = changePasswordSchema.safeParse({ ...goodPassword, confirmPassword: "different" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["confirmPassword"]);
  });
  it("allows the current password to be omitted", () => {
    expect(changePasswordSchema.safeParse(goodPassword).success).toBe(true);
  });
});

describe("changeEmailSchema", () => {
  it("rejects a bad email", () => {
    expect(changeEmailSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("deleteAccountSchema", () => {
  it("fails lowercase delete with the message", () => {
    const r = deleteAccountSchema.safeParse({ confirmation: "delete" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Type DELETE to confirm.");
  });
  it("passes DELETE", () => {
    expect(deleteAccountSchema.safeParse({ confirmation: "DELETE" }).success).toBe(true);
  });
});

describe("preferenceSchema", () => {
  it("accepts a known category and channel", () => {
    expect(preferenceSchema.safeParse({ category: "bookings", channel: "sms", enabled: false }).success).toBe(true);
  });
  it("rejects unknown category or channel", () => {
    expect(preferenceSchema.safeParse({ category: "x", channel: "sms", enabled: true }).success).toBe(false);
    expect(preferenceSchema.safeParse({ category: "bookings", channel: "push", enabled: true }).success).toBe(false);
  });
  it("requires enabled to be boolean", () => {
    expect(preferenceSchema.safeParse({ category: "bookings", channel: "sms", enabled: "yes" }).success).toBe(false);
  });
});
