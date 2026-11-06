import { describe, expect, it } from "vitest";

import {
  nameSchema,
  passwordSchema,
  phoneOtpSchema,
  phoneSchema,
  phoneVerifySchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  vendorSignUpSchema,
} from "./auth";

const validSignUp = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  password: "password1",
  confirmPassword: "password1",
};

describe("passwordSchema", () => {
  it("rejects 7 characters and accepts 8", () => {
    expect(passwordSchema.safeParse("1234567").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
  });
});

describe("signUpSchema", () => {
  it("accepts a valid sign-up and lowercases the email", () => {
    const result = signUpSchema.parse({
      ...validSignUp,
      email: "  Ada@Example.COM ",
    });
    expect(result.email).toBe("ada@example.com");
  });

  it("reports a mismatched confirmation on confirmPassword", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      confirmPassword: "different1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path[0])).toContain(
        "confirmPassword",
      );
    }
  });
});

describe("nameSchema", () => {
  it.each(["O'Brien", "Anne-Marie", "Élodie"])("accepts %s", (name) => {
    expect(nameSchema.safeParse(name).success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    expect(nameSchema.parse("  Ada ")).toBe("Ada");
  });

  it.each(["   ", "123", "", "a".repeat(61)])("rejects %j", (name) => {
    expect(nameSchema.safeParse(name).success).toBe(false);
  });
});

describe("phoneSchema", () => {
  it.each([
    "876 555 1234",
    "(876) 555-1234",
    "+1 876 555 1234",
    "18765551234",
    "876.555.1234",
  ])("normalizes %s to E.164", (input) => {
    expect(phoneSchema.parse(input)).toBe("+18765551234");
  });

  it.each(["555", "abc", "+0123", "", "876 555 12345678901234567"])(
    "rejects %j",
    (input) => {
      expect(phoneSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe("vendorSignUpSchema", () => {
  it("requires a phone number and normalizes it", () => {
    expect(vendorSignUpSchema.safeParse(validSignUp).success).toBe(false);
    const result = vendorSignUpSchema.parse({
      ...validSignUp,
      phone: "876 555 1234",
    });
    expect(result.phone).toBe("+18765551234");
  });
});

describe("phoneOtpSchema", () => {
  it("accepts exactly six digits", () => {
    expect(phoneOtpSchema.safeParse({ code: "123456" }).success).toBe(true);
  });

  it.each(["12345", "1234567", "12345a", ""])("rejects %j", (code) => {
    expect(phoneOtpSchema.safeParse({ code }).success).toBe(false);
  });
});

describe("signInSchema and resetPasswordSchema", () => {
  it("requires a non-empty password to sign in", () => {
    expect(
      signInSchema.safeParse({ email: "a@b.co", password: "" }).success,
    ).toBe(false);
  });

  it("requires matching new passwords to reset", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "password1",
        confirmPassword: "password2",
      }).success,
    ).toBe(false);
  });
});

describe('phoneVerifySchema', () => {
  it('normalizes the phone and requires a six-digit code', () => {
    expect(
      phoneVerifySchema.parse({ phone: '876 555 1234', code: '123456' }),
    ).toEqual({ phone: '+18765551234', code: '123456' });
    expect(
      phoneVerifySchema.safeParse({ phone: '876 555 1234', code: '12' }).success,
    ).toBe(false);
  });
});
