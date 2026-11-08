import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import type { NavItem } from "./nav-items";
import { FooterMenu, RailMenu, TabBar } from "./shell-nav";

/**
 * Shared frame for the vendor and admin areas: a rail on desktop, a tab bar on phones
 * (the same items open as a menu sheet from the top bar), and one main landmark.
 */
export function AppShell({
  role,
  items,
  footerItems,
  children,
}: {
  /** "Vendor" or "Admin". */
  role: string;
  items: NavItem[];
  /** Account links at the foot of the rail and menu sheet. */
  footerItems: NavItem[];
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <SidebarProvider data-shell>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-4">
          <Link
            href="/"
            className="flex flex-col gap-0.5 rounded-md px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <span className="text-lg leading-none font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
              YaadGuide
            </span>
            <span className="text-sm text-sidebar-foreground/75 group-data-[collapsible=icon]:hidden">{role}</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <RailMenu items={items} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="pb-4">
          <FooterMenu items={footerItems} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 pb-20 md:pb-0">
        <header className="flex h-14 items-center gap-2 border-b border-border px-4 md:hidden">
          <SidebarTrigger aria-label="Open menu" className="size-11" />
          <span className="font-semibold tracking-tight">YaadGuide</span>
          <span className="text-sm text-muted-foreground">{role}</span>
        </header>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </SidebarInset>
      <TabBar items={items} label={`${role} sections`} />
    </SidebarProvider>
  );
}
