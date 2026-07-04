import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { fetchWithCeiling } from "./fetch-with-ceiling";

// Single shared browser client for the whole tab. Every call site (AuthProvider,
// the nav, page components, InlineEdit, …) MUST share one GoTrueClient. Creating
// a fresh client per call spins up multiple GoTrueClients that each run their own
// refresh timer and contend on the same `navigator.locks` auth lock — which makes
// token-dependent queries (e.g. fetchMember) hang until the lock frees, the root
// cause of the "fetchMember timed out" / flaky-auth behavior.
let browserClient: SupabaseClient<Database> | undefined;

export function createClient() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: fetchWithCeiling } },
  );
  return browserClient;
}
