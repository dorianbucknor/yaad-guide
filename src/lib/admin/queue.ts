import { cache } from "react";

import { getListingQueue, getPlacesAdmin } from "@/lib/move/admin-queries";
import { getAdminQueue } from "@/lib/vendor/admin-queries";

export type QueueKind = "vendor" | "listing" | "flag" | "place" | "transfer";

export type QueueItem = {
  /** `<kind>:<id>`, used in the URL. */
  key: string;
  kind: QueueKind;
  id: string;
  title: string;
  subtitle: string;
  /** ISO time the item started waiting; transfers have none. */
  waitingSince: string | null;
  /** Extra detail for the right-hand panel. */
  note?: string | null;
};

export const KIND_LABEL: Record<QueueKind, string> = {
  vendor: "Vendor",
  listing: "Listing",
  flag: "Change",
  place: "Place",
  transfer: "Transfer",
};

const FLAG_LABEL: Record<string, string> = {
  price: "Prices changed",
  photo: "Vehicle photo changed",
  profile_photo: "Profile photo changed",
};

const item = (kind: QueueKind, id: string, rest: Omit<QueueItem, "key" | "kind" | "id">): QueueItem => ({
  key: `${kind}:${id}`,
  kind,
  id,
  ...rest,
});

/** Oldest first; items with no date last. */
export function sortQueue(items: readonly QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    if (a.waitingSince === b.waitingSince) return a.title.localeCompare(b.title);
    if (a.waitingSince === null) return 1;
    if (b.waitingSince === null) return -1;
    return a.waitingSince.localeCompare(b.waitingSince);
  });
}

/**
 * Everything waiting on an admin, from every queue the viewer may work, or null when
 * the viewer holds none of those permissions. Deduplicated within a request.
 */
export const getQueueItems = cache(async (): Promise<QueueItem[] | null> => {
  const [vendors, listings, places] = await Promise.all([getAdminQueue(), getListingQueue(), getPlacesAdmin()]);
  if (!vendors && !listings && !places) return null;

  const items: QueueItem[] = [];
  for (const p of vendors?.profiles ?? []) {
    items.push(
      item("vendor", p.id, {
        title: p.businessName || p.ownerName,
        subtitle: `${p.ownerName} · ${p.primaryRegion}`,
        waitingSince: p.submittedAt || null,
      }),
    );
  }
  for (const t of vendors?.transfers ?? []) {
    items.push(item("transfer", t.id, { title: `${t.label} ${t.plate}`.trim(), subtitle: "Vehicle transfer", waitingSince: null }));
  }
  for (const l of listings?.listings ?? []) {
    items.push(
      item("listing", l.id, {
        title: l.businessName,
        subtitle: `First listing · ${l.ownerName}`,
        waitingSince: l.submittedAt || null,
      }),
    );
  }
  for (const f of listings?.flags ?? []) {
    items.push(
      item("flag", f.id, {
        title: f.businessName,
        subtitle: FLAG_LABEL[f.kind] ?? "Listing changed",
        waitingSince: f.createdAt,
        note: f.listingId,
      }),
    );
  }
  for (const s of places?.suggestions ?? []) {
    items.push(
      item("place", s.id, {
        title: s.name,
        subtitle: `Suggested by ${s.businessName}`,
        waitingSince: s.createdAt,
        note: s.note,
      }),
    );
  }
  return sortQueue(items);
});
