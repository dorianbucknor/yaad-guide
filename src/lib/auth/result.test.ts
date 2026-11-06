import { describe, expect, it } from "vitest";

import { signUpSchema } from "@/lib/schemas/auth";

import { fromZod } from "./result";

describe("fromZod", () => {
  it("returns a failed result with the first message per field", () => {
    const parsed = signUpSchema.safeParse({
      firstName: "",
      lastName: "Lovelace",
      email: "nope",
      password: "short",
      confirmPassword: "different",
    });
    if (parsed.success) throw new Error("expected invalid input");

    const result = fromZod(parsed.error);

    expect(result.ok).toBe(false);
    expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual([
      "confirmPassword",
      "email",
      "firstName",
      "password",
    ]);
    expect(result.error).toMatch(/check the highlighted fields/i);
  });
});
