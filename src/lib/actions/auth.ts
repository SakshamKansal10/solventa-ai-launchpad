import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createSupabaseServerClient, getOptionalUser } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/actions/email.server";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signUp = createServerFn({ method: "POST" })
  .validator(
    credentialsSchema.extend({
      fullName: z.string().min(1).optional(),
      emailRedirectTo: z.string().url().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        ...(data.fullName ? { data: { full_name: data.fullName } } : {}),
        ...(data.emailRedirectTo ? { emailRedirectTo: data.emailRedirectTo } : {}),
      },
    });
    if (error) return { ok: false as const, error: error.message };

    // Fire-and-forget — matches sendRoadmapReadyEmail's pattern elsewhere;
    // email delivery must never add latency to (or block) sign-up itself.
    if (authData.user?.email) {
      void sendWelcomeEmail(authData.user.email, data.fullName ?? null);
    }

    return { ok: true as const, needsEmailConfirmation: !authData.session };
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

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), redirectTo: z.string().url() }))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: data.redirectTo,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** Completes Supabase's PKCE flow for email confirmation, password
 * recovery, and magic links alike — every one of those emails links here
 * with a `code` param that must be exchanged for a real session before
 * the user is actually signed in. */
export const exchangeCodeForSession = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().min(1) }))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(data.code);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
