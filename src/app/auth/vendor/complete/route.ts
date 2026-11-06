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
    return NextResponse.redirect(new URL("/auth/error?reason=vendor", request.url));
  }

  // A verified phone is on auth.users.phone; a pending change is not.
  const to = data.user.phone ? "/vendor" : "/auth/phone?next=%2Fvendor";
  return NextResponse.redirect(new URL(to, request.url));
}
