import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { getSchemaCapabilities } from "@/lib/schema-capabilities.server";

type Db = SupabaseClient<Database>;

/** Marks exactly one opportunity 'selected' (clearing any previous selection
 * back to 'active'). The unique index `opportunities_one_selected_per_user`
 * makes "at most one" a database guarantee, so the clear runs first. */
export async function selectOpportunityRow(db: Db, userId: string, opportunityId: string) {
  const { error: clearError } = await db
    .from("opportunities")
    .update({ status: "active" })
    .eq("user_id", userId)
    .eq("status", "selected")
    .neq("id", opportunityId);
  if (clearError) throw new Error(clearError.message);

  const { data, error } = await db
    .from("opportunities")
    .update({ status: "selected" })
    .eq("id", opportunityId)
    .eq("user_id", userId)
    .select("id");
  if (error) throw new Error(error.message);
  if ((data ?? []).length === 0) throw new Error("Opportunity not found");
}

/** Records an EXPLICIT direction choice on the profile. resolveDirection only
 * honours it while it is newer than the latest consultation, so an old choice
 * can never silently replace a fresh consultation's package. */
export async function setActivePointer(db: Db, userId: string, opportunityId: string) {
  const caps = await getSchemaCapabilities(db);
  if (!caps.profileExtras) return;
  const { error } = await db.from("profiles").upsert(
    {
      id: userId,
      active_opportunity_id: opportunityId,
      active_opportunity_set_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) console.error("[direction] active pointer not saved (non-fatal):", error.message);
}

/** Archiving preserves progress and history — a roadmap is never deleted by
 * switching direction; switching back reactivates it. */
export async function archiveActiveRoadmapsExcept(
  db: Db,
  userId: string,
  keepOpportunityId?: string,
) {
  const { data: active, error } = await db
    .from("roadmaps")
    .select("id, opportunity_id")
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) throw new Error(error.message);
  const ids = (active ?? []).filter((r) => r.opportunity_id !== keepOpportunityId).map((r) => r.id);
  if (ids.length === 0) return;
  const { error: updateError } = await db
    .from("roadmaps")
    .update({ status: "archived" })
    .in("id", ids)
    .eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);
}

/** Reactivating an archived roadmap costs zero AI calls: not-yet-done missions
 * get fresh dates counted from today ("day 3" means day 3 of actually
 * resuming), completed work keeps its real history, nothing re-locks. */
export async function reactivateRoadmap(db: Db, userId: string, roadmapId: string) {
  const now = new Date();
  const { data: phases, error } = await db
    .from("roadmap_phases")
    .select("id, roadmap_tasks(id, deadline_days_from_start, status)")
    .eq("roadmap_id", roadmapId);
  if (error) throw new Error(error.message);

  const pending = (phases ?? []).flatMap(
    (p) =>
      (
        p as unknown as {
          roadmap_tasks: { id: string; deadline_days_from_start: number; status: string }[];
        }
      ).roadmap_tasks,
  );
  await Promise.all(
    pending
      .filter((t) => t.status !== "done")
      .map((t) =>
        db
          .from("roadmap_tasks")
          .update({
            deadline: new Date(now.getTime() + t.deadline_days_from_start * 86_400_000)
              .toISOString()
              .slice(0, 10),
          })
          .eq("id", t.id)
          .eq("user_id", userId),
      ),
  );

  const { error: activateError } = await db
    .from("roadmaps")
    .update({ status: "active", activated_at: now.toISOString() })
    .eq("id", roadmapId)
    .eq("user_id", userId);
  if (activateError) throw new Error(activateError.message);
}
