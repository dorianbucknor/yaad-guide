import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/next-path";
import { createClient } from "@/lib/supabase/server";

// Handles email links: sign-up confirmation and password recovery. Supports
// both the token-hash template and the default PKCE `code` redirect.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let error: unknown = new Error("missing token");
  if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  }

  if (error) {
    console.error(`Email link failed: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.redirect(new URL("/auth/error?reason=confirm", request.url));
  }
  return NextResponse.redirect(new URL(next, request.url));
}
