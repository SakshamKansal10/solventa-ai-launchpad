import { statedHours } from "@/lib/fit/model";
import type { NormalizedProfile } from "@/lib/profile/normalize";

/** Share of the LOWER end of the founder's stated weekly hours a week may fill:
 * the rest is left for scheduling and the unexpected. */
export const WEEK_LOAD_SHARE = 0.85;
/** When the founder never stated their hours, plan a light part-time week. */
const UNKNOWN_HOURS_BUDGET = 4;

/** The hours one roadmap week may ask for — from the founder's own stated range. */
export function weekHoursBudget(profile: NormalizedProfile): number {
  const hours = statedHours(profile);
  if (!hours) return UNKNOWN_HOURS_BUDGET;
  const lower = hours.min > 0 ? hours.min : Math.min(hours.max ?? 3, 3);
  // Rounded DOWN to the half hour: the budget never creeps above 85%.
  return Math.max(1, Math.floor(lower * WEEK_LOAD_SHARE * 2) / 2);
}

/** Hours named in a task's estimate ("~2 hrs", "2-3 hours", "90 min") — the upper
 * figure, so a week is never under-counted. Null when no figure is given. */
export function estimateHours(text: string): number | null {
  const t = text.toLowerCase();
  const nums = [...t.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  if (nums.length === 0) return null;
  const n = Math.max(...nums);
  if (/min/.test(t) && !/h(?:ou)?rs?|hr/.test(t)) return n / 60;
  if (/day/.test(t)) return n * 8;
  if (/week/.test(t)) return null; // a whole-week task carries no hour figure
  return n;
}

interface HasEstimate {
  timeEstimate: string;
  required: boolean;
}

/** Keeps a week within its budget: drops optional tasks from the end while it is over.
 * Required tasks are never removed — the returned `over` says if they alone exceed it. */
export function fitTasksToBudget<T extends HasEstimate>(
  tasks: T[],
  budget: number,
): { tasks: T[]; hours: number; over: boolean } {
  const total = (list: T[]) => list.reduce((s, x) => s + (estimateHours(x.timeEstimate) ?? 0), 0);
  const kept = [...tasks];
  for (let i = kept.length - 1; i >= 0 && total(kept) > budget; i--) {
    if (!kept[i].required && kept.length > 2) kept.splice(i, 1);
  }
  const hours = total(kept);
  return { tasks: kept, hours, over: hours > budget };
}
