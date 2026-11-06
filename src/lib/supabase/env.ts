type EnvSource = Record<string, string | undefined>;

// Next only inlines literal `process.env.NEXT_PUBLIC_*` references, so the
// default source must name each variable explicitly.
const defaultSource: EnvSource = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

export function getSupabaseEnv(source: EnvSource = defaultSource): {
  url: string;
  publishableKey: string;
} {
  const url = source.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
  if (!publishableKey) {
    throw new Error("Missing env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return { url, publishableKey };
}
