import type { NavItem } from "./nav-items";

/** The label over the account pages in the rail. */
export const ACCOUNT_LABEL = "Account Settings";

/** The three settings pages, listed in the rail under {@link ACCOUNT_LABEL}. */
export const ACCOUNT_ITEMS: NavItem[] = [
  { href: "/settings/personal", label: "Personal info", icon: "profile", prefix: true },
  { href: "/settings/security", label: "Security", icon: "security", prefix: true },
  { href: "/settings/notifications", label: "Notifications", icon: "notifications", prefix: true },
];
