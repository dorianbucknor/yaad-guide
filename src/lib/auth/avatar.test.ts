import { describe, expect, it } from "vitest";

import { avatarPublicUrl, isOwnAvatarPath } from "./avatar";

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

describe('isOwnAvatarPath', () => {
  const uid = '11111111-1111-1111-1111-111111111111';

  it.each(['avatar.webp', 'avatar.jpg', 'avatar.png'])(
    'accepts the user own folder with %s',
    (file) => {
      expect(isOwnAvatarPath(uid + '/' + file, uid)).toBe(true);
    },
  );

  it.each([
    '22222222-2222-2222-2222-222222222222/avatar.webp',
    uid + '/../other/avatar.webp',
    uid + '/avatar.gif',
    uid + '/nested/avatar.webp',
    uid + 'avatar.webp',
    '',
  ])('rejects %j', (path) => {
    expect(isOwnAvatarPath(path, uid)).toBe(false);
  });
});
