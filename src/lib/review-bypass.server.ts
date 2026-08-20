import type { SupabaseClient, User } from "@supabase/supabase-js";

import { env } from "@/lib/env.server";
import type { Database } from "@/lib/supabase/types";

/**
 * TEMPORARY REVIEW-ONLY AUTH BYPASS.
 *
 * Gated by REVIEW_BYPASS_AUTH="true" AND a dedicated REVIEW_USER_EMAIL /
 * REVIEW_USER_PASSWORD pair — all three must be set, so the flag alone
 * does nothing. When active, an unauthenticated request to a protected
 * route or server action is transparently signed in as ONE fixed,
 * isolated Supabase Auth account instead of being redirected to sign-in.
 *
 * This never touches Postgres RLS: the resulting session is an ordinary,
 * real authenticated session, scoped by RLS to that one account's own
 * rows exactly like any other user. Nothing here can read or write
 * another user's data, expose the service-role key, or expose the
 * anon/Gemini API keys — it only skips the login *form*.
 *
 * To fully remove this mechanism later: delete this file, revert the two
 * call sites in src/lib/supabase/server.ts, and drop the three
 * REVIEW_BYPASS_AUTH / REVIEW_USER_EMAIL / REVIEW_USER_PASSWORD entries
 * from env.server.ts and .env.local.
 */
export function isReviewBypassEnabled(): boolean {
  return (
    env.REVIEW_BYPASS_AUTH === "true" &&
    Boolean(env.REVIEW_USER_EMAIL) &&
    Boolean(env.REVIEW_USER_PASSWORD)
  );
}

let hasWarned = false;

/**
 * Signs the current request in as the dedicated review account, reusing
 * whichever Supabase server client the caller already built (so any
 * resulting session cookie is written onto THIS request's response the
 * same way a normal sign-in already does elsewhere in this app). Returns
 * null — never throws — if bypass isn't enabled or the sign-in fails, so
 * a misconfigured bypass degrades safely back to "no session" rather than
 * breaking the app.
 */
export async function ensureReviewSession(
  supabase: SupabaseClient<Database>,
): Promise<User | null> {
  if (!isReviewBypassEnabled()) return null;

  const email = env.REVIEW_USER_EMAIL!;
  const password = env.REVIEW_USER_PASSWORD!;

  if (!hasWarned) {
    hasWarned = true;
    console.warn(
      `[REVIEW_BYPASS_AUTH] active — unauthenticated requests are being signed in as the isolated review account (${email}). Set REVIEW_BYPASS_AUTH=false to disable.`,
    );
  }

  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (signIn.data.user) return signIn.data.user;

  // First-ever use: the review account may not exist yet. Try to create
  // it — if the Supabase project requires email confirmation, this will
  // create the account but NOT return an active session, and the account
  // needs a one-time manual confirmation (Supabase dashboard → Add user,
  // or confirm the pending user) before bypass can fully activate.
  const signUp = await supabase.auth.signUp({ email, password });
  if (signUp.error) {
    console.error(
      "[REVIEW_BYPASS_AUTH] could not sign in or create the review account:",
      signUp.error.message,
    );
    return null;
  }
  return signUp.data.session ? (signUp.data.user ?? null) : null;
}
