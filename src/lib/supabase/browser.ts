import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

/**
 * The only case that needs a browser-side Supabase client: OAuth
 * (Google sign-in), which has to redirect the whole page to Google's
 * consent screen — something a server function's JSON RPC can't do.
 * Every other auth/data operation goes through server functions instead.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
}
