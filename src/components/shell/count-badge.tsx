/** A small yellow count: the one colour reserved for "needs you now". */
export function CountBadge({ count, label }: { count: number; label: string }): React.JSX.Element | null {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-semibold text-secondary-foreground tabular-nums"
      aria-label={`${count} ${label}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
