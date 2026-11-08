import { Suspense } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { CountBadge } from "@/components/shell/count-badge";
import type { NavItem } from "@/components/shell/nav-items";
import { getQueueItems } from "@/lib/admin/queue";

async function WaitingCount(): Promise<React.JSX.Element> {
  const items = await getQueueItems();
  return <CountBadge count={items?.length ?? 0} label="items waiting for review" />;
}

const ITEMS: NavItem[] = [
  {
    href: "/admin",
    label: "Queue",
    icon: "queue",
    tab: true,
    badge: (
      <Suspense fallback={null}>
        <WaitingCount />
      </Suspense>
    ),
  },
  { href: "/admin/vendors", label: "Vendors", icon: "vendors", tab: true, prefix: true },
  { href: "/admin/listings", label: "Listings", icon: "listing", tab: true, prefix: true },
  { href: "/admin/places", label: "Places", icon: "places", tab: true, prefix: true },
];

const FOOTER: NavItem[] = [{ href: "/settings", label: "Account settings", icon: "settings", prefix: true }];

export default function AdminLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <AppShell role="Admin" items={ITEMS} footerItems={FOOTER}>
      {children}
    </AppShell>
  );
}
