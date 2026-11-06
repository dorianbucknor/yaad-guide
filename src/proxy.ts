import { NextResponse, type NextRequest } from "next/server";

import { decideAccess } from "@/lib/auth/guard";
import { getViewer } from "@/lib/auth/viewer";
import { updateSession } from "@/lib/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const decision = decideAccess(pathname, getViewer(claims), search);
  if (decision.type === "allow") return response;

  const to = decision.type === "redirect" ? decision.to : "/auth/forbidden";
  const redirect = NextResponse.redirect(new URL(to, request.url));
  // Carry refreshed session cookies onto the redirect.
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
