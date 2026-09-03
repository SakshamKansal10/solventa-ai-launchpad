import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createSupabaseServerClient, getOptionalUser } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/actions/email.server";

/**
 * Password sign-in, OTP send, and OTP verify all used to run as TanStack
 * server functions, calling Supabase Auth from Vercel's server runtime.
 * A production diagnostic (native fetch() straight at Supabase's REST
 * endpoints, bypassing supabase-js entirely) proved Vercel's server
 * runtime cannot reach Supabase Auth at all — even an unauthenticated GET
 * to /auth/v1/settings failed with the same "fetch failed" — while the
 * browser has never had this problem. Those three calls now happen
 * directly from the browser via createSupabaseBrowserClient() (see
 * AccountGate.tsx, SignInDialog.tsx), which never touches this server at
 * all for the auth call itself.
 *
 * @supabase/ssr's createBrowserClient (used there) persists the resulting
 * session into cookies using the same format createServerClient below
 * reads — so a session established entirely client-side is still visible
 * to every other server action in this app (getDashboard, getRoadmap,
 * requireUser, ...) on the very next request, with no code changes needed
 * anywhere else.
 */
export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  return { ok: true as const };
});

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { user } = await getOptionalUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
});

/** The one side effect that used to live inside the server-side
 * verifyOtpCode handler and now needs a home of its own: the browser
 * knows immediately whether a verifyOtp() call just created a new account
 * (same "created_at vs last_sign_in_at" check, done client-side against
 * the same user object Supabase already returned) and calls this purely
 * to fire the welcome email — it never touches Supabase itself, so it's
 * unaffected by the auth connectivity issue above. */
export const sendWelcomeEmailForNewUser = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), fullName: z.string().optional() }))
  .handler(async ({ data }) => {
    void sendWelcomeEmail(data.email, data.fullName ?? null);
    return { ok: true as const };
  });

/** Completes Supabase's PKCE flow for Google OAuth — the only flow left
 * that redirects back here with a `code` param. Email sign-in is a typed
 * code verified directly in the browser (AccountGate.tsx,
 * SignInDialog.tsx), not a link. */
export const exchangeCodeForSession = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().min(1) }))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(data.code);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
