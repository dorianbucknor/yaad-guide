import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuickStartDraft } from "@/lib/schemas/quick-start";
import { DRAFT_STORAGE_KEY, hydrateDraft, useDraftStore } from "./draft-store";

const draft: QuickStartDraft = {
  move: {
    kind: "taxi",
    passengers: 2,
    vehicle: "sedan",
    pickupDate: "2026-11-05",
    pickupTime: "09:30",
  },
  stay: {
    type: "hotel",
    area: "negril",
    rooms: 1,
    adults: 2,
    children: 0,
    checkIn: "2026-11-05",
    checkOut: "2026-11-08",
  },
  interests: ["beach"],
};

function stored(): unknown {
  return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) ?? "null");
}

describe("draft store", () => {
  beforeEach(() => {
    localStorage.clear();
    useDraftStore.setState({ draft: null, hydrated: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses the yg-draft key", () => {
    expect(DRAFT_STORAGE_KEY).toBe("yg-draft");
  });

  it("setDraft persists under yg-draft", () => {
    useDraftStore.getState().setDraft(draft);
    const saved = stored() as { state: { draft: unknown; hydrated?: unknown } };
    expect(saved.state.draft).toEqual(draft);
    expect(saved.state.hydrated).toBeUndefined();
  });

  it("hydrateDraft restores a saved draft", async () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ state: { draft }, version: 0 }));
    await hydrateDraft();
    expect(useDraftStore.getState().draft).toEqual(draft);
    expect(useDraftStore.getState().hydrated).toBe(true);
  });

  it("clear removes the draft", () => {
    useDraftStore.getState().setDraft(draft);
    useDraftStore.getState().clear();
    expect(useDraftStore.getState().draft).toBeNull();
    const saved = stored() as { state: { draft: unknown } } | null;
    expect(saved?.state.draft ?? null).toBeNull();
  });

  it("corrupt JSON starts empty", async () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "{not json");
    await expect(hydrateDraft()).resolves.toBeUndefined();
    expect(useDraftStore.getState().draft).toBeNull();
    expect(useDraftStore.getState().hydrated).toBe(true);
  });

  it("structurally invalid draft is dropped", async () => {
    const bad = { ...draft, interests: "beach" };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ state: { draft: bad }, version: 0 }));
    await hydrateDraft();
    expect(useDraftStore.getState().draft).toBeNull();
    expect(useDraftStore.getState().hydrated).toBe(true);
  });

  it("saved draft with now-past dates still loads", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-01T12:00:00"));
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ state: { draft }, version: 0 }));
    await hydrateDraft();
    expect(useDraftStore.getState().draft).not.toBeNull();
  });

  it("unavailable storage does not throw", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    await expect(hydrateDraft()).resolves.toBeUndefined();
    expect(useDraftStore.getState().draft).toBeNull();
    expect(useDraftStore.getState().hydrated).toBe(true);
  });

  it("setDraft does not throw when storage rejects writes", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => useDraftStore.getState().setDraft(draft)).not.toThrow();
    expect(useDraftStore.getState().draft).toEqual(draft);
  });
});
