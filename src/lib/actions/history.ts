import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import { loadFounderState, type OpportunityBrief } from "@/lib/actions/founder";
import { statedCapital, statedHours } from "@/lib/fit/model";
import type { ConsultationSnapshot } from "@/lib/history/compare";
import { getSchemaCapabilities } from "@/lib/schema-capabilities.server";
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
  /** A compact, canonical-English snapshot of the profile used at the time —
   * hours and money as the RANGES the founder picked, never a single figure. */
  profile: ConsultationSnapshot & {
    age: number | null;
    /** The parts of `location`, so each can be shown in the reader's language. */
    place: { city: string | null; state: string | null; country: string | null };
  };
  /** The directions generated in that consultation (first batch), best first. */
  directions: Pick<OpportunityBrief, "id" | "title" | "fit" | "status">[];
  selected: { id: string; title: string } | null;
  roadmapStatus: HistoryRoadmapStatus;
  /** An older consultation whose direction could be made current again. */
  canRestore: boolean;
  /** When the chosen direction's roadmap was built / finished (stored dates only). */
  roadmapBuiltAt: string | null;
  roadmapCompletedAt: string | null;
  /** Recorded progress on the chosen direction — counts from stored rows. */
  progress: {
    weeksCompleted: number;
    weeksTotal: number;
    missionsCompleted: number;
    evidence: number;
  } | null;
}

/** Decision history: every consultation, what it produced, what was chosen and
 * how far it got. Read-only — historical consultations are immutable except
 * through an explicit, confirmed Restore. */
export const getDecisionHistory = createServerFn({ method: "GET" }).handler(
  async (): Promise<HistoryEntry[]> => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);
    const [state, dnaRes, roadmapsRes, phasesRes, evidenceRes] = await Promise.all([
      loadFounderState(supabase, user.id, null),
      supabase
        .from("business_dna")
        .select("id, created_at, normalized_signals")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("roadmaps")
        .select("id, opportunity_id, status, activated_at, completed_at, created_at")
        .eq("user_id", user.id),
      supabase
        .from("roadmap_phases")
        .select("roadmap_id, roadmap_weeks(status, roadmap_tasks(status))")
        .eq("user_id", user.id),
      caps.proof
        ? supabase.from("proof_evidence").select("opportunity_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] as { opportunity_id: string }[] }),
    ]);
    if (dnaRes.error) throw new Error(dnaRes.error.message);

    type RoadmapRow = NonNullable<typeof roadmapsRes.data>[number];
    const roadmapByOpp = new Map<string, RoadmapRow>();
    for (const r of roadmapsRes.data ?? []) {
      const prior = roadmapByOpp.get(r.opportunity_id);
      // Prefer a live status over an archived one.
      if (!prior || prior.status === "archived" || prior.status === "available") {
        roadmapByOpp.set(r.opportunity_id, r);
      }
    }
    const progressByRoadmap = new Map<
      string,
      { weeksCompleted: number; weeksTotal: number; missionsCompleted: number }
    >();
    type PhaseRow = {
      roadmap_id: string;
      roadmap_weeks: { status: string; roadmap_tasks: { status: string }[] }[];
    };
    for (const p of (phasesRes.data ?? []) as unknown as PhaseRow[]) {
      const acc = progressByRoadmap.get(p.roadmap_id) ?? {
        weeksCompleted: 0,
        weeksTotal: 0,
        missionsCompleted: 0,
      };
      for (const w of p.roadmap_weeks ?? []) {
        acc.weeksTotal++;
        if (w.status === "completed") acc.weeksCompleted++;
        acc.missionsCompleted += (w.roadmap_tasks ?? []).filter((t) => t.status === "done").length;
      }
      progressByRoadmap.set(p.roadmap_id, acc);
    }
    const evidenceByOpp = new Map<string, number>();
    for (const e of evidenceRes.data ?? []) {
      evidenceByOpp.set(e.opportunity_id, (evidenceByOpp.get(e.opportunity_id) ?? 0) + 1);
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
      const roadmap = selected ? (roadmapByOpp.get(selected.id) ?? null) : null;
      const roadmapStatus = (
        roadmap ? (roadmap.status === "available" ? "archived" : roadmap.status) : "none"
      ) as HistoryRoadmapStatus;
      const counts = roadmap ? progressByRoadmap.get(roadmap.id) : undefined;
      return {
        consultationId: dna.id,
        createdAt: dna.created_at,
        isCurrent,
        profile: {
          status: profile.v2?.status ?? profile.identity.currentStatus ?? null,
          age: profile.identity.age,
          location:
            [profile.identity.city, profile.identity.state, profile.identity.country]
              .filter(Boolean)
              .join(", ") || null,
          hours: profile.time ? statedHours(profile) : null,
          capital: profile.resources ? statedCapital(profile) : null,
          currency: profile.identity.currency ?? null,
          // The option id when there is one (comparable and translatable), else the stored text.
          scale: profile.v2?.ambition.scaleId ?? profile.v2?.ambition.scale ?? null,
          place: {
            city: profile.identity.city,
            state: profile.identity.state,
            country: profile.identity.country,
          },
          skills: (profile.skills ?? []).map((s) => s.name).filter(Boolean),
          // 0 is how a consultation that never asked stores it — not "no experience".
          experienceYears: profile.experienceYears ? profile.experienceYears : null,
        },
        directions: first.map((b) => ({ id: b.id, title: b.title, fit: b.fit, status: b.status })),
        selected: selected ? { id: selected.id, title: selected.title } : null,
        roadmapStatus,
        canRestore: !isCurrent && anyDirection && Boolean(selected),
        roadmapBuiltAt: roadmap ? (roadmap.activated_at ?? null) : null,
        roadmapCompletedAt: roadmap ? (roadmap.completed_at ?? null) : null,
        progress:
          roadmap && counts ? { ...counts, evidence: evidenceByOpp.get(selected!.id) ?? 0 } : null,
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

/** Permanently removes an OLDER consultation and everything it produced
 * (directions, roadmaps, proof — foreign keys cascade). The consultation the
 * dashboard currently shows can never be deleted. The caller must have
 * confirmed; this cannot be undone. */
export const deleteConsultation = createServerFn({ method: "POST" })
  .validator(z.object({ consultationId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ deleted: true }> => {
    const { supabase, user } = await requireUser();
    const state = await loadFounderState(supabase, user.id, null);
    if (state.direction.consultationId === data.consultationId) {
      throw new Error("The current consultation can't be deleted");
    }
    const { error } = await supabase
      .from("business_dna")
      .delete()
      .eq("id", data.consultationId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return { deleted: true };
  });
