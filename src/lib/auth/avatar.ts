/** Public URL for a path stored in `profiles.profile_photo_link`. */
export function avatarPublicUrl(
  path: string | null | undefined,
  supabaseUrl: string,
): string | null {
  if (!path) return null;
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/avatars/${path}`;
}
