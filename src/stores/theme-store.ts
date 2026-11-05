import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** localStorage key. The inline script in `app/layout.tsx` reads the same key to avoid a flash. */
export const THEME_STORAGE_KEY = "yg-theme";

interface ThemeState {
  /** What the user chose. */
  preference: ThemePreference;
  /** What is actually applied. Always `light` or `dark`. */
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const systemPrefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const resolve = (preference: ThemePreference): ResolvedTheme =>
  preference === "system"
    ? systemPrefersDark()
      ? "dark"
      : "light"
    : preference;

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: "system",
      resolved: "light",
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: THEME_STORAGE_KEY,
      // Only the choice is stored; `resolved` is derived on the client.
      partialize: (state) => ({ preference: state.preference }),
      // Rehydrate in `initTheme` after mount so server and client markup match.
      skipHydration: true,
    },
  ),
);

function apply(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

/**
 * Client-only. Loads the saved preference, applies the `.dark` class, and keeps it in sync
 * with the store and the operating system. Returns a cleanup function.
 */
export function initTheme(): () => void {
  const sync = () => {
    const resolved = resolve(useThemeStore.getState().preference);
    if (useThemeStore.getState().resolved !== resolved) {
      useThemeStore.setState({ resolved });
    }
    apply(resolved);
  };

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const unsubscribe = useThemeStore.subscribe((state, previous) => {
    if (state.preference !== previous.preference) sync();
  });
  media.addEventListener("change", sync);

  void Promise.resolve(useThemeStore.persist.rehydrate()).then(sync);

  return () => {
    unsubscribe();
    media.removeEventListener("change", sync);
  };
}
