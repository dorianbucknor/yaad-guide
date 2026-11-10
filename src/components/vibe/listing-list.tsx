import Link from "next/link";

import { SHELL_ICONS } from "@/components/shell/shell-icons";
import { buttonVariants } from "@/components/ui/button";
import { VendorPrompt } from "@/components/vendor/setup-prompt";
import type { VibeListingSummary } from "@/lib/vibe/types";

import { SortedListings } from "./sorted-listings";

/** The vendor's listings, one row each, with the next open slot and a sort control. */
export function ListingList({ listings }: { listings: VibeListingSummary[] }): React.JSX.Element {
  if (listings.length === 0) {
    return (
      <VendorPrompt
        icon={SHELL_ICONS.vibe}
        title="No listings yet"
        description="Add an event or an attraction, set its tickets and times, then send it for review."
        action={
          <Link href="/v/vibe/listings/new" className={buttonVariants()}>
            New listing
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/v/vibe/listings/new" className={buttonVariants()}>
          New listing
        </Link>
      </div>
      <SortedListings listings={listings} />
    </div>
  );
}
