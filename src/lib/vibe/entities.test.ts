import { describe, expect, it } from "vitest";

import type { Client } from "@/lib/auth/action-helpers";

import { listMyVibeEntities, resolveVibeEntity } from "./entities";

const row = (id: string, name: string) => ({
  id,
  business_name: name,
  primary_region: "St. Ann",
  status: "approved",
  review_note: null,
  submitted_at: null,
});

/** A client whose vendor_profiles query returns the given rows, whatever filters are chained. */
function clientWith(rows: ReturnType<typeof row>[]): Client {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return { from: () => builder } as unknown as Client;
}

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("listMyVibeEntities", () => {
  it("maps each row to an entity", async () => {
    const entities = await listMyVibeEntities(clientWith([row(A, "Dolphin Cove Ltd")]), "u1");
    expect(entities).toEqual([
      {
        id: A,
        businessName: "Dolphin Cove Ltd",
        primaryRegion: "St. Ann",
        status: "approved",
        reviewNote: null,
        submittedAt: null,
      },
    ]);
  });
});

describe("resolveVibeEntity", () => {
  it("returns the only entity when no id is given", async () => {
    const entity = await resolveVibeEntity(clientWith([row(A, "One")]), "u1", undefined);
    expect(entity?.id).toBe(A);
  });

  it("returns null when there are two entities and no id, rather than choosing one", async () => {
    const entity = await resolveVibeEntity(clientWith([row(A, "One"), row(B, "Two")]), "u1", undefined);
    expect(entity).toBeNull();
  });

  it("returns the entity with the given id", async () => {
    const entity = await resolveVibeEntity(clientWith([row(A, "One"), row(B, "Two")]), "u1", B);
    expect(entity?.businessName).toBe("Two");
  });

  it("returns null for an id the account does not own", async () => {
    const entity = await resolveVibeEntity(clientWith([row(A, "One")]), "u1", B);
    expect(entity).toBeNull();
  });

  it("returns null when the account has no entities", async () => {
    expect(await resolveVibeEntity(clientWith([]), "u1", undefined)).toBeNull();
  });
});
