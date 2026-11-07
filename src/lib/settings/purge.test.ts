import { beforeEach, describe, expect, it } from "vitest";

import { purgeArchivedAccounts, type PurgeClient } from "./purge";

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

type Profile = { profile_status: string; archived_at: string | null };

function makeFake(options: {
  due: string[];
  profiles: Record<string, Profile>;
  failDeleteFor?: string;
}) {
  const log: string[] = [];
  const files: Record<string, string[]> = {
    avatars: ["a1/photo.png", "a2/photo.png"],
    "vendor-documents": ["a1/id.pdf", "a2/id.pdf"],
  };

  const client: PurgeClient = {
    rpc: async (name, args) => {
      log.push(`rpc:${name}${args && "p_account_id" in args ? `:${args.p_account_id}` : ""}`);
      if (name === "accounts_due_for_purge") return { data: options.due, error: null };
      return { data: null, error: null };
    },
    from: () => ({
      select: () => ({
        eq: (_column: string, id: string) => ({
          maybeSingle: async () => ({ data: options.profiles[id] ?? null, error: null }),
        }),
      }),
    }),
    storage: {
      from: (bucket: string) => ({
        list: async (prefix: string) => ({
          data: (files[bucket] ?? [])
            .filter((path) => path.startsWith(`${prefix}/`))
            .map((path) => ({ name: path.slice(prefix.length + 1), id: "file" })),
          error: null,
        }),
        remove: async (paths: string[]) => {
          log.push(`remove:${bucket}:${paths.join(",")}`);
          files[bucket] = (files[bucket] ?? []).filter((p) => !paths.includes(p));
          return { error: null };
        },
      }),
    },
    auth: {
      admin: {
        deleteUser: async (id: string) => {
          log.push(`deleteUser:${id}`);
          if (id === options.failDeleteFor) return { error: { message: "boom" } };
          return { error: null };
        },
      },
    },
  };
  return { client, log };
}

const archived = (days: number): Profile => ({ profile_status: "archived", archived_at: ago(days) });

beforeEach(() => undefined);

describe("purgeArchivedAccounts", () => {
  it("purges two due accounts, removing files before deleting the user", async () => {
    const { client, log } = makeFake({
      due: ["a1", "a2"],
      profiles: { a1: archived(8), a2: archived(9) },
    });
    const result = await purgeArchivedAccounts(client);
    expect(result.purged).toEqual(["a1", "a2"]);
    expect(result.failed).toEqual([]);
    expect(log.indexOf("remove:avatars:a1/photo.png")).toBeLessThan(log.indexOf("deleteUser:a1"));
    expect(log.indexOf("remove:vendor-documents:a1/id.pdf")).toBeLessThan(log.indexOf("deleteUser:a1"));
    expect(log.indexOf("rpc:scrub_audit_for_account:a1")).toBeLessThan(log.indexOf("deleteUser:a1"));
  });

  it("scrubs the audit log again after the user is deleted", async () => {
    const { client, log } = makeFake({ due: ["a1"], profiles: { a1: archived(8) } });
    await purgeArchivedAccounts(client);
    expect(log.lastIndexOf("rpc:scrub_audit_for_account:a1")).toBeGreaterThan(
      log.indexOf("deleteUser:a1"),
    );
  });

  it("skips an account that is no longer archived", async () => {
    const { client, log } = makeFake({
      due: ["a1"],
      profiles: { a1: { profile_status: "active", archived_at: null } },
    });
    const result = await purgeArchivedAccounts(client);
    expect(result.purged).toEqual([]);
    expect(log.some((entry) => entry.startsWith("deleteUser"))).toBe(false);
    expect(log.some((entry) => entry.startsWith("remove"))).toBe(false);
  });

  it("skips an account archived less than seven days ago", async () => {
    const { client, log } = makeFake({ due: ["a1"], profiles: { a1: archived(3) } });
    const result = await purgeArchivedAccounts(client);
    expect(result.purged).toEqual([]);
    expect(log.some((entry) => entry.startsWith("deleteUser"))).toBe(false);
  });

  it("reports a failure and keeps going", async () => {
    const { client } = makeFake({
      due: ["a1", "a2"],
      profiles: { a1: archived(8), a2: archived(8) },
      failDeleteFor: "a1",
    });
    const result = await purgeArchivedAccounts(client);
    expect(result.purged).toEqual(["a2"]);
    expect(result.failed).toEqual([{ id: "a1", message: "Deleting the user failed: boom" }]);
  });

  it("returns empty when nothing is due", async () => {
    const { client } = makeFake({ due: [], profiles: {} });
    expect(await purgeArchivedAccounts(client)).toEqual({ purged: [], failed: [] });
  });
});
