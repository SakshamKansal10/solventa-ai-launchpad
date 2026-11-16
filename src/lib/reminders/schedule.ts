/**
 * One weekly reminder (redesign-v2 part 4, feature 8). Off by default; when on, one email on the
 * founder's chosen weekday with the next mission. Days are counted in India time (the product's
 * home market); the cron runs once a day in the morning there.
 */
export const REMINDER_TIME_ZONE = "Asia/Kolkata";

/** 0 = Sunday … 6 = Saturday, as Date.getDay(). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** The calendar date (YYYY-MM-DD) and weekday of an instant in India time. */
export function indiaDay(now: Date): { date: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REMINDER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { date: `${get("year")}-${get("month")}-${get("day")}`, weekday };
}

export interface ReminderPrefs {
  enabled: boolean;
  weekday: number | null;
  lastSentAt: string | null;
}

/** Due today: switched on, today is the chosen weekday, and nothing was sent today already. */
export function isReminderDue(p: ReminderPrefs, now: Date): boolean {
  if (!p.enabled || p.weekday === null) return false;
  const today = indiaDay(now);
  if (today.weekday !== p.weekday) return false;
  if (!p.lastSentAt) return true;
  return indiaDay(new Date(p.lastSentAt)).date !== today.date;
}

/** The mission a reminder points to: the first open mission of the current week, in order. */
export function nextOpenMission<T extends { id: string; status: string; order_index: number }>(
  tasks: T[],
): T | null {
  return (
    [...tasks].sort((a, b) => a.order_index - b.order_index).find((t) => t.status !== "done") ??
    null
  );
}
