import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// After a vendor confirms their email (or returns from Google): upgrade the
// role, then verify the phone if it is not verified yet.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  const { error } = await supabase.rpc("claim_vendor_role");
  if (error) {
    console.error(`claim_vendor_role failed: ${error.message}`);
    return NextResponse.redirect(new URL("/auth/error?reason=vendor", request.url));
  }

  // The role lives in the JWT: refresh so the proxy sees `vendor` right away.
  await supabase.auth.refreshSession();

  // A verified phone is on auth.users.phone; a pending change is not.
  const to = data.user.phone ? "/v" : "/auth/phone?next=%2Fv";
  return NextResponse.redirect(new URL(to, request.url));
}
