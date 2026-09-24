import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import { getSchemaCapabilities } from "@/lib/schema-capabilities.server";

export type FounderNotificationType =
  Database["public"]["Tables"]["founder_notifications"]["Row"]["type"];

/** Which notification types a founder can switch off in Settings. A failed
 * roadmap build is never optional — it needs their attention. */
export const OPTIONAL_NOTIFICATION_TYPES = [
  "ideas_ready",
  "roadmap_ready",
  "week_unlocked",
] as const;

/**
 * The Founder Inbox — real product events only (ideas ready, roadmap
 * ready, a week unlocked, a build failure), never a marketing nudge.
 * Called from the server actions that already cause the event — always
 * best-effort: a failed insert here must never fail the real action that
 * triggered it. Respects the founder's Settings → Notifications choices.
 * Not exported as a createServerFn — a plain helper other server actions
 * call directly, never something the client invokes on its own.
 */
export async function notifyFounder(
  supabase: SupabaseClient<Database>,
  userId: string,
  notification: {
    type: FounderNotificationType;
    title: string;
    body: string;
    link?: string;
    /** Values the UI substitutes into its translated template. */
    params?: Record<string, string | number>;
  },
): Promise<void> {
  try {
    const caps = await getSchemaCapabilities(supabase);
    if ((OPTIONAL_NOTIFICATION_TYPES as readonly string[]).includes(notification.type)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      const prefs = (profile as { notification_prefs?: Record<string, boolean> } | null)
        ?.notification_prefs;
      if (prefs && prefs[notification.type] === false) return;
    }
    const { error } = await supabase.from("founder_notifications").insert({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link ?? null,
      ...(caps.weekLock && notification.params
        ? { params: notification.params as unknown as Json }
        : {}),
    });
    if (error) {
      console.error("[notifications] insert failed (non-fatal):", error);
    }
  } catch (err) {
    console.error("[notifications] insert threw (non-fatal):", err);
  }
}

export const getNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("founder_notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);

  const notifications = data ?? [];
  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read_at).length,
  };
});

export const markNotificationRead = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("founder_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", user.id)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("founder_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return { ok: true as const };
});
