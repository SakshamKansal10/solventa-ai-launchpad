/**
 * Which consultation, opportunity and roadmap is "current" for a founder.
 *
 * This is the single source of truth every screen reads (Command Center,
 * Opportunities, Roadmap, Proof, Ask Sol, notifications) — it exists so the
 * same founder can never see a different "current direction" on two pages.
 *
 * Rules:
 *  1. The NEWEST completed consultation is always the default profile package.
 *  2. A selection or roadmap that belongs to an OLDER consultation never
 *     silently replaces it. An older direction becomes current only through an
 *     explicit Restore (profiles.active_opportunity_id), and only while that
 *     restore is newer than the latest consultation.
 *  3. A deep link may pin a specific consultation (the "ideas ready" email).
 */

export interface DirectionOpportunity {
  id: string;
  business_dna_id: string;
  status: "active" | "saved" | "dismissed" | "selected";
  fit_score: number;
  opportunity_index: number | null;
  batch_number: number;
  created_at: string;
}

export interface DirectionRoadmap {
  id: string;
  opportunity_id: string;
  status: "available" | "building" | "active" | "completed" | "failed" | "archived";
}

export interface DirectionInput {
  consultations: { id: string; created_at: string }[];
  opportunities: DirectionOpportunity[];
  roadmaps: DirectionRoadmap[];
  activePointer: { opportunityId: string | null; setAt: string | null };
  /** A consultation id from a deep link (validated against `consultations`). */
  pinnedConsultationId?: string | null;
}

export type FounderStage =
  | "no_consultation"
  | "ideas_ready"
  | "direction_selected"
  | "roadmap_building"
  | "roadmap_failed"
  | "roadmap_active"
  | "roadmap_completed";

export interface Direction {
  stage: FounderStage;
  /** The consultation being viewed (latest, restored, or pinned). */
  consultationId: string | null;
  isLatestConsultation: boolean;
  /** The founder's explicit choice inside the viewed consultation. */
  selectedId: string | null;
  /** The strongest option to feature when nothing is selected yet. */
  flagshipId: string | null;
  /** Up to two other options from the original batch, best first. */
  alternativeIds: string[];
  /** The live roadmap (building / active / failed / completed) for the selection. */
  roadmap: DirectionRoadmap | null;
  /** An archived roadmap exists for the selection (resume instead of rebuild). */
  hasArchivedRoadmap: boolean;
  /** Every opportunity in the viewed consultation, best first. */
  viewedIds: string[];
}

const byCreatedDesc = <T extends { created_at: string }>(a: T, b: T) =>
  Date.parse(b.created_at) - Date.parse(a.created_at);

function rankOpportunities(list: DirectionOpportunity[]): DirectionOpportunity[] {
  // The AI's own designated flagship (index 0) outranks fit_score; fit_score
  // orders everything else; created_at is the deterministic tie-break.
  const flagshipFirst = (o: DirectionOpportunity) => (o.opportunity_index === 0 ? 0 : 1);
  return [...list].sort(
    (a, b) =>
      flagshipFirst(a) - flagshipFirst(b) ||
      b.fit_score - a.fit_score ||
      Date.parse(a.created_at) - Date.parse(b.created_at),
  );
}

export function resolveDirection(input: DirectionInput): Direction {
  const consultations = [...input.consultations].sort(byCreatedDesc);
  const latest = consultations[0] ?? null;

  if (!latest) {
    return {
      stage: "no_consultation",
      consultationId: null,
      isLatestConsultation: true,
      selectedId: null,
      flagshipId: null,
      alternativeIds: [],
      roadmap: null,
      hasArchivedRoadmap: false,
      viewedIds: [],
    };
  }

  const pinned =
    input.pinnedConsultationId && consultations.some((c) => c.id === input.pinnedConsultationId)
      ? input.pinnedConsultationId
      : null;

  // An explicit restore only counts while it is newer than the latest consultation.
  const pointerOpp =
    input.activePointer.opportunityId && input.activePointer.setAt
      ? input.opportunities.find((o) => o.id === input.activePointer.opportunityId)
      : undefined;
  const restoreIsCurrent =
    pointerOpp !== undefined &&
    Date.parse(input.activePointer.setAt as string) >= Date.parse(latest.created_at);

  const consultationId = pinned ?? (restoreIsCurrent ? pointerOpp!.business_dna_id : latest.id);

  const inView = input.opportunities.filter((o) => o.business_dna_id === consultationId);
  const ranked = rankOpportunities(inView.filter((o) => o.status !== "dismissed"));
  const selected = inView.find((o) => o.status === "selected") ?? null;

  const firstBatch = ranked.filter((o) => o.batch_number === 1);
  const pool = firstBatch.length > 0 ? firstBatch : ranked;
  const flagship = pool[0] ?? null;
  const alternatives = pool.filter((o) => o.id !== (selected?.id ?? flagship?.id)).slice(0, 2);

  const forSelection = selected
    ? input.roadmaps.filter((r) => r.opportunity_id === selected.id)
    : [];
  const live = forSelection.find((r) =>
    ["building", "active", "failed", "completed"].includes(r.status),
  );
  const archived = forSelection.some((r) => r.status === "archived" || r.status === "available");

  let stage: FounderStage;
  if (inView.length === 0) stage = "no_consultation";
  else if (!selected) stage = "ideas_ready";
  else if (!live) stage = "direction_selected";
  else if (live.status === "building") stage = "roadmap_building";
  else if (live.status === "failed") stage = "roadmap_failed";
  else if (live.status === "completed") stage = "roadmap_completed";
  else stage = "roadmap_active";

  return {
    stage,
    consultationId,
    isLatestConsultation: consultationId === latest.id,
    selectedId: selected?.id ?? null,
    flagshipId: flagship?.id ?? null,
    alternativeIds: alternatives.map((o) => o.id),
    roadmap: live ?? null,
    hasArchivedRoadmap: archived,
    viewedIds: ranked.map((o) => o.id),
  };
}
