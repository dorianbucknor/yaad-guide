import type { ReactNode } from "react";

import type { ShellIcon } from "./shell-icons";

export type NavItem = {
  href: string;
  label: string;
  icon: ShellIcon;
  /** Shown on the phone tab bar; the rest live in the menu sheet and the desktop rail. */
  tab?: boolean;
  /** Match every path under href, not just href itself. */
  prefix?: boolean;
  /** A small count, usually from a server component. */
  badge?: ReactNode;
};
