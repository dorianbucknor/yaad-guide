"use client";

import BaseSkeleton, { SkeletonTheme } from "react-loading-skeleton";

import { cn } from "@/lib/utils";

/** The app's loading placeholder: react-loading-skeleton, sized and rounded with classes. */
export function Skeleton({
  className,
}: {
  className?: string;
  "aria-busy"?: boolean | "true" | "false";
}): React.JSX.Element {
  return (
    <SkeletonTheme baseColor="var(--muted)" highlightColor="var(--card)">
      <BaseSkeleton
        className={cn("block", className)}
        containerClassName={cn("block", className?.includes("size-full") ? "size-full" : "w-full")}
        containerTestId="skeleton"
        inline={false}
      />
    </SkeletonTheme>
  );
}
