import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import { loadFounderState, type OpportunityBrief } from "@/lib/actions/founder";
import {
  archiveActiveRoadmapsExcept,
  reactivateRoadmap,
  selectOpportunityRow,
  setActivePointer,
} from "@/lib/actions/direction.server";

export type HistoryRoadmapStatus =
  "none" | "building" | "active" | "completed" | "failed" | "archived";

export interface HistoryEntry {
  consultationId: string;
  createdAt: string;
  /** The default profile package right now (newest, unless a Restore is in force). */
  isCurrent: boolean;
  /** A compact, canonical-English snapshot of the profile used at the time. */
  profile: {
    status: string | null;
    age: number | null;
    country: string | null;
    state: string | null;
    weeklyHours: number | null;
    capitalAmount: number | null;
    currency: string | null;
    scale: string | null;
  };
  /** The directions generated in that consultation (first batch), best first. */
  directions: Pick<OpportunityBrief, "id" | "title" | "fit" | "status">[];
  selected: { id: string; title: string } | null;
  roadmapStatus: HistoryRoadmapStatus;
  /** An older consultation whose direction could be made current again. */
  canRestore: boolean;
}

/** Decision history: every consultation, what it produced, what was chosen and
 * how far it got. Read-only — historical consultations are immutable except
 * through an explicit, confirmed Restore. */
export const getDecisionHistory = createServerFn({ method: "GET" }).handler(
  async (): Promise<HistoryEntry[]> => {
    const { supabase, user } = await requireUser();
    const [state, dnaRes, roadmapsRes] = await Promise.all([
      loadFounderState(supabase, user.id, null),
      supabase
        .from("business_dna")
        .select("id, created_at, normalized_signals")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("roadmaps").select("opportunity_id, status").eq("user_id", user.id),
    ]);
    if (dnaRes.error) throw new Error(dnaRes.error.message);

    const roadmapByOpp = new Map<string, string>();
    for (const r of roadmapsRes.data ?? []) {
      const prior = roadmapByOpp.get(r.opportunity_id);
      // Prefer a live status over an archived one.
      if (!prior || prior === "archived" || prior === "available") {
        roadmapByOpp.set(r.opportunity_id, r.status === "available" ? "archived" : r.status);
      }
    }

    return (dnaRes.data ?? []).map((dna): HistoryEntry => {
      const profile = dna.normalized_signals as unknown as NormalizedProfile;
      const briefs = Object.values(state.briefs).filter((b) => b.consultationId === dna.id);
      const first = briefs
        .filter((b) => b.batch === 1 && b.status !== "dismissed")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const selected = briefs.find((b) => b.status === "selected") ?? null;
      const isCurrent = dna.id === state.direction.consultationId;
      const anyDirection = briefs.length > 0;
      return {
        consultationId: dna.id,
        createdAt: dna.created_at,
        isCurrent,
        profile: {
          status: profile.v2?.status ?? profile.identity.currentStatus ?? null,
          age: profile.identity.age,
          country: profile.identity.country,
          state: profile.identity.state,
          weeklyHours: profile.time?.weeklyHours ?? null,
          capitalAmount: profile.resources?.capitalAmount ?? null,
          currency: profile.identity.currency ?? null,
          scale: profile.v2?.ambition.scale ?? null,
        },
        directions: first.map((b) => ({ id: b.id, title: b.title, fit: b.fit, status: b.status })),
        selected: selected ? { id: selected.id, title: selected.title } : null,
        roadmapStatus: selected
          ? ((roadmapByOpp.get(selected.id) ?? "none") as HistoryRoadmapStatus)
          : "none",
        canRestore: !isCurrent && anyDirection && Boolean(selected),
      };
    });
  },
);

/** Makes an older consultation's chosen direction the current one — the ONLY
 * way history ever changes what the dashboard shows. The caller must have
 * confirmed; nothing is deleted (the previous direction and its roadmap are
 * archived, and can be restored the same way). */
export const restoreDirection = createServerFn({ method: "POST" })
  .validator(z.object({ opportunityId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ roadmapRestored: boolean }> => {
    const { supabase, user } = await requireUser();
    const { data: opp, error } = await supabase
      .from("opportunities")
      .select("id")
      .eq("id", data.opportunityId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!opp) throw new Error("Opportunity not found");

    await selectOpportunityRow(supabase, user.id, opp.id);
    await archiveActiveRoadmapsExcept(supabase, user.id, opp.id);

    const { data: roadmap } = await supabase
      .from("roadmaps")
      .select("id, status")
      .eq("opportunity_id", opp.id)
      .eq("user_id", user.id)
      .maybeSingle();
    let roadmapRestored = false;
    if (roadmap && (roadmap.status === "archived" || roadmap.status === "available")) {
      await reactivateRoadmap(supabase, user.id, roadmap.id);
      roadmapRestored = true;
    }
    await setActivePointer(supabase, user.id, opp.id);
    return { roadmapRestored };
  });
