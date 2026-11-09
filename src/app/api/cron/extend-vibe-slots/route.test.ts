import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

import { GET } from "./route";

const request = (authorization?: string) =>
  new Request("http://localhost/api/cron/extend-vibe-slots", {
    headers: authorization ? { authorization } : {},
  });

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: 3, error: null });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/cron/extend-vibe-slots", () => {
  it("returns 500 and does nothing without CRON_SECRET", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("Bearer x"))).status).toBe(500);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 401 without or with a wrong secret", async () => {
    vi.stubEnv("CRON_SECRET", "right");
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request("Bearer wrong"))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("extends the slot window and returns how many slots were made", async () => {
    vi.stubEnv("CRON_SECRET", "right");
    const response = await GET(request("Bearer right"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ generated: 3 });
    expect(rpc).toHaveBeenCalledWith("generate_all_vibe_slots");
  });

  it("returns 500 without leaking details on failure", async () => {
    vi.stubEnv("CRON_SECRET", "right");
    rpc.mockResolvedValue({ data: null, error: { message: "secret table detail" } });
    const response = await GET(request("Bearer right"));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret table");
  });
});
