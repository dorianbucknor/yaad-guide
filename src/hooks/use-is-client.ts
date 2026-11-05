import { useSyncExternalStore } from "react";

const subscribe = (): (() => void) => () => {};

/**
 * True in the browser, false on the server. Use it to render components that
 * read the current date or other browser state on the client only.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
