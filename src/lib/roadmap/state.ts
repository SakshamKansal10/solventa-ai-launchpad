/**
 * The roadmap state machine — pure functions only, so every screen renders
 * from the same derived truth and the rules are unit-testable.
 *
 *   roadmap : building → active → completed            (or failed, retryable)
 *   week    : locked → ready → in_progress → ready_to_close → completed
 *             (generating_next while its detail is being written)
 *   mission : not_started → in_progress → completed
 *
 * The database keeps the original coarse columns (week.status = locked|active|
 * completed, task.status = pending|in_progress|done|blocked); the richer states
 * are derived here from those plus the generation-lock columns, never stored,
 * so they cannot drift out of sync with the rows that justify them.
 */

export type RoadmapState = "building" | "active" | "completed" | "failed";
export type WeekState =
  "locked" | "ready" | "in_progress" | "ready_to_close" | "generating_next" | "completed";
export type MissionState = "not_started" | "in_progress" | "completed";

export type DbTaskStatus = "pending" | "in_progress" | "done" | "blocked";
export type DbWeekStatus = "locked" | "active" | "completed";
export type GenerationStatus = "idle" | "generating" | "ready" | "failed";

export function missionStateFromDb(status: DbTaskStatus): MissionState {
  if (status === "done") return "completed";
  if (status === "in_progress") return "in_progress";
  // 'blocked' came from the retired "I'm stuck → replan" flow; a blocked
  // mission is simply one the founder can start again.
  return "not_started";
}

export function missionStateToDb(state: MissionState): DbTaskStatus {
  if (state === "completed") return "done";
  if (state === "in_progress") return "in_progress";
  return "pending";
}

export interface MissionLike {
  status: DbTaskStatus;
  required: boolean;
}

export interface WeekLike {
  status: DbWeekStatus;
  generation_status?: GenerationStatus | null;
  /** The week's detail (mission text) exists. */
  hasDetail: boolean;
}

export interface MissionProgress {
  total: number;
  completed: number;
  requiredTotal: number;
  requiredCompleted: number;
  started: number;
}

export function missionProgress(missions: MissionLike[]): MissionProgress {
  const required = missions.filter((m) => m.required);
  return {
    total: missions.length,
    completed: missions.filter((m) => m.status === "done").length,
    requiredTotal: required.length,
    requiredCompleted: required.filter((m) => m.status === "done").length,
    started: missions.filter((m) => m.status === "in_progress" || m.status === "done").length,
  };
}

/** A week can be closed once every REQUIRED mission is done (or, if the week
 * has no required missions at all, every mission). Enforced server-side too. */
export function canCloseWeek(missions: MissionLike[]): boolean {
  if (missions.length === 0) return false;
  const p = missionProgress(missions);
  return p.requiredTotal > 0 ? p.requiredCompleted === p.requiredTotal : p.completed === p.total;
}

export function deriveWeekState(week: WeekLike, missions: MissionLike[]): WeekState {
  if (week.status === "locked") return "locked";
  if (week.status === "completed") return "completed";
  // Active but its detail isn't there: it is being (or failed to be) generated.
  if (!week.hasDetail || missions.length === 0) return "generating_next";
  if (canCloseWeek(missions)) return "ready_to_close";
  return missionProgress(missions).started > 0 ? "in_progress" : "ready";
}

export function deriveRoadmapState(status: string): RoadmapState {
  if (status === "building") return "building";
  if (status === "failed") return "failed";
  if (status === "completed") return "completed";
  return "active";
}

/** A lock is only trusted while fresh — a request that died mid-generation
 * must not wedge the week forever. */
export const GENERATION_LOCK_TTL_MS = 3 * 60 * 1000;

export function isGenerationLockFresh(
  startedAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!startedAt) return false;
  return now - Date.parse(startedAt) < GENERATION_LOCK_TTL_MS;
}

/** 1-based positions across the WHOLE roadmap. `week_number` alone is only
 * unique within a phase in older data, so the UI never trusts it. */
export function globalWeekNumbers<
  P extends { order_index: number; roadmap_weeks: { id: string; order_index: number }[] },
>(phases: P[]): Map<string, number> {
  const map = new Map<string, number>();
  let n = 0;
  for (const phase of [...phases].sort((a, b) => a.order_index - b.order_index)) {
    for (const week of [...phase.roadmap_weeks].sort((a, b) => a.order_index - b.order_index)) {
      map.set(week.id, ++n);
    }
  }
  return map;
}

/** Short bullets for a mission card: the structured `steps` when present, else
 * derived from the prose `how` (numbered items, then sentences), max 4. */
export function missionSteps(steps: unknown, how: string): string[] {
  if (Array.isArray(steps)) {
    const clean = steps.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
    if (clean.length > 0) return clean.slice(0, 4);
  }
  const numbered = how.match(/\d+[.)]\s*[^0-9]+/g);
  if (numbered && numbered.length > 1) {
    return numbered
      .map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 4);
  }
  const sentences = how
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length > 1 ? sentences.slice(0, 4) : how.trim() ? [how.trim()] : [];
}

export interface PhaseRange {
  first: number;
  last: number;
}

/** "Weeks 1–4" for each phase, from the global numbering above. */
export function phaseRanges<
  P extends {
    id: string;
    order_index: number;
    roadmap_weeks: { id: string; order_index: number }[];
  },
>(phases: P[]): Map<string, PhaseRange> {
  const numbers = globalWeekNumbers(phases);
  const out = new Map<string, PhaseRange>();
  for (const phase of phases) {
    const ns = phase.roadmap_weeks.map((w) => numbers.get(w.id)!).sort((a, b) => a - b);
    if (ns.length > 0) out.set(phase.id, { first: ns[0], last: ns[ns.length - 1] });
  }
  return out;
}
