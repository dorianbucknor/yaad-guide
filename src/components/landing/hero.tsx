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
        {/* Plane: resting spot is partly tucked behind the headline's upper right. */}
        <Image
          src="/landing/plane.webp"
          alt=""
          width={947}
          height={478}
          className="pointer-events-none absolute top-4 right-[-2%] w-[50vw] max-w-[440px] animate-plane-fly motion-reduce:animate-none md:top-6 md:right-[2%] md:w-[30vw]"
        />
      </div>

      <div className="relative z-20 mx-auto flex max-w-6xl flex-col items-center px-4 pt-24 pb-12 text-center text-white md:px-6 md:pt-36">
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
