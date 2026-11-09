import Link from "next/link";

import { SHELL_ICONS } from "@/components/shell/shell-icons";
import { buttonVariants } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { setupPromptCopy, type SetupCategory } from "@/lib/vendor/setup-copy";
import type { VendorStatus } from "@/lib/vendor/types";
import { cn } from "@/lib/utils";

type Icon = (typeof SHELL_ICONS)[keyof typeof SHELL_ICONS];

/**
 * The one look for a message that sits where a vendor's page would be: an icon, a title, a plain
 * sentence, and one action. Setup prompts and "coming soon" notices share it so the vendor
 * pages read as one product. `floating` lifts it onto a shadow for use over a blurred preview.
 */
export function VendorPrompt({
  icon: Icon,
  title,
  description,
  action,
  floating = false,
  className,
}: {
  icon: Icon;
  title: string;
  description: string;
  action?: React.ReactNode;
  floating?: boolean;
  className?: string;
}): React.JSX.Element {
  return (
    <Item
      variant="outline"
      className={cn(
        // Stacked on a phone, so the sentence keeps its width; the action moves to the right from `sm`.
        "max-w-2xl flex-col items-stretch gap-4 p-5 sm:flex-row sm:items-center",
        floating ? "bg-card shadow-lg" : "bg-brand-light/40 dark:bg-primary/15",
        className,
      )}
    >
      <div className="flex flex-1 items-start gap-4">
        <ItemMedia variant="icon" className="size-10 rounded-full bg-brand-light text-brand-dark dark:bg-primary/30 dark:text-foreground">
          <Icon aria-hidden className="size-5" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="line-clamp-none text-base">{title}</ItemTitle>
          <ItemDescription className="line-clamp-none max-w-[60ch]">{description}</ItemDescription>
        </ItemContent>
      </div>
      {action ? <ItemActions className="w-full sm:w-auto sm:shrink-0 [&>*]:w-full sm:[&>*]:w-auto">{action}</ItemActions> : null}
    </Item>
  );
}

const CATEGORY_ICON: Record<SetupCategory, Icon> = {
  move: SHELL_ICONS.vehicle,
  vibe: SHELL_ICONS.vibe,
};

/**
 * "Set up your vendor profile" for one category, worded by `setupPromptCopy` so every vendor page
 * says the same thing about the same state. Nothing is shown to an approved vendor: callers render
 * it only while the profile is missing, a draft, rejected or pending.
 */
export function SetupPrompt({
  category,
  status,
  setupHref,
  profileHref = setupHref,
  lead,
  floating,
  className,
}: {
  category: SetupCategory;
  status: VendorStatus | undefined;
  /** Where the setup steps are. */
  setupHref: string;
  /** Where a profile that is with an admin is shown; defaults to the setup page. */
  profileHref?: string;
  /** A sentence about the page the vendor was trying to open. */
  lead?: string;
  floating?: boolean;
  className?: string;
}): React.JSX.Element {
  const copy = setupPromptCopy({ category, status, lead });
  return (
    <VendorPrompt
      icon={CATEGORY_ICON[category]}
      title={copy.title}
      description={copy.body}
      floating={floating}
      className={className}
      action={
        <Link href={copy.step === "view" ? profileHref : setupHref} className={buttonVariants()}>
          {copy.cta}
        </Link>
      }
    />
  );
}
