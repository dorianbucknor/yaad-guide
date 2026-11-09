import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data?: unknown; error?: { message: string; code?: string } | null };

const state = vi.hoisted(() => ({
  user: { id: "u1", app_metadata: {} } as { id: string; app_metadata: Record<string, unknown> } | null,
  results: {} as Record<string, Result>,
  calls: [] as string[],
  payloads: {} as Record<string, unknown>,
  rpcCalls: [] as { name: string; args: unknown }[],
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    storage: { from: () => ({ remove: async () => ({ error: null }) }) },
    rpc: async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args });
      return state.results[`rpc.${name}`] ?? { data: null, error: null };
    },
    from: (table: string) => {
      let op = "select";
      const result = (): Result => state.results[`${table}.${op}`] ?? { data: null, error: null };
      const record = (name: string, payload?: unknown) => {
        op = name;
        state.calls.push(`${table}.${name}`);
        if (payload !== undefined) state.payloads[`${table}.${name}`] = payload;
        return builder;
      };
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        insert: (payload: unknown) => record("insert", payload),
        update: (payload: unknown) => record("update", payload),
        delete: () => record("delete"),
        maybeSingle: async () => result(),
        single: async () => result(),
        then: (resolve: (value: Result) => unknown) => Promise.resolve(result()).then(resolve),
      };
      return builder;
    },
  }),
}));

import { recordVibeDocumentAction, saveVibeBusinessAction, submitVibeProfileAction } from "./profile-actions";

const DOC = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  state.user = { id: "u1", app_metadata: {} };
  state.results = { "vendor_profiles.select": { data: { id: "p1" } } };
  state.calls = [];
  state.payloads = {};
  state.rpcCalls = [];
});

describe("saveVibeBusinessAction", () => {
  it("creates the vibe profile when there is none", async () => {
    state.results["vendor_profiles.select"] = { data: null };
    const result = await saveVibeBusinessAction({ businessName: " Rapids Co ", primaryRegion: "St. Ann" });
    expect(result.ok).toBe(true);
    expect(state.payloads["vendor_profiles.insert"]).toEqual({
      account_id: "u1",
      category: "vibe",
      business_name: "Rapids Co",
      primary_region: "St. Ann",
    });
  });

  it("updates the profile that exists", async () => {
    await saveVibeBusinessAction({ primaryRegion: "Kingston" });
    expect(state.calls).toContain("vendor_profiles.update");
    expect(state.calls).not.toContain("vendor_profiles.insert");
  });

  it("needs a region", async () => {
    const result = await saveVibeBusinessAction({ primaryRegion: "" });
    expect(result.ok).toBe(false);
  });
});

describe("recordVibeDocumentAction", () => {
  const path = `u1/${DOC}.pdf`;

  it("refuses move-only document types", async () => {
    const result = await recordVibeDocumentAction({ docType: "jtb_license", expiresOn: "2030-01-01", path });
    expect(result.ok).toBe(false);
    expect(state.calls).not.toContain("vendor_documents.insert");
  });

  it("refuses a file outside the user's own folder", async () => {
    const result = await recordVibeDocumentAction({ docType: "business_registration", path: `u2/${DOC}.pdf` });
    expect(result).toEqual({ ok: false, error: "That file path is not allowed." });
  });

  it("needs the business details before a profile document", async () => {
    state.results["vendor_profiles.select"] = { data: null };
    const result = await recordVibeDocumentAction({ docType: "business_registration", path });
    expect(result).toEqual({ ok: false, error: "Save your business details first." });
  });

  it("records a business registration against the profile, with no expiry", async () => {
    const result = await recordVibeDocumentAction({ docType: "business_registration", path });
    expect(result.ok).toBe(true);
    expect(state.payloads["vendor_documents.insert"]).toMatchObject({
      id: DOC,
      account_id: "u1",
      vendor_profile_id: "p1",
      doc_type: "business_registration",
      storage_path: path,
      expires_on: null,
    });
  });

  it("records the government ID against the account", async () => {
    await recordVibeDocumentAction({ docType: "government_id", path });
    expect(state.payloads["vendor_documents.insert"]).toMatchObject({
      vendor_profile_id: null,
      doc_type: "government_id",
    });
  });
});

describe("submitVibeProfileAction", () => {
  it("submits the vibe profile through the database function", async () => {
    const result = await submitVibeProfileAction();
    expect(result.ok).toBe(true);
    expect(state.rpcCalls[0]).toEqual({ name: "submit_vendor_profile", args: { p_profile_id: "p1" } });
  });

  it("shows the database's list of missing items", async () => {
    state.results["rpc.submit_vendor_profile"] = {
      error: { message: "Missing: Business registration", code: "P0001" },
    };
    const result = await submitVibeProfileAction();
    expect(result).toEqual({ ok: false, error: "Missing: Business registration" });
  });
});
