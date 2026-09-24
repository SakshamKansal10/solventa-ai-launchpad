import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import { getOptionalUser } from "@/lib/supabase/server";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/locale";

/** Reads the SSR-visible language cookie. Runs only on the server; the root
 * route calls it during the first render so the initial HTML is already in
 * the reader's language. Null means "no preference recorded yet". */
export const getInitialLocale = createServerFn({ method: "GET" }).handler(
  async (): Promise<Locale | null> => {
    const value = getCookie(LOCALE_COOKIE);
    return isLocale(value) ? value : null;
  },
);

/** Persists the language on the signed-in user's profile. Best-effort by
 * design: a missing column (migration 0010 not applied yet) or an
 * unauthenticated visitor must never turn a language switch into an
 * error — the cookie + localStorage copies already carry the preference. */
export const saveLocalePreference = createServerFn({ method: "POST" })
  .validator(z.object({ locale: z.enum(["en", "hi"]) }))
  .handler(async ({ data }) => {
    const { supabase, user } = await getOptionalUser();
    if (!user) return { saved: false as const };
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, locale: data.locale }, { onConflict: "id" });
    if (error) {
      console.error("[locale] profile locale not saved (non-fatal):", error.message);
      return { saved: false as const };
    }
    return { saved: true as const };
  });
