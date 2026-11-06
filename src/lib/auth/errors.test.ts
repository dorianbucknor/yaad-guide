import { beforeEach, describe, expect, it, vi } from "vitest";

import { toAuthMessage } from "./errors";

describe("toAuthMessage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("gives the same message for a wrong password and an unknown user", () => {
    expect(toAuthMessage({ code: "user_not_found" })).toBe(
      toAuthMessage({ code: "invalid_credentials" }),
    );
  });

  it("tells an unconfirmed user to confirm their email", () => {
    expect(toAuthMessage({ code: "email_not_confirmed" })).toMatch(/confirm/i);
  });

  it.each(["otp_expired", "invalid_otp", "sms_otp_invalid"])(
    "explains a bad or expired code for %s",
    (code) => {
      expect(toAuthMessage({ code })).toMatch(/code/i);
    },
  );

  it.each([
    "over_request_rate_limit",
    "over_sms_send_rate_limit",
    "over_email_send_rate_limit",
  ])("asks the user to try again later for %s", (code) => {
    expect(toAuthMessage({ code })).toMatch(/try again later/i);
  });

  it("never leaks raw error text for unknown errors", () => {
    const message = toAuthMessage({
      code: "weird_internal",
      message: "duplicate key value violates constraint users_pkey",
    });
    expect(message).not.toMatch(/duplicate|constraint|users_pkey/);
    expect(message).toMatch(/something went wrong/i);
  });

  it.each([null, undefined])("returns a generic message for %s", (value) => {
    expect(toAuthMessage(value)).toMatch(/something went wrong/i);
  });
});
