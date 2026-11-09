/** Throws unless the Supabase URL is the local Docker stack and this is not a production run. */
export function assertLocalSupabase(url: string | undefined, nodeEnv: string | undefined): void {
  if (nodeEnv === "production") throw new Error("Refusing to seed: NODE_ENV is production.");
  if (!url) throw new Error("Refusing to seed: no Supabase URL.");
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("Refusing to seed: the Supabase URL is not a valid URL.");
  }
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`Refusing to seed: ${host} is not the local Supabase stack.`);
  }
}
