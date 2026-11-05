import Link from "next/link";
import { BedDoubleIcon, CarFrontIcon, PalmtreeIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PILLARS = [
  { icon: BedDoubleIcon, label: "Hotels and villas" },
  { icon: CarFrontIcon, label: "Airport transfers and drivers" },
  { icon: PalmtreeIcon, label: "Tours, food and events" },
] as const;

/*
 * A link styled as a button (buttonVariants on next/link), not <Button render={<Link />}>:
 * Base UI's Button would add role="button" (or type="button") to the anchor, which hides
 * that it is a link from screen readers.
 */
export function VendorCta(): React.JSX.Element {
  return (
    <section aria-labelledby="vendor-heading" className="pb-16 md:pb-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="rounded-[2.5rem] bg-accent px-6 py-12 text-accent-foreground md:px-16 md:py-16">
          <h2
            id="vendor-heading"
            className="max-w-2xl text-3xl font-bold tracking-tight text-balance md:text-5xl"
          >
            Run a stay, a ride or things to do in Jamaica?
          </h2>
          <p className="mt-4 max-w-[60ch] text-lg">
            List your business on YaadGuide and reach independent travelers while
            they plan their trip. Set up a vendor profile, add your listings and
            take bookings.
          </p>
          <ul className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8">
            {PILLARS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 font-medium">
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {label}
              </li>
            ))}
          </ul>
          <Link
            href="/auth/vendor"
            // Larger than the shared lg size (36px from md up): a page-level call to action.
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-10 h-12 px-8 text-base md:h-14 md:px-10 md:text-lg",
            )}
          >
            Become a vendor
          </Link>
        </div>
      </div>
    </section>
  );
}
