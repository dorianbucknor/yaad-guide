import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { quickStartShape, type QuickStartDraft } from "@/lib/schemas/quick-start";

/** localStorage key for the quick-start draft. */
export const DRAFT_STORAGE_KEY = "yg-draft";

interface DraftState {
  draft: QuickStartDraft | null;
  /** True once the saved draft has been read (or found unreadable). */
  hydrated: boolean;
  setDraft: (draft: QuickStartDraft) => void;
  clear: () => void;
}

/** localStorage that never throws (private mode, blocked storage, quota). */
const guardedStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Losing the draft is acceptable; the in-memory state still works.
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  },
};

/** Safe JSON read: corrupt payloads become `null` so rehydration cannot throw. */
const jsonStorage = createJSONStorage<{ draft: QuickStartDraft | null }>(() => ({
  getItem: (name) => {
    const raw = guardedStorage.getItem(name);
    if (typeof raw !== "string") return null;
    try {
      JSON.parse(raw);
      return raw;
    } catch {
      return null;
    }
  },
  setItem: guardedStorage.setItem,
  removeItem: guardedStorage.removeItem,
}));

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      draft: null,
      hydrated: false,
      setDraft: (draft) => set({ draft }),
      clear: () => set({ draft: null }),
    }),
    {
      name: DRAFT_STORAGE_KEY,
      storage: jsonStorage,
      partialize: (state) => ({ draft: state.draft }),
      // Rehydrate from `hydrateDraft` after mount so server and client markup match.
      skipHydration: true,
      // Validate structure only: a draft whose dates have passed must still load.
      merge: (persisted, current) => {
        const saved =
          typeof persisted === "object" && persisted !== null && "draft" in persisted
            ? persisted.draft
            : null;
        const parsed = quickStartShape.safeParse(saved);
        return { ...current, draft: parsed.success ? parsed.data : current.draft };
      },
    },
  ),
);

/** Client-only. Loads the saved draft; always marks the store hydrated and never throws. */
export async function hydrateDraft(): Promise<void> {
  try {
    await useDraftStore.persist.rehydrate();
  } finally {
    useDraftStore.setState({ hydrated: true });
  }
}
