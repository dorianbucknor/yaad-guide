import { describe, expect, it } from "vitest";

import { isArchivedUser } from "./archived";

describe("isArchivedUser", () => {
  it("is true only when app_metadata.archived is exactly true", () => {
    expect(isArchivedUser({ app_metadata: { archived: true } })).toBe(true);
    expect(isArchivedUser({ app_metadata: { archived: "true" } })).toBe(false);
    expect(isArchivedUser({ app_metadata: {} })).toBe(false);
    expect(isArchivedUser({})).toBe(false);
    expect(isArchivedUser(null)).toBe(false);
  });
});
