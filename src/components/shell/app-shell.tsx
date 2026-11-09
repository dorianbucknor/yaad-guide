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

import { Logo } from "@/components/landing/logo";
import type { NavGroup, NavItem } from "./nav-items";
import { FooterMenu, GroupMenu, LogoToggle, RailMenu, TabBar } from "./shell-nav";

/**
 * Shared frame for the vendor and admin areas: a rail on desktop, a tab bar on phones
 * (the same items open as a menu sheet from the top bar), and one main landmark.
 */
export function AppShell({
  role,
  items,
  groups,
  footerItems,
  footerLabel,
  children,
}: {
  /** "Vendor" or "Admin". */
  role: string;
  /** A flat list of pages. */
  items?: NavItem[];
  /** Or categories, each with its own pages. */
  groups?: NavGroup[];
  /** Account links at the foot of the rail and menu sheet. */
  footerItems: NavItem[];
  /** A muted label over the footer links. */
  footerLabel?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <SidebarProvider data-shell>
      <Sidebar collapsible="icon">
        <SidebarHeader className="flex-row items-center justify-between gap-1 px-3 py-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <LogoToggle role={role} />
          <SidebarTrigger
            aria-label="Collapse the menu"
            className="hidden size-9 text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden md:inline-flex"
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              {groups ? <GroupMenu groups={groups} /> : <RailMenu items={items ?? []} />}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="pb-4">
          <FooterMenu items={footerItems} label={footerLabel} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 pb-20 md:pb-0">
        <header className="flex h-14 items-center gap-2 border-b border-border px-4 md:hidden">
          <SidebarTrigger aria-label="Open menu" className="size-11" />
          <Logo className="h-6 w-auto" />
          <span className="font-semibold tracking-tight">YaadGuide</span>
          <span className="text-sm text-muted-foreground">{role}</span>
        </header>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </SidebarInset>
      <TabBar items={items} groups={groups} label={`${role} sections`} />
    </SidebarProvider>
  );
}
