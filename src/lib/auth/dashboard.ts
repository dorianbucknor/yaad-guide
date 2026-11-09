import type { Role } from "./guard";

/** Where a signed-in person lands when no page was asked for: their dashboard. */
export function dashboardFor(role: Role): string {
  if (role === "vendor") return "/v";
  if (role === "admin") return "/admin";
  return "/";
}
