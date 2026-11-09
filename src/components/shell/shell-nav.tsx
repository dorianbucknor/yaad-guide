"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { LuChevronRight, LuLogOut } from "react-icons/lu";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

import type { NavGroup, NavItem } from "./nav-items";
import { SHELL_ICONS } from "./shell-icons";

function useIsActive(): (item: NavItem) => boolean {
  const pathname = usePathname();
  return (item) =>
    item.href === pathname ||
    (item.prefix === true && pathname.startsWith(`${item.href}/`)) ||
    (item.also ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** The logo opens or closes the rail on desktop; on a phone it opens the menu sheet. */
export function LogoToggle({ role }: { role: string }): React.JSX.Element {
  const { toggleSidebar, state } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={state === "collapsed" ? "Open the menu" : "Close the menu"}
      className="flex items-center gap-2.5 rounded-md px-2 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:px-0"
    >
      <Image src="/brand/logo-white.svg" alt="" width={40} height={28} unoptimized className="h-7 w-auto shrink-0" />
      <span className="flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
        <span className="text-lg leading-none font-semibold tracking-tight">YaadGuide</span>
        <span className="text-sm text-sidebar-foreground/75">{role}</span>
      </span>
    </button>
  );
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
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function inGroup(pathname: string, group: NavGroup): boolean {
  return pathname === group.href || pathname.startsWith(`${group.href}/`);
}

/** The categories: each opens to its own pages. The one you are in starts open. */
export function GroupMenu({ groups }: { groups: NavGroup[] }): React.JSX.Element {
  const pathname = usePathname();
  const isActive = useIsActive();
  const { setOpenMobile, setOpen, state, isMobile } = useSidebar();
  // Controlled, so moving between categories can open one without Base UI warning.
  const [open, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.filter((g) => inGroup(pathname, g)).map((g) => [g.href, true])),
  );
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    const entered = groups.find((g) => inGroup(pathname, g));
    if (entered && !open[entered.href]) setOpenGroups({ ...open, [entered.href]: true });
  }
  return (
    <SidebarMenu>
      {groups.map((group) => {
        const Icon = SHELL_ICONS[group.icon];
        const here = inGroup(pathname, group);
        return (
          <Collapsible
            key={group.href}
            open={open[group.href] ?? false}
            onOpenChange={(next) => setOpenGroups((prev) => ({ ...prev, [group.href]: next }))}
            render={<SidebarMenuItem />}
            className="group/collapsible"
          >
            <CollapsibleTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  tooltip={group.label}
                  isActive={here && state === "collapsed" && !isMobile}
                  className="font-medium hover:bg-white/10 hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
                  onClick={() => {
                    if (state === "collapsed" && !isMobile) setOpen(true);
                  }}
                />
              }
            >
              <Icon aria-hidden />
              <span className="group-data-[collapsible=icon]:hidden">{group.label}</span>
              <LuChevronRight
                aria-hidden
                className="ml-auto transition-transform group-data-[panel-open]/menu-button:rotate-90 group-data-[collapsible=icon]:hidden"
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {group.items.map((item) => {
                  const active = isActive(item);
                  return (
                    <SidebarMenuSubItem key={item.href}>
                      <SidebarMenuSubButton
                        isActive={active}
                        className="h-9 text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
                        render={
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setOpenMobile(false)}
                          />
                        }
                      >
                        <span>{item.label}</span>
                        {item.badge ? <span className="ml-auto">{item.badge}</span> : null}
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </SidebarMenu>
  );
}

/** The phone tab bar: the main sections within thumb reach. */
export function TabBar({
  items,
  groups,
  label,
}: {
  items?: NavItem[];
  groups?: NavGroup[];
  label: string;
}): React.JSX.Element {
  const isActive = useIsActive();
  const pathname = usePathname();
  // With categories, the bar shows the pages of the one you are in; the menu sheet switches category.
  const current = groups?.find((g) => inGroup(pathname, g)) ?? groups?.[0];
  const tabs = current ? current.items : (items ?? []).filter((item) => item.tab);
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
export function FooterMenu({ items, label }: { items: NavItem[]; label?: string }): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  return (
    <>
      <SidebarGroup className="p-0">
        {label ? <SidebarGroupLabel className="text-sidebar-foreground/60">{label}</SidebarGroupLabel> : null}
        <RailMenu items={items} />
      </SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            tooltip="Sign out"
            disabled={pending}
            className="font-medium hover:bg-white/10 hover:text-sidebar-foreground"
            onClick={() => startTransition(() => signOutAction())}
          >
            {pending ? <Spinner /> : <LuLogOut aria-hidden />}
            <span className="group-data-[collapsible=icon]:hidden">{pending ? "Signing out…" : "Sign out"}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
