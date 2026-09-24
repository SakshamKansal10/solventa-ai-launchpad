import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

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
 * Every dashboard navigation fans out into several server functions, and each
 * one used to make its own network round trip to Supabase Auth just to learn
 * who the caller is. A verified user is now remembered for a few seconds, keyed
 * by the access token itself: a different token (another account, a refreshed
 * session) is always a cache miss, and a signed-out or revoked session stops
 * being honoured within the TTL. The cache is per server instance and never
 * shared across tokens.
 */
const USER_CACHE_TTL_MS = 20_000;
const USER_CACHE_MAX = 500;
const userCache = new Map<string, { user: User; expires: number }>();

function rememberUser(token: string, user: User) {
  const now = Date.now();
  if (userCache.size >= USER_CACHE_MAX) {
    for (const [key, value] of userCache) if (value.expires < now) userCache.delete(key);
    if (userCache.size >= USER_CACHE_MAX) userCache.clear();
  }
  userCache.set(token, { user, expires: now + USER_CACHE_TTL_MS });
}

/** Exposed for tests. */
export function clearUserCache() {
  userCache.clear();
}

/**
 * Falls back to the isolated review account only when REVIEW_BYPASS_AUTH
 * is fully configured (see review-bypass.server.ts) — a no-op that always
 * returns null otherwise, so normal auth is completely unchanged when the
 * bypass isn't active.
 */
export async function getOptionalUser() {
  const supabase = createSupabaseServerClient();

  // Reading the session only parses the cookie (it refreshes an expired token,
  // which is the one case that legitimately needs the network). The token is
  // used purely as a cache key — identity is still confirmed by getUser().
  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {
    token = undefined;
  }

  if (token) {
    const hit = userCache.get(token);
    if (hit && hit.expires > Date.now()) return { supabase, user: hit.user };
  }

  const { data } = await supabase.auth.getUser(token);
  if (data.user) {
    if (token) rememberUser(token, data.user);
    return { supabase, user: data.user };
  }

  const reviewUser = await ensureReviewSession(supabase);
  return { supabase, user: reviewUser };
}
