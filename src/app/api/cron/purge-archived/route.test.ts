import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const purge = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/settings/purge", () => ({ purgeArchivedAccounts: purge }));

import { GET } from "./route";

const request = (authorization?: string) =>
  new Request("http://localhost/api/cron/purge-archived", {
    headers: authorization ? { authorization } : {},
  });

beforeEach(() => {
  purge.mockReset();
  purge.mockResolvedValue({ purged: ["secret-id-1", "secret-id-2"], failed: [{ id: "x", message: "m" }] });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/purge-archived", () => {
  it("refuses everything and does nothing when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await GET(request("Bearer anything"));
    expect(response.status).toBe(500);
    expect(purge).not.toHaveBeenCalled();
  });

  it("returns 401 without the header", async () => {
    vi.stubEnv("CRON_SECRET", "right-secret");
    expect((await GET(request())).status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
  });

  it("returns 401 for a wrong secret", async () => {
    vi.stubEnv("CRON_SECRET", "right-secret");
    expect((await GET(request("Bearer wrong-secret"))).status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
  });

  it("runs the purge for the right secret and returns counts only", async () => {
    vi.stubEnv("CRON_SECRET", "right-secret");
    const response = await GET(request("Bearer right-secret"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ purged: 2, failed: 1 });
    expect(JSON.stringify(body)).not.toContain("secret-id");
    expect(purge).toHaveBeenCalledTimes(1);
  });
});

describe("service-role client stays on the server", () => {
  const root = join(process.cwd(), "src");

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
    });
  }

  it("is not imported from components or any use-client file", () => {
    const offenders = sourceFiles(root).filter((file) => {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) return false;
      const text = readFileSync(file, "utf8");
      if (!text.includes("@/lib/supabase/admin")) return false;
      const normalized = file.replace(/\\/g, "/");
      return normalized.includes("/src/components/") || /^\s*["']use client["']/m.test(text);
    });
    expect(offenders).toEqual([]);
  });

  it("is imported only by the two cron routes", () => {
    const importers = sourceFiles(root)
      .filter((file) => !/\.test\.tsx?$/.test(file))
      .filter((file) => readFileSync(file, "utf8").includes("@/lib/supabase/admin"))
      .map((file) => relative(root, file).replace(/\\/g, "/"));
    expect(importers.sort()).toEqual([
      "app/api/cron/expire-move-requests/route.ts",
      "app/api/cron/purge-archived/route.ts",
    ]);
  });
});
