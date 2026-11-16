import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env.server";
import { dailyLimitError, startOfIndianDay, type LimitKind } from "@/lib/limits";
import type { Database } from "@/lib/supabase/types";

type Db = SupabaseClient<Database>;

/** What each limit counts — rows that already exist, so no new table is needed:
 * a consultation = a business_dna row, a roadmap (re)build = a roadmaps row, an Ask Sol
 * message = a founder's mentor_messages row. */
async function countToday(db: Db, userId: string, kind: LimitKind): Promise<number> {
  const since = startOfIndianDay();
  const q =
    kind === "consultation"
      ? db.from("business_dna").select("id", { count: "exact", head: true })
      : kind === "roadmap"
        ? db.from("roadmaps").select("id", { count: "exact", head: true })
        : db
            .from("mentor_messages")
            .select("id", { count: "exact", head: true })
            .eq("role", "user");
  const { count, error } = await q.eq("user_id", userId).gte("created_at", since);
  // A counting failure never blocks the founder: the limit protects cost, not correctness.
  if (error) {
    console.error(`[limits] could not count ${kind} for today:`, error.message);
    return 0;
  }
  return count ?? 0;
}

function limitFor(kind: LimitKind): number {
  return kind === "consultation"
    ? env.DAILY_LIMIT_CONSULTATIONS
    : kind === "roadmap"
      ? env.DAILY_LIMIT_ROADMAPS
      : env.DAILY_LIMIT_ASK_SOL;
}

/** Throws a DAILY_LIMIT error (src/lib/limits.ts) when today's allowance is used up. */
export async function enforceDailyLimit(db: Db, userId: string, kind: LimitKind): Promise<void> {
  const limit = limitFor(kind);
  if (limit === 0) return;
  const used = await countToday(db, userId, kind);
  if (used >= limit) {
    console.warn(`[limits] ${kind}: ${used}/${limit} today for user ${userId.slice(0, 8)}`);
    throw dailyLimitError(kind, limit);
  }
}
