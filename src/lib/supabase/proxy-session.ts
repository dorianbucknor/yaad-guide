import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "./env";

export type Claims = Record<string, unknown>;

export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; claims: Claims | null }> {
  let response = NextResponse.next({ request });

  let env: ReturnType<typeof getSupabaseEnv>;
  try {
    env = getSupabaseEnv();
  } catch (error) {
    // A missing env var must not take the whole site down: treat everyone as
    // signed out so public pages still render.
    console.error(error);
    return { response, claims: null };
  }
  const { url, publishableKey } = env;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  return { response, claims: (data?.claims as Claims | undefined) ?? null };
}
