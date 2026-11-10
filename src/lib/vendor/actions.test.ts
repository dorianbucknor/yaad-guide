import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data?: unknown; error?: { message: string; code?: string } | null };

const state = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  results: {} as Record<string, Result>,
  calls: [] as string[],
  rpcs: [] as { name: string; args: unknown }[],
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    storage: { from: () => ({ remove: async () => ({ error: null }) }) },
    rpc: async (name: string, args: unknown) => {
      state.rpcs.push({ name, args });
      return state.results[`rpc.${name}`] ?? { data: null, error: null };
    },
    from: (table: string) => {
      let op = "select";
      const result = (): Result => state.results[`${table}.${op}`] ?? { data: null, error: null };
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        insert: () => {
          op = "insert";
          state.calls.push(`${table}.insert`);
          return builder;
        },
        update: () => {
          op = "update";
          state.calls.push(`${table}.update`);
          return builder;
        },
        delete: () => {
          op = "delete";
          state.calls.push(`${table}.delete`);
          return builder;
        },
        maybeSingle: async () => result(),
        single: async () => result(),
        then: (resolve: (value: Result) => unknown) => resolve(result()),
      };
      return builder;
    },
  }),
}));

import {
  addVehicleAction,
  recordDocumentAction,
  saveBusinessAction,
  submitProfileAction,
} from "./actions";

const DOC_ID = "22222222-2222-4222-8222-222222222222";
const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  state.user = { id: "u1" };
  state.results = {};
  state.calls = [];
  state.rpcs = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("vendor actions", () => {
  it("asks for a new sign-in when there is no user", async () => {
    state.user = null;
    const result = await saveBusinessAction({ primaryRegion: "St. Ann" });
    expect(result).toEqual({ ok: false, error: "Please sign in again to continue." });
  });

  it("returns a field error for an unknown region", async () => {
    const result = await saveBusinessAction({ primaryRegion: "Narnia" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.primaryRegion).toBeDefined();
  });

  it("rejects a document path inside another account's folder", async () => {
    const result = await recordDocumentAction({
      docType: "government_id",
      path: `u2/${DOC_ID}.png`,
    });
    expect(result.ok).toBe(false);
    expect(state.calls).toEqual([]);
  });

  it("rejects a document path with dot segments", async () => {
    const result = await recordDocumentAction({
      docType: "government_id",
      path: "u1/../u2/doc.png",
    });
    expect(result.ok).toBe(false);
    expect(state.calls).toEqual([]);
  });

  it("rejects insurance without an expiry date", async () => {
    const result = await recordDocumentAction({
      docType: "insurance",
      vehicleId: VEHICLE_ID,
      path: `u1/${DOC_ID}.png`,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.expiresOn).toBeDefined();
  });

  it("records a government ID stored in the user's own folder", async () => {
    const result = await recordDocumentAction({
      docType: "government_id",
      path: `u1/${DOC_ID}.png`,
    });
    expect(result).toEqual({ ok: true });
    expect(state.calls).toContain("vendor_documents.insert");
  });

  it("offers a transfer request when the plate is already registered", async () => {
    state.results["vendor_profiles.select"] = { data: { id: "p1" } };
    state.results["vendor_vehicles.insert"] = {
      error: { message: "duplicate key value", code: "23505" },
    };
    const result = await addVehicleAction({
      vehicleType: "SUV",
      make: "Toyota",
      model: "Noah",
      year: 2020,
      plate: "AB 1234",
      passengerCapacity: 7,
      luggageLarge: 3,
      luggageCarryOn: 4,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/transfer/i);
      expect(result.fieldErrors?.plate).toBeDefined();
    }
  });

  it("saves the bags a new vehicle holds through the luggage function", async () => {
    state.results["vendor_profiles.select"] = { data: { id: "p1" } };
    state.results["vendor_vehicles.insert"] = { data: { id: VEHICLE_ID }, error: null };
    const result = await addVehicleAction({
      vehicleType: "SUV",
      make: "Toyota",
      model: "Noah",
      year: 2020,
      plate: "AB 1234",
      passengerCapacity: 7,
      luggageLarge: "3",
      luggageCarryOn: "4",
    });
    expect(result).toEqual({ ok: true });
    expect(state.rpcs).toContainEqual({
      name: "save_vehicle_luggage",
      args: { p_vehicle_id: VEHICLE_ID, p_large: 3, p_carry_on: 4 },
    });
  });

  it("asks for the bag counts when they are missing", async () => {
    state.results["vendor_profiles.select"] = { data: { id: "p1" } };
    const result = await addVehicleAction({
      vehicleType: "SUV",
      make: "Toyota",
      model: "Noah",
      year: 2020,
      plate: "AB 1234",
      passengerCapacity: 7,
    });
    expect(result.ok).toBe(false);
    expect(state.calls).not.toContain("vendor_vehicles.insert");
  });

  it("returns the database's list of missing items and logs it", async () => {
    state.results["vendor_profiles.select"] = { data: { id: "p1" } };
    state.results["rpc.submit_vendor_profile"] = {
      error: { message: "Missing: JTB license", code: "P0001" },
    };
    const result = await submitProfileAction();
    expect(result).toEqual({ ok: false, error: "Missing: JTB license" });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Missing: JTB license"));
  });

  it("hides unexpected database errors behind a generic message", async () => {
    state.results["vendor_profiles.select"] = { data: { id: "p1" } };
    state.results["rpc.submit_vendor_profile"] = {
      error: { message: "connection reset by peer", code: "08006" },
    };
    const result = await submitProfileAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toContain("connection reset");
  });
});
