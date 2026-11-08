"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { LuLogOut } from "react-icons/lu";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

import type { NavItem } from "./nav-items";
import { SHELL_ICONS } from "./shell-icons";

function useIsActive(): (item: NavItem) => boolean {
  const pathname = usePathname();
  return (item) =>
    item.href === pathname || (item.prefix === true && pathname.startsWith(`${item.href}/`));
}

/** The desktop rail's menu (also the phone menu sheet). */
export function RailMenu({ items }: { items: NavItem[] }): React.JSX.Element {
  const isActive = useIsActive();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = SHELL_ICONS[item.icon];
        const active = isActive(item);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              size="lg"
              tooltip={item.label}
              isActive={active}
              className="font-medium hover:bg-white/10 hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
              render={
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpenMobile(false)}
                />
              }
            >
              <Icon aria-hidden />
              <span>{item.label}</span>
              {item.badge ? <span className="ml-auto">{item.badge}</span> : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

/** The phone tab bar: the main sections within thumb reach. */
export function TabBar({ items, label }: { items: NavItem[]; label: string }): React.JSX.Element {
  const isActive = useIsActive();
  const tabs = items.filter((item) => item.tab);
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((item) => {
          const Icon = SHELL_ICONS[item.icon];
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground outline-none focus-visible:bg-muted aria-[current=page]:text-foreground"
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    active && "bg-brand-light text-brand-dark dark:bg-primary/30 dark:text-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                {item.label}
                {item.badge ? <span className="absolute top-1.5 left-1/2 ml-2">{item.badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Account links at the foot of the rail, then sign out. */
export function FooterMenu({ items }: { items: NavItem[] }): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  return (
    <>
      <RailMenu items={items} />
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            tooltip="Sign out"
            disabled={pending}
            className="font-medium hover:bg-white/10 hover:text-sidebar-foreground"
            onClick={() => startTransition(() => signOutAction())}
          >
            <LuLogOut aria-hidden />
            <span>{pending ? "Signing out…" : "Sign out"}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
