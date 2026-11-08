import Link from "next/link";

import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "overview", label: "Overview", href: "/vendor" },
  { key: "requests", label: "Requests", href: "/vendor/requests" },
  { key: "listing", label: "Listing", href: "/vendor/listing" },
  { key: "calendar", label: "Calendar", href: "/vendor/calendar" },
] as const;

export type NavKey = (typeof ITEMS)[number]["key"];

export function PillNav({ current }: { current: NavKey }): React.JSX.Element {
  return (
    <nav aria-label="Vendor sections" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-2">
        {ITEMS.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.key === current ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full px-5 text-sm font-medium md:min-h-9",
                item.key === current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
