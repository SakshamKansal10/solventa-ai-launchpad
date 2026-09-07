import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type FounderNotificationType =
  Database["public"]["Tables"]["founder_notifications"]["Row"]["type"];

/**
 * The Founder Inbox — real product events only (ideas ready, roadmap
 * ready, a week unlocked, a build failure), never a marketing nudge.
 * Called from the server actions that already cause the event
 * (completeConsultation, buildRoadmapForOpportunity, updateTaskStatus)
 * — always best-effort: a failed insert here must never fail the real
 * action that triggered it, the same way ambition-calibration
 * persistence degrades gracefully in profile.ts. Not exported as a
 * createServerFn — this is a plain helper other server actions call
 * directly, never something the client invokes on its own.
 */
export async function notifyFounder(
  supabase: SupabaseClient<Database>,
  userId: string,
  notification: { type: FounderNotificationType; title: string; body: string; link?: string },
): Promise<void> {
  try {
    const { error } = await supabase.from("founder_notifications").insert({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link ?? null,
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

export const markAllNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("founder_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return { ok: true };
});
