import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";

// Google OAuth return: exchange the code for a session.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    console.error(`OAuth code exchange failed: ${error.name}: ${error.message}`);
  } else {
    console.error(
      `OAuth callback without code: ${searchParams.get("error_description") ?? "no error given"}`,
    );
  }

  return NextResponse.redirect(new URL("/auth/error?reason=oauth", request.url));
}
