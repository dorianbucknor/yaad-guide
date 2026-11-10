import type { VendorStatus } from "@/lib/vendor/types";

/** `?entity=new` asks the setup pages for an empty form for an additional business. */
export const NEW_ENTITY = "new";

/**
 * A link to a page for one business. With a single business the plain address is kept, so every
 * existing link and bookmark still works; the business is named only once there are several.
 */
export function entityHref(base: string, entityCount: number, entityId: string): string {
  return entityCount > 1 ? `${base}?entity=${entityId}` : base;
}

/** A listing title with its business in brackets, when the vendor has several and the business has a name. */
export function withEntity(title: string, entityName: string | null, show: boolean): string {
  return show && entityName ? `${title} (${entityName})` : title;
}

/**
 * Which business's state the setup prompt describes when none is approved yet: one with an admin
 * first, then a rejection (the vendor has something to fix), then whichever was created first.
 */
export function setupStatus(entities: readonly { status: VendorStatus }[]): VendorStatus | undefined {
  if (entities.length === 0) return undefined;
  for (const status of ["pending", "rejected"] as const) {
    if (entities.some((e) => e.status === status)) return status;
  }
  return entities[0].status;
}
