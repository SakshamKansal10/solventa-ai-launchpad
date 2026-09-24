import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { getSchemaCapabilities } from "@/lib/schema-capabilities.server";
import { OPTIONAL_NOTIFICATION_TYPES } from "@/lib/actions/notifications";

export interface SettingsData {
  email: string | null;
  fullName: string | null;
  /** Whether the latest consultation uses the current (v2) answer schema.
   * Older ones are edited by re-running the consultation, pre-filled. */
  profileSchemaV2: boolean;
  hasConsultation: boolean;
  /** The founder edited their profile after these directions were generated. */
  profileChangedSinceDirections: boolean;
  /** Raw v2 answers, present only when editable in place. */
  answers: Record<string, Json> | null;
  notificationPrefs: Record<(typeof OPTIONAL_NOTIFICATION_TYPES)[number], boolean>;
  /** False until migration 0010 is applied — avatar upload / preferences need it. */
  extrasAvailable: boolean;
}

const DEFAULT_PREFS = { ideas_ready: true, roadmap_ready: true, week_unlocked: true };

/** Everything the Settings page needs in one call. */
export const getSettingsData = createServerFn({ method: "GET" }).handler(
  async (): Promise<SettingsData> => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);
    const [profileRes, dnaRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("business_dna")
        .select("onboarding_answers, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const profile = profileRes.data as {
      full_name: string | null;
      notification_prefs?: Record<string, boolean>;
    } | null;
    const answers = (dnaRes.data?.onboarding_answers ?? null) as Record<string, Json> | null;
    const isV2 = Boolean(answers && (answers as { v?: unknown }).v === 2);
    const prefs = { ...DEFAULT_PREFS, ...(profile?.notification_prefs ?? {}) };

    return {
      email: user.email ?? null,
      fullName:
        profile?.full_name ??
        (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null),
      profileSchemaV2: isV2,
      hasConsultation: Boolean(dnaRes.data),
      profileChangedSinceDirections: dnaRes.data
        ? Date.parse(dnaRes.data.updated_at) - Date.parse(dnaRes.data.created_at) > 1_000
        : false,
      answers: isV2 ? answers : null,
      notificationPrefs: {
        ideas_ready: prefs.ideas_ready !== false,
        roadmap_ready: prefs.roadmap_ready !== false,
        week_unlocked: prefs.week_unlocked !== false,
      },
      extrasAvailable: caps.profileExtras,
    };
  },
);

export const updateProfileName = createServerFn({ method: "POST" })
  .validator(z.object({ fullName: z.string().trim().min(1).max(80) }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: data.fullName }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updateNotificationPrefs = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ideas_ready: z.boolean(),
      roadmap_ready: z.boolean(),
      week_unlocked: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);
    if (!caps.profileExtras) throw new Error("SETTINGS_UNAVAILABLE");
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, notification_prefs: data as unknown as Json }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Records a photo the browser already uploaded to the avatars bucket. The
 * server re-checks that the path lives inside the caller's OWN folder — the
 * storage policy enforces the same rule, this keeps a forged path from ever
 * being saved on a profile — and removes the previous file. */
export const saveAvatar = createServerFn({ method: "POST" })
  .validator(z.object({ path: z.string().min(3).max(300) }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    if (!data.path.startsWith(`${user.id}/`) || data.path.includes("..")) {
      throw new Error("Invalid avatar path");
    }
    const caps = await getSchemaCapabilities(supabase);
    if (!caps.profileExtras) throw new Error("SETTINGS_UNAVAILABLE");

    const { data: existing } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", user.id)
      .maybeSingle();

    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, avatar_path: data.path, avatar_updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (error) throw new Error(error.message);

    const previous = existing?.avatar_path;
    if (previous && previous !== data.path && previous.startsWith(`${user.id}/`)) {
      await supabase.storage.from("avatars").remove([previous]);
    }
    return { ok: true as const };
  });

/** Removing the custom photo falls back to the Google avatar if there is one,
 * otherwise initials (resolved in getCurrentUser). */
export const removeAvatar = createServerFn({ method: "POST" }).handler(async () => {
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: null, avatar_updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  const previous = existing?.avatar_path;
  if (previous && previous.startsWith(`${user.id}/`)) {
    await supabase.storage.from("avatars").remove([previous]);
  }
  return { ok: true as const };
});
