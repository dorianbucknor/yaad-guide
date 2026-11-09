import type { ReactNode } from "react";

import type { ShellIcon } from "./shell-icons";

/** A top-level category (Move, Stay, Vibe) with its own pages, opened in the rail. */
export type NavGroup = {
  label: string;
  icon: ShellIcon;
  /** The category's root path; every page under it belongs to the group. */
  href: string;
  items: NavItem[];
};

export type NavItem = {
  href: string;
  label: string;
  icon: ShellIcon;
  /** Shown on the phone tab bar; the rest live in the menu sheet and the desktop rail. */
  tab?: boolean;
  /** Match every path under href, not just href itself. */
  prefix?: boolean;
  /** Other path prefixes that also mark this item as current. */
  also?: string[];
  /** A small count, usually from a server component. */
  badge?: ReactNode;
};
