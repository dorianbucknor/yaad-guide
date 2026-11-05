"use client";

import Link from "next/link";
import { useState } from "react";
import { MenuIcon } from "lucide-react";

import { Logo } from "@/components/landing/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "#move", label: "Move" },
  { href: "#stay", label: "Stay" },
  { href: "#vibe", label: "Vibe" },
] as const;

export function SiteHeader(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const close = (): void => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" aria-label="YaadGuide home" className="flex items-center">
          <Logo className="h-9 w-auto" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <a key={href} href={href} className={buttonVariants({ variant: "ghost" })}>
              {label}
            </a>
          ))}
          <Link href="/auth/vendor" className={buttonVariants({ variant: "ghost" })}>
            Become a vendor
          </Link>
          <ThemeToggle />
          <Link href="/auth/sign-in" className={buttonVariants()}>
            Sign in
          </Link>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" aria-label="Open menu" />}
            >
              <MenuIcon aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">Site navigation</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    onClick={close}
                    className={buttonVariants({ variant: "ghost", className: "justify-start" })}
                  >
                    {label}
                  </a>
                ))}
                <Link
                  href="/auth/vendor"
                  onClick={close}
                  className={buttonVariants({ variant: "ghost", className: "justify-start" })}
                >
                  Become a vendor
                </Link>
                <Link href="/auth/sign-in" onClick={close} className={buttonVariants()}>
                  Sign in
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
