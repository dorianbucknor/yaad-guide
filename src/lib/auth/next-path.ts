const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

function isUnsafe(path: string): boolean {
  return (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    CONTROL_CHARS.test(path)
  );
}

/** Returns `value` only when it is a same-site relative path; else `fallback`. */
export function safeNextPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value || isUnsafe(value)) return fallback;
  try {
    if (isUnsafe(decodeURIComponent(value))) return fallback;
  } catch {
    return fallback;
  }
  return value;
}
