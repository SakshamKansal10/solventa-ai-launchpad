import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createSupabaseServerClient, getOptionalUser } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/actions/email.server";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signIn = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** Requests a 6-digit email OTP code — the sole signup path (no password
 * ever collected there) and the "forgot your password" answer for sign-in
 * (a code you can always request beats a link you might not remember
 * setting up). shouldCreateUser distinguishes the two: true only from the
 * signup surface, false from sign-in/"use a code instead" so a mistyped
 * email on that surface can't silently create a new account.
 *
 * emailRedirectTo is a safety net, not the primary path: Supabase's STOCK
 * "Confirm signup"/"Magic Link" templates render {{ .ConfirmationURL }} (a
 * clickable link) and do NOT show {{ .Token }} (the code) unless the
 * template is edited in the Supabase dashboard to include it — a code-only
 * request can still arrive as a link-only email until that template is
 * updated there (not something this app's code can control). Setting this
 * means that if someone clicks the link instead of typing a code, it still
 * lands on /auth/callback and signs them in correctly, rather than on
 * whatever the bare Site URL happens to be. */
export const sendOtp = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      shouldCreateUser: z.boolean(),
      fullName: z.string().min(1).optional(),
      emailRedirectTo: z.string().url().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        shouldCreateUser: data.shouldCreateUser,
        ...(data.fullName ? { data: { full_name: data.fullName } } : {}),
        ...(data.emailRedirectTo ? { emailRedirectTo: data.emailRedirectTo } : {}),
      },
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const verifyOtpCode = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), token: z.string().min(6).max(8) }))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { data: verifyData, error } = await supabase.auth.verifyOtp({
      email: data.email,
      token: data.token,
      type: "email",
    });
    if (error) return { ok: false as const, error: error.message };

    // A brand-new account's very first sign-in lands within the same
    // instant it was created — an existing account returning via "sign in
    // with a code" was created long before this moment. Good enough to
    // decide "send the welcome email" without threading an extra flag
    // through the client for it.
    const user = verifyData.user;
    if (user?.email && user.created_at && user.last_sign_in_at) {
      const justCreated =
        Math.abs(new Date(user.last_sign_in_at).getTime() - new Date(user.created_at).getTime()) <
        10_000;
      if (justCreated) {
        void sendWelcomeEmail(user.email, (user.user_metadata?.full_name as string) ?? null);
      }
    }

    return { ok: true as const };
  });

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

/** Completes Supabase's PKCE flow for magic links and Google OAuth — the
 * only two flows left that redirect back here with a `code` param. Email
 * signup/sign-in is a typed code (verifyOtpCode above), not a link. */
export const exchangeCodeForSession = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().min(1) }))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(data.code);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
