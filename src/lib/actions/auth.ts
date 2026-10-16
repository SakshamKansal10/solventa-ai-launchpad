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

export interface CurrentUserDTO {
  id: string;
  email: string | null;
  fullName: string | null;
  /** Stored language preference — null until the founder has ever chosen one. */
  locale: "en" | "hi" | null;
  avatar: { url: string | null; source: "custom" | "google" | "initials" };
  initials: string;
}

export function initialsFor(fullName: string | null, email: string | null): string {
  const source = (fullName?.trim() || email?.split("@")[0] || "S").trim();
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = (parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2)).toUpperCase();
  return letters || "S";
}

/** One call gives every screen everything it needs about the signed-in
 * founder — identity, language, avatar — so the shell never fans out into
 * several round trips. Avatar priority: custom upload → Google account photo
 * → initials. Reads the profile with select("*") so it keeps working on a
 * database where migration 0010 (locale/avatar columns) hasn't run yet. */
export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentUserDTO | null> => {
    const { supabase, user } = await getOptionalUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const fullName =
      profile?.full_name ??
      (typeof meta.full_name === "string" ? meta.full_name : null) ??
      (typeof meta.name === "string" ? meta.name : null);

    let avatar: CurrentUserDTO["avatar"] = { url: null, source: "initials" };
    const customPath = (profile as { avatar_path?: string | null } | null)?.avatar_path;
    if (customPath) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(customPath);
      const stamp = (profile as { avatar_updated_at?: string | null } | null)?.avatar_updated_at;
      avatar = {
        url: stamp ? `${data.publicUrl}?v=${encodeURIComponent(stamp)}` : data.publicUrl,
        source: "custom",
      };
    } else {
      const google =
        typeof meta.avatar_url === "string"
          ? meta.avatar_url
          : typeof meta.picture === "string"
            ? meta.picture
            : null;
      if (google) avatar = { url: google, source: "google" };
    }

    const storedLocale = (profile as { locale?: string | null } | null)?.locale;
    return {
      id: user.id,
      email: user.email ?? null,
      fullName,
      locale: storedLocale === "en" || storedLocale === "hi" ? storedLocale : null,
      avatar,
      initials: initialsFor(fullName, user.email ?? null),
    };
  },
);

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
