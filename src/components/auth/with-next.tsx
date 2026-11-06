import type { ReactNode } from "react";

import { safeNextPath } from "@/lib/auth/next-path";

/** Reads `?next=` (validated) and hands it to a render function. Wrap in Suspense. */
export async function WithNext({
  searchParams,
  children,
}: {
  searchParams: Promise<{ next?: string }>;
  children: (next: string) => ReactNode;
}): Promise<React.JSX.Element> {
  const { next } = await searchParams;
  return <>{children(safeNextPath(next))}</>;
}
