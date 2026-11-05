import { useEffect, useRef, type RefObject } from "react";

/**
 * How far a section has been scrolled through, from 0 to 1. 0 when the section
 * top is at 75% of the viewport height, 1 when its bottom reaches the viewport
 * bottom. Returns 0 for non-finite inputs.
 */
export function progressThrough(
  top: number,
  height: number,
  viewportHeight: number,
): number {
  if (
    !Number.isFinite(top) ||
    !Number.isFinite(height) ||
    !Number.isFinite(viewportHeight)
  ) {
    return 0;
  }
  const raw =
    (0.75 * viewportHeight - top) / Math.max(1, height - 0.25 * viewportHeight);
  return Math.min(1, Math.max(0, raw));
}

/**
 * Reports scroll progress through the referenced element without React state,
 * so scrolling never re-renders. Under reduced motion it reports 1 once and
 * subscribes to nothing.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void,
): void {
  const callbackRef = useRef(onProgress);

  useEffect(() => {
    callbackRef.current = onProgress;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;
    let observer: IntersectionObserver | null = null;
    let listening = false;
    let failed = false;

    const measure = (): void => {
      frame = 0;
      if (failed) return;
      try {
        const rect = element.getBoundingClientRect();
        callbackRef.current(
          progressThrough(rect.top, rect.height, window.innerHeight),
        );
      } catch {
        fail();
      }
    };

    const schedule = (): void => {
      if (frame === 0 && !failed) frame = requestAnimationFrame(measure);
    };

    const listen = (): void => {
      if (listening) return;
      listening = true;
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
    };

    const unlisten = (): void => {
      if (!listening) return;
      listening = false;
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };

    const cleanup = (): void => {
      unlisten();
      observer?.disconnect();
      observer = null;
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;
    };

    function fail(): void {
      if (failed) return;
      failed = true;
      cleanup();
      callbackRef.current(0);
    }

    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        callbackRef.current(1);
        return;
      }

      measure();
      observer = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (entry.isIntersecting) {
          listen();
          schedule();
        } else {
          unlisten();
          schedule(); // one last read so the end state is exact
        }
      });
      observer.observe(element);
    } catch {
      fail();
    }

    return cleanup;
  }, [ref]);
}
