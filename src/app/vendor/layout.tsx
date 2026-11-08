import { Suspense } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { CountBadge } from "@/components/shell/count-badge";
import type { NavItem } from "@/components/shell/nav-items";
import { getPendingRequestCount } from "@/lib/move/dashboard-queries";

async function PendingCount(): Promise<React.JSX.Element> {
  const count = await getPendingRequestCount();
  return <CountBadge count={count} label="requests waiting for your answer" />;
}

const ITEMS: NavItem[] = [
  { href: "/vendor", label: "Home", icon: "home", tab: true },
  {
    href: "/vendor/requests",
    label: "Requests",
    icon: "inbox",
    tab: true,
    prefix: true,
    badge: (
      <Suspense fallback={null}>
        <PendingCount />
      </Suspense>
    ),
  },
  { href: "/vendor/calendar", label: "Calendar", icon: "calendar", tab: true, prefix: true },
  { href: "/vendor/listing", label: "Listing", icon: "listing", tab: true, prefix: true },
  { href: "/vendor/onboarding/documents", label: "Vehicles and documents", icon: "vehicle", prefix: true },
];

const FOOTER: NavItem[] = [{ href: "/settings", label: "Account settings", icon: "settings", prefix: true }];

export default function VendorLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <AppShell role="Vendor" items={ITEMS} footerItems={FOOTER}>
      {children}
    </AppShell>
  );
}
