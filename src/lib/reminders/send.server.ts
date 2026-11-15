import type { SupabaseClient } from "@supabase/supabase-js";

import { sendWeeklyReminderEmail } from "@/lib/actions/email.server";

import { isReminderDue, nextOpenMission } from "./schedule";

/** At most this many reminders per run (one run a day); the rest wait for the next run. */
const BATCH = 200;

/**
 * Sends today's weekly reminders (redesign-v2 part 4, feature 8): one email per founder whose
 * reminder is on and whose chosen weekday is today in India time, with one line and one button —
 * their next mission. A founder with no open mission gets nothing. Each send is recorded so a
 * second run the same day sends nothing twice.
 */
export async function runWeeklyReminders(
  admin: SupabaseClient,
  now = new Date(),
): Promise<{ checked: number; sent: number }> {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email, locale, weekly_reminder, reminder_weekday, reminder_last_sent_at")
    .eq("weekly_reminder", true)
    .not("reminder_weekday", "is", null)
    .limit(BATCH * 5);
  if (error) throw new Error(error.message);

  const due = (profiles ?? [])
    .filter((p) =>
      isReminderDue(
        {
          enabled: Boolean(p.weekly_reminder),
          weekday: p.reminder_weekday as number | null,
          lastSentAt: p.reminder_last_sent_at as string | null,
        },
        now,
      ),
    )
    .slice(0, BATCH);

  let sent = 0;
  for (const p of due) {
    if (!p.email) continue;
    const mission = await nextMissionFor(admin, p.id as string);
    if (!mission) continue;
    await sendWeeklyReminderEmail(p.email as string, {
      missionId: mission.id,
      missionTitle: mission.what,
      locale: p.locale === "hi" ? "hi" : "en",
    });
    await admin
      .from("profiles")
      .update({ reminder_last_sent_at: now.toISOString() })
      .eq("id", p.id);
    sent += 1;
  }
  return { checked: due.length, sent };
}

async function nextMissionFor(admin: SupabaseClient, userId: string) {
  const { data: roadmap } = await admin
    .from("roadmaps")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!roadmap) return null;
  const { data: phases } = await admin
    .from("roadmap_phases")
    .select("id")
    .eq("roadmap_id", roadmap.id);
  const phaseIds = (phases ?? []).map((p) => p.id as string);
  if (phaseIds.length === 0) return null;
  // The current week's missions carry the earliest open deadlines.
  const { data: tasks } = await admin
    .from("roadmap_tasks")
    .select("id, what, status, order_index, deadline")
    .in("phase_id", phaseIds)
    .neq("status", "done")
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(10);
  const rows = (tasks ?? []) as {
    id: string;
    what: string;
    status: string;
    order_index: number;
    deadline: string | null;
  }[];
  const first = rows[0]?.deadline ?? null;
  return nextOpenMission(rows.filter((t) => t.deadline === first));
}
