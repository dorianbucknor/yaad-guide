import { cn } from "@/lib/utils";

/** "Sangster International Airport (MBJ)" becomes "MBJ"; other names stay as they are. */
export function shortPlace(name: string): string {
  return name.match(/\(([A-Z]{3})\)$/)?.[1] ?? name;
}

/** Two places joined by a dashed route line: how a driver reads a job. */
export function RouteLine({ from, to, className }: { from: string; to: string; className?: string }): React.JSX.Element {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span className="sr-only">
        {from} to {to}
      </span>
      <span aria-hidden className="truncate font-medium">
        {shortPlace(from)}
      </span>
      <svg aria-hidden viewBox="0 0 40 8" className="h-2 w-9 shrink-0 text-brand dark:text-brand-light">
        <circle cx="3" cy="4" r="2.5" fill="currentColor" />
        <path d="M8 4h23" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" fill="none" />
        <path d="M31 1l7 3-7 3z" fill="currentColor" />
      </svg>
      <span aria-hidden className="truncate font-medium">
        {shortPlace(to)}
      </span>
    </span>
  );
}
