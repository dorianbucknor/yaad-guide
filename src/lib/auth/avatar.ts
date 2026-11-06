/** True only for `<userId>/avatar.<webp|jpg|png>`: the one path a user may store. */
export function isOwnAvatarPath(path: string, userId: string): boolean {
  return (
    path.startsWith(`${userId}/`) &&
    /^avatar\.(webp|jpg|png)$/.test(path.slice(userId.length + 1))
  );
}

/** Public URL for a path stored in `profiles.profile_photo_link`. */
export function avatarPublicUrl(
  path: string | null | undefined,
  supabaseUrl: string,
): string | null {
  if (!path) return null;
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/avatars/${path}`;
}
