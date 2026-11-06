import type { Role, Viewer } from "./guard";

const ROLES: readonly Role[] = ["traveler", "vendor", "admin"];

function parseRole(value: unknown): Role {
  return ROLES.find((role) => role === value) ?? "traveler";
}

export function getViewer(claims: Record<string, unknown> | null): Viewer {
  if (!claims) {
    return { signedIn: false, role: "traveler", phoneVerified: false };
  }
  const appMetadata = claims.app_metadata;
  const role =
    appMetadata && typeof appMetadata === "object"
      ? parseRole((appMetadata as Record<string, unknown>).role)
      : "traveler";
  return {
    signedIn: true,
    role,
    phoneVerified: typeof claims.phone === "string" && claims.phone !== "",
  };
}
