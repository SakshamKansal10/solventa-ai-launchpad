import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env.server";

/**
 * A service-role client for scheduled jobs only (the weekly reminder cron). It bypasses RLS, so
 * it is never used for a request made on a founder's behalf. Null until the owner sets
 * SUPABASE_SERVICE_ROLE_KEY.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(env.SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
