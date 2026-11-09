import { Skeleton } from "@/components/skeleton";

export type TabSkeletonKind = "board" | "calendar" | "listing";

function BoardRows(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="grid grid-cols-[6rem_1fr_5rem] items-center gap-4 py-2">
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-8" />
        </div>
      ))}
    </div>
  );
}

/** A stand-in for a locked tab, drawn in the shape of the real page. */
export function TabSkeleton({ kind }: { kind: TabSkeletonKind }): React.JSX.Element {
  if (kind === "calendar") {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-96 max-w-sm rounded-2xl" />
        <Skeleton className="h-6 max-w-xs" />
        <Skeleton className="h-10 max-w-md rounded-xl" />
      </div>
    );
  }
  if (kind === "listing") {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 max-w-md rounded-xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-11 max-w-xs rounded-xl" />
      </div>
    );
  }
  return <BoardRows />;
}
