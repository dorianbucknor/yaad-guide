"use client";

import { useRouter } from "next/navigation";

import { ItemSelect } from "@/components/move/item-select";
import type { VibeEntity } from "@/lib/vibe/entities";
import { entityHref } from "@/lib/vibe/entity-view";

/** Switches the page between the vendor's businesses. Shown only when there are two or more. */
export function EntitySwitcher({
  entities,
  currentId,
  base,
}: {
  entities: readonly VibeEntity[];
  currentId: string | null;
  /** The page to reopen for the chosen business, such as `/v/vibe/profile`. */
  base: string;
}): React.JSX.Element | null {
  const router = useRouter();
  if (entities.length < 2) return null;
  return (
    <div className="max-w-sm">
      <ItemSelect
        id="entity-switcher"
        label="Business"
        items={entities.map((e) => ({ value: e.id, label: e.businessName ?? "Unnamed business" }))}
        value={currentId}
        onChange={(id) => router.push(entityHref(base, entities.length, id))}
      />
    </div>
  );
}
