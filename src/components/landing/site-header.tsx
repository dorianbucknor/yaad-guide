"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { MenuIcon } from "lucide-react";

import { AccountMenu } from "@/components/auth/account-menu";
import { Logo, Wordmark } from "@/components/landing/logo";
import { signOutAction } from "@/lib/auth/actions";
import type { HeaderViewer } from "@/lib/auth/header-viewer";
import { cn } from "@/lib/utils";
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

const VENDOR_CLASS = "font-bold text-brand-dark dark:text-foreground";

export function SiteHeader({
  viewer = null,
}: {
  viewer?: HeaderViewer | null;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const showVendorLink = viewer === null || viewer.role === "traveler";
  const close = (): void => setOpen(false);
  const pendingAnchor = useRef<string | null>(null);

  // The sheet is modal (scroll locked, focus trapped), so a native anchor jump
  // during the click is undone by the unlock and focus returns to the menu
  // trigger. Defer the jump until the sheet has fully closed instead.
  const goToAnchor = (event: React.MouseEvent<HTMLAnchorElement>, id: string): void => {
    event.preventDefault();
    pendingAnchor.current = id;
    close();
  };

  const landPendingAnchor = (isOpen: boolean): void => {
    if (isOpen || pendingAnchor.current === null) return;
    const target = document.getElementById(pendingAnchor.current);
    pendingAnchor.current = null;
    if (!target) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    target.focus({ preventScroll: true });
    history.replaceState(null, "", `#${target.id}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white dark:bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      {/*
        From md up a three-column grid: the two 1fr side columns are equal, so the
        nav in the auto middle column sits at the true center whatever the logo and
        the actions measure. Below md: logo and menu at either end.
      */}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:grid md:grid-cols-[1fr_auto_1fr] md:px-6">
        <Link href="/" aria-label="YaadGuide home" className="flex min-h-11 items-center gap-2 justify-self-start">
          <Logo className="h-7 w-auto" />
          <Wordmark className="text-lg md:text-xl" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <a key={href} href={href} className={buttonVariants({ variant: "ghost" })}>
              {label}
            </a>
          ))}
        </nav>

        {/* Sign in is the filled button; Become a vendor is a bold ghost link. Yellow stays reserved for the quick-start's Create itinerary. */}
        <div className="hidden items-center gap-1 justify-self-end md:flex">
          {showVendorLink ? (
            <Link href="/auth/vendor" className={buttonVariants({ variant: "ghost", className: VENDOR_CLASS })}>
              Become a vendor
            </Link>
          ) : null}
          <ThemeToggle />
          {viewer ? (
            <AccountMenu viewer={viewer} />
          ) : (
            <Link href="/auth/sign-in" className={buttonVariants()}>
              Sign in
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen} onOpenChangeComplete={landPendingAnchor}>
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
                    onClick={(event) => goToAnchor(event, href.slice(1))}
                    className={buttonVariants({ variant: "ghost", className: "justify-start" })}
                  >
                    {label}
                  </a>
                ))}
                {showVendorLink ? (
                  <Link href="/auth/vendor" onClick={close} className={buttonVariants({ variant: "ghost", className: cn(VENDOR_CLASS, "mt-2") })}>
                    Become a vendor
                  </Link>
                ) : null}
                {viewer ? (
                  <>
                    <Link href="/profile" onClick={close} className={buttonVariants({ variant: "ghost", className: "justify-start" })}>
                      Profile
                    </Link>
                    {viewer.role !== "traveler" ? (
                      <Link href="/vendor" onClick={close} className={buttonVariants({ variant: "ghost", className: "justify-start" })}>
                        Vendor home
                      </Link>
                    ) : null}
                    <form action={signOutAction}>
                      <Button type="submit" variant="outline" className="w-full">
                        Sign out
                      </Button>
                    </form>
                  </>
                ) : (
                  <Link href="/auth/sign-in" onClick={close} className={buttonVariants()}>
                    Sign in
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
