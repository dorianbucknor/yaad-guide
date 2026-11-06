import { describe, expect, it } from "vitest";

import { sortPending } from "./queue";

describe("sortPending", () => {
  it("puts the oldest submission first without changing the input", () => {
    const rows = [
      { id: "b", submittedAt: "2026-11-05T10:00:00Z" },
      { id: "a", submittedAt: "2026-11-01T10:00:00Z" },
      { id: "c", submittedAt: "2026-11-06T10:00:00Z" },
    ];
    expect(sortPending(rows).map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(rows.map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
});
