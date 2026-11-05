import { useCallback, useSyncExternalStore } from "react";

function canMatchMedia(): boolean {
  return typeof window.matchMedia === "function";
}

/** Whether a CSS media query currently matches. False on the server or without matchMedia. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      if (!canMatchMedia()) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => canMatchMedia() && window.matchMedia(query).matches,
    () => false,
  );
}
