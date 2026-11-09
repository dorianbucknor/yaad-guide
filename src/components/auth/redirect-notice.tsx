"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LuCircleCheck } from "react-icons/lu";

import { buttonVariants } from "@/components/ui/button";

const DELAY_MS = 2200;

/** A short confirmation, then on to the next page. The button skips the wait. */
export function RedirectNotice({
  to,
  title,
  body,
  label,
}: {
  to: string;
  title: string;
  body: string;
  label: string;
}): React.JSX.Element {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => router.replace(to), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [router, to]);

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-light text-brand-dark dark:bg-primary/30 dark:text-foreground">
        <LuCircleCheck className="size-7" aria-hidden />
      </span>
      <div role="status" className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{body}</p>
      </div>
      <div
        aria-hidden
        className="h-1 w-40 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full origin-left rounded-full bg-primary motion-safe:animate-[redirect-fill_2.2s_linear_forwards] motion-reduce:w-full"
        />
      </div>
      <Link href={to} replace className={buttonVariants({ variant: "outline" })}>
        {label}
      </Link>
    </main>
  );
}
