import { describe, expect, it } from "vitest";

import { sortListings } from "./listing-sort";
import type { VibeListingSummary } from "./types";

const make = (id: string, subtype: VibeListingSummary["subtype"], status: VibeListingSummary["status"], createdAt: string): VibeListingSummary => ({
  id,
  title: id,
  subtype,
  status,
  paused: false,
  nextSlotAt: null,
  openFlags: 0,
  createdAt,
  usesSlots: true,
});

const rows = [
  make("draft-new", "event", "draft", "2026-11-05"),
  make("live-old-dining", "dining", "live", "2026-10-01"),
  make("live-new-event", "event", "live", "2026-11-01"),
  make("review-attraction", "attraction", "in_review", "2026-10-20"),
];
const ids = (sort: Parameters<typeof sortListings>[1]) => sortListings(rows, sort).map((l) => l.id);

describe("sortListings", () => {
  it("puts live first, then newest", () => {
    expect(ids("newest")).toEqual(["live-new-event", "live-old-dining", "draft-new", "review-attraction"]);
  });
  it("puts live first, then oldest", () => {
    expect(ids("oldest")).toEqual(["live-old-dining", "live-new-event", "review-attraction", "draft-new"]);
  });
  it("groups by category within live and not live", () => {
    expect(ids("category")).toEqual(["live-old-dining", "live-new-event", "review-attraction", "draft-new"]);
  });
  it("does not change the input", () => {
    sortListings(rows, "oldest");
    expect(rows[0].id).toBe("draft-new");
  });
});
