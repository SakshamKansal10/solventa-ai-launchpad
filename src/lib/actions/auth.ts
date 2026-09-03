import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createSupabaseServerClient, getOptionalUser } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/actions/email.server";
import {
  logAuthActionStart,
  classifyAndLogAuthError,
  classify,
  type AuthErrorLike,
} from "@/lib/auth-diagnostics.server";
import {
  runNativeConnectivityProbe,
  type ConnectivityDiagnosticResult,
} from "@/lib/auth-connectivity-diagnostic.server";
import { env } from "@/lib/env.server";

/** Shapes the one diagnostic payload requested for the temporary
 * sendOtp connectivity investigation — used on both the success and
 * failure path so the native-probe results are visible either way. */
function buildDiagnostic(
  connectivity: ConnectivityDiagnosticResult,
  supabaseJsError: AuthErrorLike | null,
) {
  return {
    action: "sendOtp",
    urlHost: connectivity.urlHost,
    urlValid: connectivity.urlValid,
    anonKeyExists: connectivity.anonKeyExists,
    anonKeyLooksLikeJwt: connectivity.anonKeyLooksLikeJwt,
    anonKeyProjectRefMatches: connectivity.anonKeyProjectRefMatches,
    nativeSettingsStatus: connectivity.nativeSettingsStatus,
    nativeSettingsError: connectivity.nativeSettingsError,
    nativeOtpStatus: connectivity.nativeOtpStatus,
    nativeOtpError: connectivity.nativeOtpError,
    supabaseJsErrorName: supabaseJsError?.name ?? null,
    supabaseJsErrorMessage: supabaseJsError?.message ?? null,
    category: supabaseJsError ? classify(supabaseJsError).category : "AUTH_OK",
  };
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** Password sign-in still exists deliberately, not as leftover dead code:
 * every account created before the passwordless OTP rework has a
 * password and no other way in short of "sign in with a code" (which also
 * still works for them). Removing this would lock out every pre-existing
 * user. New accounts never set a password at all — see sendOtp below. */
export const signIn = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }) => {
    logAuthActionStart("signIn", { email: data.email });
    try {
      const supabase = createSupabaseServerClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) return { ok: false as const, error: classifyAndLogAuthError("signIn", error) };
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: classifyAndLogAuthError("signIn", err) };
    }
  });

/** Requests a 6-digit email OTP code — the sole signup path (no password
 * ever collected there) and the "forgot your password" answer for sign-in
 * (a code you can always request beats a link you might not remember
 * setting up). shouldCreateUser distinguishes the two: true only from the
 * signup surface, false from sign-in/"use a code instead" so a mistyped
 * email on that surface can't silently create a new account.
 *
 * No emailRedirectTo here, deliberately: signInWithOtp() always renders
 * through Supabase's "Magic Link" email template slot (confirmed against
 * Supabase's own docs — it's shared by new-signup and existing-user OTP
 * requests alike; "Confirm signup" is only used by the password-based
 * signUp() flow, which this app no longer calls anywhere), and whether the
 * recipient sees a code or a link is decided ENTIRELY by whether that one
 * template's body contains {{ .Token }} or {{ .ConfirmationURL }} — the
 * SDK call itself is identical either way, and emailRedirectTo only
 * affects the URL a link would point to, not whether a link exists at
 * all. Solventia's template (supabase/email-templates/otp-code.html)
 * contains only {{ .Token }} and no link, so a redirect URL has nothing
 * to attach to. */
export const sendOtp = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      shouldCreateUser: z.boolean(),
      fullName: z.string().min(1).optional(),
    }),
  )
  .handler(async ({ data }) => {
    logAuthActionStart("sendOtp", { email: data.email });

    // TEMPORARY — see auth-connectivity-diagnostic.server.ts. Off unless
    // AUTH_CONNECTIVITY_DIAGNOSTIC=true; a no-op otherwise, so real traffic
    // is completely unaffected. Runs BEFORE the real call so the native
    // probes reflect the same connectivity conditions signInWithOtp is
    // about to hit, not a later/different moment.
    const diagnosticsEnabled = env.AUTH_CONNECTIVITY_DIAGNOSTIC;
    const connectivity = diagnosticsEnabled
      ? await runNativeConnectivityProbe(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY,
          data.email,
        )
      : null;

    try {
      const supabase = createSupabaseServerClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          shouldCreateUser: data.shouldCreateUser,
          ...(data.fullName ? { data: { full_name: data.fullName } } : {}),
        },
      });

      if (error) {
        const userMessage = classifyAndLogAuthError("sendOtp", error);
        if (!connectivity) return { ok: false as const, error: userMessage };
        return {
          ok: false as const,
          error: userMessage,
          diagnostic: buildDiagnostic(connectivity, error as unknown as AuthErrorLike),
        };
      }

      if (!connectivity) return { ok: true as const };
      return { ok: true as const, diagnostic: buildDiagnostic(connectivity, null) };
    } catch (err) {
      const userMessage = classifyAndLogAuthError("sendOtp", err);
      if (!connectivity) return { ok: false as const, error: userMessage };
      return {
        ok: false as const,
        error: userMessage,
        diagnostic: buildDiagnostic(connectivity, err as unknown as AuthErrorLike),
      };
    }
  });

export const verifyOtpCode = createServerFn({ method: "POST" })
  .validator(
    z.object({ email: z.string().email(), token: z.string().length(6, "Enter the 6-digit code") }),
  )
  .handler(async ({ data }) => {
    logAuthActionStart("verifyOtpCode", { email: data.email });
    try {
      const supabase = createSupabaseServerClient();
      const { data: verifyData, error } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.token,
        type: "email",
      });
      if (error) {
        return { ok: false as const, error: classifyAndLogAuthError("verifyOtpCode", error) };
      }

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
    } catch (err) {
      return { ok: false as const, error: classifyAndLogAuthError("verifyOtpCode", err) };
    }
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
