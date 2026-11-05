import Image from "next/image";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
 * Layout contract: `children` (the quick-start) hangs below the hero by
 * var(--hero-overhang) (defined in globals.css), via a negative bottom margin. The section that follows
 * the hero must use pt-[var(--hero-overhang)] so nothing overlaps.
 *
 * Stacking: photo, scrim and plane share one clipped z-0 layer (plane last, so above the scrim); text and children are z-20.
 */
export function Hero({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate flow-root"
    >
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <Image
          src="/landing/beach-water.jpg"
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover"
        />
        {/* Scrim: brand-dark at 55%. Measured white text vs the lightest photo pixel under it (canvas, 1360px wide): sub-line 5.56:1 (needs 4.5), headline 5.59:1 (needs 3). Same photo and scrim in light and dark. 40% fails (4.04). */}
        <div className="absolute inset-0 bg-brand-dark/55" />
        {/*
          Plane: centered at rest (left-1/2 plus the translate property, which
          the animation's transform composes with), sized by --hero-plane-width
          in globals.css. Its white fuselage sits above the headline so white
          text never lands on white; only the dark wing tips reach the text.
        */}
        <Image
          src="/landing/plane.webp"
          alt=""
          loading="eager"
          width={947}
          height={478}
          className="pointer-events-none absolute top-2 left-1/2 w-(--hero-plane-width) max-w-none -translate-x-1/2 animate-plane-fly motion-reduce:animate-none"
        />
      </div>

      {/* Top padding follows the plane's height (width x 478/947), so the headline starts below the fuselage at every width. */}
      <div className="relative z-20 mx-auto flex max-w-6xl flex-col items-center px-4 pt-[calc(var(--hero-plane-width)*0.42)] pb-12 text-center text-white md:px-6">
        <h1
          id="hero-heading"
          className="max-w-3xl text-5xl font-bold tracking-tight text-balance [text-shadow:0_2px_16px_rgb(4_46_28/0.55)] md:text-7xl"
        >
          From Vision to Voyage
        </h1>
        <p className="mt-4 max-w-xl text-lg text-balance md:text-xl">
          Design your vacation to enjoy Jamaica, how you desire.
        </p>
        {/* A link styled as a button: Base UI's Button would add type="button" to the anchor and log an error in dev. */}
        <a
          href="#route"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            // Solid enough over the photo for 4.5:1 in dark mode (the outline variant's dark fill measured 4.47:1).
            "mt-8 text-foreground dark:bg-background/80",
            // Larger than the shared lg size (36px from md up): a page-level call to action.
            "h-12 px-8 text-base md:h-14 md:px-10 md:text-lg",
          )}
        >
          Learn more
        </a>
      </div>

      <div className="relative z-20 mx-auto mb-[calc(var(--hero-overhang)*-1)] max-w-6xl px-4 animate-quick-start-in motion-reduce:animate-none md:px-6">
        {children}
      </div>
    </section>
  );
}
