import { Suspense } from "react";

import { ACCOUNT_ITEMS, ACCOUNT_LABEL } from "@/components/shell/account-items";
import { AppShell } from "@/components/shell/app-shell";
import { CountBadge } from "@/components/shell/count-badge";
import type { NavGroup, NavItem } from "@/components/shell/nav-items";
import { getPendingRequestCount } from "@/lib/move/dashboard-queries";

async function PendingCount(): Promise<React.JSX.Element> {
  const count = await getPendingRequestCount();
  return <CountBadge count={count} label="requests waiting for your answer" />;
}

/** The same four pages for every category. */
function pagesFor(
  base: string,
  extra: { dashboard?: Partial<NavItem>; listing?: Partial<NavItem>; profile?: Partial<NavItem> } = {},
): NavItem[] {
  return [
    { href: base, label: "Dashboard", icon: "home", tab: true, ...extra.dashboard },
    { href: `${base}/calendar`, label: "Calendar", icon: "calendar", tab: true, prefix: true },
    { href: `${base}/listing`, label: "Listings", icon: "listing", tab: true, prefix: true, ...extra.listing },
    { href: `${base}/profile`, label: "Vendor profile", icon: "business", tab: true, prefix: true, ...extra.profile },
  ];
}

const GROUPS: NavGroup[] = [
  {
    label: "Move",
    icon: "vehicle",
    href: "/v/move",
    items: pagesFor("/v/move", {
      dashboard: {
        also: ["/v/move/requests"],
        badge: (
          <Suspense fallback={null}>
            <PendingCount />
          </Suspense>
        ),
      },
      profile: { also: ["/v/move/onboarding"] },
    }),
  },
  { label: "Stay", icon: "stay", href: "/v/stay", items: pagesFor("/v/stay") },
  {
    label: "Vibe",
    icon: "vibe",
    href: "/v/vibe",
    items: pagesFor("/v/vibe", {
      // Vibe has many listings, so its page is plural.
      listing: { href: "/v/vibe/listings" },
      profile: { also: ["/v/vibe/onboarding"] },
    }),
  },
];

/** The vendor navigation, shared by the dashboard pages and account settings. */
export function VendorShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <AppShell role="Vendor" groups={GROUPS} footerItems={ACCOUNT_ITEMS} footerLabel={ACCOUNT_LABEL}>
      {children}
    </AppShell>
  );
}
