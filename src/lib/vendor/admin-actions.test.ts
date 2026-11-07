import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data?: unknown; error?: { message: string; code?: string } | null };

const state = vi.hoisted(() => ({
  role: "admin" as string | null,
  results: {} as Record<string, Result>,
  rpcs: [] as { name: string; args: unknown }[],
  signed: [] as string[],
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: state.role ? { id: "admin-1", app_metadata: { role: state.role } } : null,
        },
      }),
    },
    storage: {
      from: () => ({
        createSignedUrl: async (path: string) => {
          state.signed.push(path);
          return { data: { signedUrl: `https://signed.example/${path}` }, error: null };
        },
      }),
    },
    rpc: async (name: string, args: unknown) => {
      state.rpcs.push({ name, args });
      return state.results[`rpc.${name}`] ?? { data: null, error: null };
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => state.results["vendor_documents.select"] ?? { data: null },
        }),
      }),
    }),
  }),
}));

import {
  rejectIdentityAction,
  reviewProfileAction,
  reviewTransferAction,
  signedDocumentUrlAction,
  verifyDocumentAction,
} from "./admin-actions";

const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  state.role = "admin";
  state.results = {};
  state.rpcs = [];
  state.signed = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("admin actions", () => {
  it.each([
    ["reviewProfileAction", () => reviewProfileAction({ profileId: ID, decision: "approved" })],
    ["verifyDocumentAction", () => verifyDocumentAction(ID, true)],
    ["rejectIdentityAction", () => rejectIdentityAction({ accountId: ID, note: "Unreadable" })],
    ["signedDocumentUrlAction", () => signedDocumentUrlAction(ID)],
    ["reviewTransferAction", () => reviewTransferAction({ transferId: ID, decision: "approved" })],
  ])("%s refuses a vendor without touching the database", async (_name, call) => {
    state.role = "vendor";
    const result = await call();
    expect(result.ok).toBe(false);
    expect(state.rpcs).toEqual([]);
    expect(state.signed).toEqual([]);
  });

  it("refuses a signed-out caller", async () => {
    state.role = null;
    const result = await reviewProfileAction({ profileId: ID, decision: "approved" });
    expect(result.ok).toBe(false);
    expect(state.rpcs).toEqual([]);
  });

  it("needs a reason to reject a profile", async () => {
    const result = await reviewProfileAction({ profileId: ID, decision: "rejected", note: "  " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.note).toBeDefined();
    expect(state.rpcs).toEqual([]);
  });

  it("approves through the database function", async () => {
    const result = await reviewProfileAction({ profileId: ID, decision: "approved" });
    expect(result).toEqual({ ok: true });
    expect(state.rpcs).toEqual([
      {
        name: "review_vendor_profile",
        args: { p_profile_id: ID, p_decision: "approved", p_note: null },
      },
    ]);
  });

  it("returns a 60-second signed URL for an admin", async () => {
    state.results["vendor_documents.select"] = { data: { storage_path: "u1/doc.png" } };
    const result = await signedDocumentUrlAction(ID);
    expect(result).toEqual({ ok: true, data: { url: "https://signed.example/u1/doc.png" } });
  });

  it("reports a missing document", async () => {
    const result = await signedDocumentUrlAction(ID);
    expect(result.ok).toBe(false);
  });

  it("needs a reason to reject an identity", async () => {
    const result = await rejectIdentityAction({ accountId: ID, note: "" });
    expect(result.ok).toBe(false);
    expect(state.rpcs).toEqual([]);
  });
});
