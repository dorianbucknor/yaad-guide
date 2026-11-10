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
const P1 = "a1111111-1111-4111-8111-111111111111";
const P2 = "a2222222-2222-4222-8222-222222222222";

function entity(id: string, name: string) {
  return { id, business_name: name, primary_region: "St. Ann", status: "draft", review_note: null, submitted_at: null };
}

beforeEach(() => {
  state.user = { id: "u1", app_metadata: {} };
  state.results = { "vendor_profiles.select": { data: [entity(P1, "One")] } };
  state.calls = [];
  state.payloads = {};
  state.rpcCalls = [];
});

describe("saveVibeBusinessAction", () => {
  it("creates an entity when no entity id is given, even if the account already has one", async () => {
    const result = await saveVibeBusinessAction({ businessName: " Rapids Co ", primaryRegion: "St. Ann" });
    expect(result.ok).toBe(true);
    expect(state.payloads["vendor_profiles.insert"]).toEqual({
      account_id: "u1",
      category: "vibe",
      business_name: "Rapids Co",
      primary_region: "St. Ann",
    });
  });

  it("updates the entity it is given", async () => {
    state.results["vendor_profiles.select"] = { data: [entity(P1, "One"), entity(P2, "Two")] };
    await saveVibeBusinessAction({ entityId: P2, businessName: "Two", primaryRegion: "Kingston" });
    expect(state.calls).toContain("vendor_profiles.update");
    expect(state.calls).not.toContain("vendor_profiles.insert");
  });

  it("refuses an entity id the account does not own", async () => {
    const result = await saveVibeBusinessAction({ entityId: P2, businessName: "Two", primaryRegion: "Kingston" });
    expect(result).toEqual({ ok: false, error: "We couldn't find that business." });
    expect(state.calls).not.toContain("vendor_profiles.update");
  });

  it("needs a business name", async () => {
    const result = await saveVibeBusinessAction({ primaryRegion: "Kingston" });
    expect(result.ok).toBe(false);
  });

  it("says so when the name is already one of the account's businesses", async () => {
    state.results["vendor_profiles.insert"] = { error: { message: "duplicate key", code: "23505" } };
    const result = await saveVibeBusinessAction({ businessName: "One", primaryRegion: "Kingston" });
    expect(result).toEqual({ ok: false, error: "You already have a business with that name." });
  });

  it("needs a region", async () => {
    const result = await saveVibeBusinessAction({ businessName: "X Co", primaryRegion: "" });
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
    state.results["vendor_profiles.select"] = { data: [] };
    const result = await recordVibeDocumentAction({ docType: "business_registration", path });
    expect(result).toEqual({ ok: false, error: "Save your business details first." });
  });

  it("will not guess which entity a document is for when there are two", async () => {
    state.results["vendor_profiles.select"] = { data: [entity(P1, "One"), entity(P2, "Two")] };
    const result = await recordVibeDocumentAction({ docType: "business_registration", path });
    expect(result).toEqual({ ok: false, error: "Choose which business this is for." });
    expect(state.calls).not.toContain("vendor_documents.insert");
  });

  it("records a document against the entity it names", async () => {
    state.results["vendor_profiles.select"] = { data: [entity(P1, "One"), entity(P2, "Two")] };
    await recordVibeDocumentAction({ docType: "business_registration", path, entityId: P2 });
    expect(state.payloads["vendor_documents.insert"]).toMatchObject({ vendor_profile_id: P2 });
  });

  it("records a business registration against the profile, with no expiry", async () => {
    const result = await recordVibeDocumentAction({ docType: "business_registration", path });
    expect(result.ok).toBe(true);
    expect(state.payloads["vendor_documents.insert"]).toMatchObject({
      id: DOC,
      account_id: "u1",
      vendor_profile_id: P1,
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
    expect(state.rpcCalls[0]).toEqual({ name: "submit_vendor_profile", args: { p_profile_id: P1 } });
  });

  it("submits the entity it is given", async () => {
    state.results["vendor_profiles.select"] = { data: [entity(P1, "One"), entity(P2, "Two")] };
    await submitVibeProfileAction(P2);
    expect(state.rpcCalls[0]).toEqual({ name: "submit_vendor_profile", args: { p_profile_id: P2 } });
  });

  it("will not guess which entity to submit when there are two", async () => {
    state.results["vendor_profiles.select"] = { data: [entity(P1, "One"), entity(P2, "Two")] };
    const result = await submitVibeProfileAction();
    expect(result).toEqual({ ok: false, error: "Choose which business this is for." });
    expect(state.rpcCalls).toEqual([]);
  });

  it("shows the database's list of missing items", async () => {
    state.results["rpc.submit_vendor_profile"] = {
      error: { message: "Missing: Business registration", code: "P0001" },
    };
    const result = await submitVibeProfileAction();
    expect(result).toEqual({ ok: false, error: "Missing: Business registration" });
  });
});
