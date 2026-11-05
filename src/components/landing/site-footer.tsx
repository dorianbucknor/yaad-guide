import Link from "next/link";
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";

import { Logo, Wordmark } from "@/components/landing/logo";

// All placeholder links until those pages exist.
const LINK_GROUPS = [
  {
    heading: "Company",
    links: ["About", "Features", "Pricing", "Gallery", "Team"],
  },
  {
    heading: "Policies",
    links: ["Privacy Policy", "Terms of Use", "Sales and Refunds", "Legal", "Site Map"],
  },
] as const;

// 44px tap height below md, compact from md up.
const linkClass =
  "inline-flex min-h-11 items-center gap-2 rounded-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8";

export function SiteFooter(): React.JSX.Element {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:px-6">
        <div>
          <Link href="/" aria-label="YaadGuide home" className="inline-flex min-h-11 items-center gap-2.5 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Logo className="h-10 w-auto" />
            <Wordmark className="text-2xl md:text-3xl" />
          </Link>
          <p className="mt-4 max-w-[30ch] text-muted-foreground">
            Your digital travel agent for Jamaica.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold">Contact</h2>
          <ul className="mt-3 flex flex-col">
            <li>
              <a href="tel:+18762859013" className={linkClass}>
                <PhoneIcon aria-hidden="true" className="size-4 shrink-0" />
                <span>
                  <span className="sr-only">Phone: </span>+1 876 285-9013
                </span>
              </a>
            </li>
            <li>
              <a href="mailto:info@yaad-guide.com" className={linkClass}>
                <MailIcon aria-hidden="true" className="size-4 shrink-0" />
                <span>
                  <span className="sr-only">Email: </span>info@yaad-guide.com
                </span>
              </a>
            </li>
            <li className="flex min-h-11 items-center gap-2 text-muted-foreground md:min-h-8">
              <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
              <address className="not-italic">Papine, Kingston, Jamaica</address>
            </li>
          </ul>
        </div>

        {LINK_GROUPS.map(({ heading, links }) => (
          <nav key={heading} aria-labelledby={`footer-${heading.toLowerCase()}`}>
            <h2 id={`footer-${heading.toLowerCase()}`} className="text-base font-semibold">
              {heading}
            </h2>
            <ul className="mt-3 flex flex-col">
              {links.map((label) => (
                <li key={label}>
                  <a href="#" className={linkClass}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
