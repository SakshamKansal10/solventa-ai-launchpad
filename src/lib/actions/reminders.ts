import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getSchemaCapabilities } from "@/lib/schema-capabilities.server";
import { requireUser } from "@/lib/supabase/server";

export interface ReminderSettings {
  /** False until migration 0017 is applied: the controls are hidden. */
  available: boolean;
  enabled: boolean;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number | null;
  /** When the founder answered the one-time question (yes or no). */
  askedAt: string | null;
}

// The reminder columns (0017) are newer than the generated database types.
const db = (supabase: unknown) => supabase as SupabaseClient;

export const getReminderSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReminderSettings> => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);
    const off: ReminderSettings = {
      available: false,
      enabled: false,
      weekday: null,
      askedAt: null,
    };
    if (!caps.stuck) return off;
    const { data, error } = await db(supabase)
      .from("profiles")
      .select("weekly_reminder, reminder_weekday, reminder_asked_at")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      available: true,
      enabled: Boolean(data?.weekly_reminder),
      weekday: (data?.reminder_weekday as number | null) ?? null,
      askedAt: (data?.reminder_asked_at as string | null) ?? null,
    };
  },
);

/** Saves the reminder choice; also records that the one-time question has been answered. */
export const saveReminderSettings = createServerFn({ method: "POST" })
  .validator(z.object({ enabled: z.boolean(), weekday: z.number().int().min(0).max(6).nullable() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);
    if (!caps.stuck) throw new Error("Reminders are not available yet");
    const { data: row } = await db(supabase)
      .from("profiles")
      .select("reminder_asked_at")
      .eq("id", user.id)
      .maybeSingle();
    const { error } = await db(supabase)
      .from("profiles")
      .update({
        weekly_reminder: data.enabled && data.weekday !== null,
        reminder_weekday: data.weekday,
        reminder_asked_at: row?.reminder_asked_at ?? new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
