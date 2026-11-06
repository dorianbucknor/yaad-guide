import { describe, expect, it } from "vitest";

import { avatarPublicUrl } from "./avatar";

describe("avatarPublicUrl", () => {
  it("builds the public storage URL from a stored path", () => {
    expect(avatarPublicUrl("u1/avatar.webp", "https://x.supabase.co")).toBe(
      "https://x.supabase.co/storage/v1/object/public/avatars/u1/avatar.webp",
    );
  });

  it("ignores a trailing slash on the project URL", () => {
    expect(avatarPublicUrl("u1/avatar.png", "https://x.supabase.co/")).toBe(
      "https://x.supabase.co/storage/v1/object/public/avatars/u1/avatar.png",
    );
  });

  it.each([null, undefined, ""])("returns null for %j", (path) => {
    expect(avatarPublicUrl(path, "https://x.supabase.co")).toBeNull();
  });
});
