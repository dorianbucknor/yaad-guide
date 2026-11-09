import { useSyncExternalStore } from "react";

/** The current time in ms, refreshed every `intervalMs`; 0 on the server so markup matches. */
export function useNow(intervalMs = 30_000): number {
  return useSyncExternalStore(
    (onChange) => {
      const timer = setInterval(onChange, intervalMs);
      return () => clearInterval(timer);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => 0,
  );
}
