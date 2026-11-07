import { describe, expect, it } from "vitest";

import { securityState } from "./security-state";

const base = { providers: ["email"], hasPassword: true, pendingEmail: null as string | null };

describe("securityState", () => {
  it("shows the current-password field for an account with a password", () => {
    expect(securityState(base)).toEqual({
      showCurrentPassword: true,
      methods: ["Email and password"],
      pendingEmail: null,
    });
  });

  it("hides the current-password field for a Google-only account and lists Google", () => {
    const state = securityState({ providers: ["google"], hasPassword: false, pendingEmail: null });
    expect(state.showCurrentPassword).toBe(false);
    expect(state.methods).toEqual(["Google"]);
  });

  it("lists both methods for email plus Google", () => {
    expect(securityState({ ...base, providers: ["email", "google"] }).methods).toEqual([
      "Email and password",
      "Google",
    ]);
  });

  it("surfaces a pending new email", () => {
    expect(securityState({ ...base, pendingEmail: "new@example.com" }).pendingEmail).toBe(
      "new@example.com",
    );
  });
});
