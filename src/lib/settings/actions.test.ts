import { beforeEach, describe, expect, it, vi } from "vitest";

type Identity = { provider: string };
type Result = { data?: unknown; error?: { message: string; code?: string } | null };

const state = vi.hoisted(() => ({
  user: null as {
    id: string;
    email: string;
    identities: { provider: string }[];
    app_metadata?: Record<string, unknown>;
  } | null,
  signInError: null as { message: string; code?: string } | null,
  phoneVerified: true,
  calls: [] as string[],
  rpcs: [] as string[],
  upserts: [] as unknown[],
  results: {} as Record<string, Result>,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "localhost:3000" }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => {
        state.calls.push("getUser");
        return { data: { user: state.user } };
      },
      signInWithPassword: async () => {
        state.calls.push("signInWithPassword");
        return { error: state.signInError };
      },
      updateUser: async () => {
        state.calls.push("updateUser");
        return { error: null };
      },
      signOut: async (opts: { scope: string }) => {
        state.calls.push(`signOut:${opts.scope}`);
        return { error: null };
      },
      refreshSession: async () => {
        state.calls.push("refreshSession");
        return { error: null };
      },
    },
    rpc: async (name: string) => {
      state.calls.push(`rpc:${name}`);
      state.rpcs.push(name);
      return state.results[`rpc.${name}`] ?? { data: null, error: null };
    },
    from: (table: string) => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: table === "profiles" ? { phone_verified_at: state.phoneVerified ? "2026-01-01" : null } : null,
          error: null,
        }),
        upsert: async (row: unknown) => {
          state.calls.push(`${table}.upsert`);
          state.upserts.push(row);
          return state.results[`${table}.upsert`] ?? { error: null };
        },
      };
      return builder;
    },
  }),
}));

import {
  archiveAccountAction,
  changeEmailAction,
  changePasswordAction,
  keepDeletingAction,
  restoreAccountAction,
  savePreferenceAction,
  signOutOthersAction,
} from "./actions";

const passwordUser = (providers: string[]) => ({
  id: "u1",
  email: "a@example.com",
  identities: providers.map((provider): Identity => ({ provider })),
});

const newPassword = { newPassword: "Str0ngPass!word", confirmPassword: "Str0ngPass!word" };

beforeEach(() => {
  state.user = passwordUser(["email"]);
  state.signInError = null;
  state.phoneVerified = true;
  state.calls = [];
  state.rpcs = [];
  state.upserts = [];
  state.results = {};
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("changePasswordAction", () => {
  it("returns a field error for a wrong current password and never updates", async () => {
    state.signInError = { message: "bad", code: "invalid_credentials" };
    const result = await changePasswordAction({ ...newPassword, currentPassword: "nope" });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { currentPassword: "Current password is incorrect." },
    });
    expect(state.calls).not.toContain("updateUser");
  });

  it("requires the current password for an email account", async () => {
    const result = await changePasswordAction(newPassword);
    expect(result.ok).toBe(false);
    expect(state.calls).not.toContain("updateUser");
  });

  it("updates the password and signs out other devices with the right current password", async () => {
    const result = await changePasswordAction({ ...newPassword, currentPassword: "OldPass!word1" });
    expect(result.ok).toBe(true);
    expect(state.calls).toEqual(
      expect.arrayContaining(["signInWithPassword", "updateUser", "signOut:others"]),
    );
  });

  it("lets a Google-only user set a password without a current one", async () => {
    state.user = passwordUser(["google"]);
    const result = await changePasswordAction(newPassword);
    expect(result.ok).toBe(true);
    expect(state.calls).not.toContain("signInWithPassword");
    expect(state.calls).toContain("updateUser");
  });
});

describe("changeEmailAction and signOutOthersAction", () => {
  it("updates the email for a signed-in user", async () => {
    expect((await changeEmailAction({ email: "new@example.com" })).ok).toBe(true);
    expect(state.calls).toContain("updateUser");
  });
  it("signs out other devices", async () => {
    expect((await signOutOthersAction()).ok).toBe(true);
    expect(state.calls).toContain("signOut:others");
  });
});

