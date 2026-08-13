import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function hasRequiredConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseBrowserClient() {
  if (!hasRequiredConfig()) {
    return null;
  }

  // Reuse one browser client so realtime subscriptions stay stable across renders.
  browserClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return browserClient;
}
