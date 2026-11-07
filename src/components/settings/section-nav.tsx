"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/settings/personal", label: "Personal info" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/notifications", label: "Notifications" },
] as const;

/** Section links: a list above the content on small screens, a side list from md up. */
export function SectionNav(): React.JSX.Element {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections">
      <ul className="flex flex-wrap gap-1 md:flex-col">
        {SECTIONS.map((section) => {
          const current = pathname === section.href;
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium outline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  current
                    ? "bg-brand-light text-brand-dark dark:bg-accent dark:text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
