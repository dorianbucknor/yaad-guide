import { dashboardFor } from "./dashboard";
import { safeNextPath } from "./next-path";

export type Role = "traveler" | "vendor" | "admin";
export type Viewer = {
  signedIn: boolean;
  role: Role;
  phoneVerified: boolean;
  archived: boolean;
};
export type Decision =
  | { type: "allow" }
  | { type: "redirect"; to: string }
  | { type: "forbidden" };

const allow: Decision = { type: "allow" };

/** True when `pathname` is `base` or sits below it (segment boundary aware). */
function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

// Signed-in users may stay on these auth routes; every other /auth route
// sends them away.
const AUTH_OPEN_WHEN_SIGNED_IN = [
  "/auth/reset-password",
  "/auth/confirm",
  "/auth/callback",
  "/auth/phone",
  "/auth/forbidden",
  "/auth/error",
  "/auth/check-email",
  "/auth/vendor/complete",
  "/auth/restore",
  "/auth/archived",
];

// Auth routes that need a session even though they live under /auth.
const AUTH_NEEDS_SESSION = ["/auth/phone", "/auth/vendor/complete", "/auth/restore"];

const NEEDS_SESSION = ["/profile", "/settings", "/plan/checkout", "/v", "/admin"];

/**
 * Next routes on the decoded path, so match on it too: `/vend%6Fr` must be
 * guarded like `/v`. Duplicate slashes collapse; a malformed escape keeps
 * the raw path.
 */
function normalizePath(pathname: string): string {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // malformed escape: fall through with the raw path
  }
  return decoded.replace(/\/{2,}/g, "/");
}

export function decideAccess(
  rawPathname: string,
  viewer: Viewer,
  search = "",
): Decision {
  const pathname = normalizePath(rawPathname);
  const signInRedirect: Decision = {
    type: "redirect",
    to: `/auth/sign-in?next=${encodeURIComponent(pathname + search)}`,
  };

  if (!viewer.signedIn) {
    const protectedPath = [...NEEDS_SESSION, ...AUTH_NEEDS_SESSION].some((base) =>
      isUnder(pathname, base),
    );
    return protectedPath ? signInRedirect : allow;
  }

  // An archived account can reach only the restore page.
  if (viewer.archived) {
    return isUnder(pathname, "/auth/restore")
      ? allow
      : { type: "redirect", to: "/auth/restore" };
  }

  if (isUnder(pathname, "/admin")) {
    return viewer.role === "admin" ? allow : { type: "forbidden" };
  }
  if (isUnder(pathname, "/v")) {
    return viewer.role === "vendor" || viewer.role === "admin"
      ? allow
      : { type: "forbidden" };
  }
  if (isUnder(pathname, "/plan/checkout") && !viewer.phoneVerified) {
    return {
      type: "redirect",
      to: `/auth/phone?next=${encodeURIComponent(pathname)}`,
    };
  }
  if (isUnder(pathname, "/auth")) {
    if (AUTH_OPEN_WHEN_SIGNED_IN.some((base) => isUnder(pathname, base))) {
      return allow;
    }
    const next = new URLSearchParams(search).get("next");
    return { type: "redirect", to: safeNextPath(next, dashboardFor(viewer.role)) };
  }
  return allow;
}
