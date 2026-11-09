import { Badge } from "@/components/ui/badge";

/** A small yellow count: the one colour reserved for "needs you now". */
export function CountBadge({ count, label }: { count: number; label: string }): React.JSX.Element | null {
  if (count <= 0) return null;
  return (
    <Badge variant="secondary" className="min-w-5 px-1.5 font-semibold tabular-nums" aria-label={`${count} ${label}`}>
      {count > 99 ? "99+" : count}
    </Badge>
  );
}