describe("archiveAccountAction", () => {
  it("fails a wrong confirmation before any database call", async () => {
    const result = await archiveAccountAction({ confirmation: "delete", password: "x" });
    expect(result.ok).toBe(false);
    expect(state.calls).toEqual([]);
  });

  it("requires the password for a password account", async () => {
    const result = await archiveAccountAction({ confirmation: "DELETE" });
    expect(result.ok).toBe(false);
    expect(state.rpcs).not.toContain("archive_account");
  });

  it("rejects a wrong password", async () => {
    state.signInError = { message: "bad", code: "invalid_credentials" };
    const result = await archiveAccountAction({ confirmation: "DELETE", password: "nope" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { password: "Password is incorrect." } });
    expect(state.rpcs).not.toContain("archive_account");
  });

  it("archives, signs out everywhere and returns the purge date", async () => {
    const result = await archiveAccountAction({ confirmation: "DELETE", password: "OldPass!word1" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data?.until).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const archive = state.calls.indexOf("rpc:archive_account");
    expect(archive).toBeGreaterThan(-1);
    expect(state.calls.indexOf("signOut:global")).toBeGreaterThan(archive);
  });

  it("does not need a password for a Google-only account", async () => {
    state.user = passwordUser(["google"]);
    const result = await archiveAccountAction({ confirmation: "DELETE" });
    expect(result.ok).toBe(true);
  });
});

describe("restore and keep deleting", () => {
  it("restores and refreshes the session", async () => {
    expect((await restoreAccountAction()).ok).toBe(true);
    expect(state.calls).toEqual(expect.arrayContaining(["rpc:restore_account", "refreshSession"]));
  });
  it("signs out everywhere when the person keeps deleting", async () => {
    expect((await keepDeletingAction()).ok).toBe(true);
    expect(state.calls).toContain("signOut:global");
  });
});

describe("savePreferenceAction", () => {
  it("refuses to disable account security email", async () => {
    const result = await savePreferenceAction({ category: "account_security", channel: "email", enabled: false });
    expect(result.ok).toBe(false);
    expect(state.upserts).toEqual([]);
  });

  it("refuses to enable SMS when the phone is not verified", async () => {
    state.phoneVerified = false;
    const result = await savePreferenceAction({ category: "bookings", channel: "sms", enabled: true });
    expect(result.ok).toBe(false);
    expect(state.upserts).toEqual([]);
  });

  it("allows switching SMS off without a verified phone", async () => {
    state.phoneVerified = false;
    const result = await savePreferenceAction({ category: "bookings", channel: "sms", enabled: false });
    expect(result.ok).toBe(true);
  });

  it("saves an allowed switch for the caller", async () => {
    const result = await savePreferenceAction({ category: "offers", channel: "email", enabled: true });
    expect(result.ok).toBe(true);
    expect(state.upserts).toEqual([
      { account_id: "u1", category: "offers", channel: "email", enabled: true },
    ]);
  });
});

describe("with an archived account", () => {
  beforeEach(() => {
    state.user = { ...passwordUser(["email"]), app_metadata: { archived: true } };
  });

  it.each([
    ["changePassword", () => changePasswordAction({ ...newPassword, currentPassword: "x" })],
    ["changeEmail", () => changeEmailAction({ email: "new@example.com" })],
    ["signOutOthers", () => signOutOthersAction()],
    ["archive", () => archiveAccountAction({ confirmation: "DELETE", password: "x" })],
    ["savePreference", () => savePreferenceAction({ category: "offers", channel: "email", enabled: true })],
  ])("%s is refused and changes nothing", async (_name, run) => {
    const result = await run();
    expect(result.ok).toBe(false);
    expect(state.calls).toEqual(["getUser"]);
  });

  it("still lets the person restore or keep deleting", async () => {
    expect((await restoreAccountAction()).ok).toBe(true);
    expect((await keepDeletingAction()).ok).toBe(true);
  });
});

describe("with no signed-in user", () => {
  it.each([
    ["changePassword", () => changePasswordAction({ ...newPassword, currentPassword: "x" })],
    ["changeEmail", () => changeEmailAction({ email: "new@example.com" })],
    ["signOutOthers", () => signOutOthersAction()],
    ["archive", () => archiveAccountAction({ confirmation: "DELETE", password: "x" })],
    ["restore", () => restoreAccountAction()],
    ["keepDeleting", () => keepDeletingAction()],
    ["savePreference", () => savePreferenceAction({ category: "offers", channel: "email", enabled: true })],
  ])("%s asks the person to sign in again", async (_name, run) => {
    state.user = null;
    expect(await run()).toEqual({ ok: false, error: "Please sign in again to continue." });
  });
});
