import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env.server";
import type { Database } from "@/lib/supabase/types";
import { ensureReviewSession } from "@/lib/review-bypass.server";

/**
 * A Supabase client scoped to the current request's session cookies.
 * Every query runs as the signed-in user (or anonymous), so Postgres RLS
 * policies — not application code — decide what rows are visible.
 */
export function createSupabaseServerClient(): SupabaseClient<Database> {
  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        const cookies = getCookies();
        return Object.entries(cookies).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(name, value, options);
        }
      },
    },
  });
}

/**
 * Resolves the authenticated user from request cookies. Throws if there is
 * no valid session — callers that require auth should let this throw.
 */
export async function requireUser() {
  const { supabase, user } = await getOptionalUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return { supabase, user };
}

/**
 * Falls back to the isolated review account only when REVIEW_BYPASS_AUTH
 * is fully configured (see review-bypass.server.ts) — a no-op that always
 * returns null otherwise, so normal auth is completely unchanged when the
 * bypass isn't active.
 */
export async function getOptionalUser() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) return { supabase, user: data.user };

  const reviewUser = await ensureReviewSession(supabase);
  return { supabase, user: reviewUser };
}
