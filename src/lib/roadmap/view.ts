import {
  deriveRoadmapState,
  deriveWeekState,
  globalWeekNumbers,
  missionProgress,
  missionStateFromDb,
  missionSteps,
  phaseRanges,
  type DbTaskStatus,
  type DbWeekStatus,
  type GenerationStatus,
  type MissionState,
  type RoadmapState,
  type WeekState,
} from "@/lib/roadmap/state";

/** Raw rows as read from Supabase (only the columns the view needs). */
export interface RawTask {
  id: string;
  order_index: number;
  what: string;
  why: string;
  how: string;
  steps: unknown;
  time_estimate: string | null;
  deadline: string | null;
  done_when: string;
  required: boolean;
  evidence_required: boolean | null;
  assumption_category: string | null;
  status: DbTaskStatus;
  /** Present once migration 0008+ is applied; absent on older databases. */
  completed_at?: string | null;
}

export interface RawWeek {
  id: string;
  order_index: number;
  title: string;
  objective: string;
  status: DbWeekStatus;
  mission: string | null;
  mistakes_to_avoid: unknown;
  evidence_required: string | null;
  success_threshold: string | null;
  evidence_target: number | null;
  adaptation_note: string | null;
  generation_status: GenerationStatus | null;
  generation_error: string | null;
  reflection_outcome: string | null;
  reflection_blocker: string | null;
  reflection_note: string | null;
  founder_reflection: string | null;
  closed_at: string | null;
  unlocked_at: string | null;
  roadmap_tasks: RawTask[];
}

export interface RawPhase {
  id: string;
  order_index: number;
  key: string;
  title: string;
  description: string | null;
  roadmap_weeks: RawWeek[];
}

export interface RawRoadmap {
  id: string;
  opportunity_id: string;
  status: string;
  north_star: string | null;
  build_error: string | null;
  activated_at: string | null;
}

export interface EvidenceRef {
  week_id: string | null;
  task_id: string | null;
}

export interface MissionDTO {
  id: string;
  order: number;
  title: string;
  why: string;
  steps: string[];
  timeEstimate: string | null;
  doneWhen: string;
  required: boolean;
  evidenceRequired: boolean;
  assumptionCategory: string | null;
  deadline: string | null;
  state: MissionState;
  evidenceCount: number;
  /** When the founder marked it done (ISO); null while open. */
  completedAt: string | null;
}

export interface WeekDTO {
  id: string;
  phaseId: string;
  number: number;
  title: string;
  objective: string;
  state: WeekState;
  hasDetail: boolean;
  mission: string | null;
  mistakes: string[];
  successThreshold: string | null;
  evidenceTarget: number | null;
  evidenceRequiredText: string | null;
  adaptationNote: string | null;
  generationStatus: GenerationStatus;
  generationError: string | null;
  reflection: { outcome: string | null; blocker: string | null; note: string | null } | null;
  closedAt: string | null;
  unlockedAt: string | null;
  evidenceCount: number;
  progress: { total: number; completed: number; requiredTotal: number; requiredCompleted: number };
  missions: MissionDTO[];
}

export interface PhaseDTO {
  id: string;
  order: number;
  key: string;
  title: string;
  description: string | null;
  range: { first: number; last: number } | null;
  state: "completed" | "current" | "future";
  weekIds: string[];
}

export interface RoadmapView {
  roadmap: {
    id: string;
    status: RoadmapState;
    opportunityId: string;
    opportunityTitle: string;
    northStar: string | null;
    buildError: string | null;
    activatedAt: string | null;
  };
  phases: PhaseDTO[];
  weeks: WeekDTO[];
  currentWeekId: string | null;
  currentPhaseId: string | null;
  totals: { weeks: number; completedWeeks: number; missionsCompleted: number; evidence: number };
}

export function buildRoadmapView(input: {
  roadmap: RawRoadmap;
  opportunityTitle: string;
  phases: RawPhase[];
  evidence: EvidenceRef[];
}): RoadmapView {
  const phases = [...input.phases].sort((a, b) => a.order_index - b.order_index);
  const numbers = globalWeekNumbers(phases);
  const ranges = phaseRanges(phases);

  const evidenceByWeek = new Map<string, number>();
  const evidenceByTask = new Map<string, number>();
  for (const e of input.evidence) {
    if (e.week_id) evidenceByWeek.set(e.week_id, (evidenceByWeek.get(e.week_id) ?? 0) + 1);
    if (e.task_id) evidenceByTask.set(e.task_id, (evidenceByTask.get(e.task_id) ?? 0) + 1);
  }

  const weeks: WeekDTO[] = [];
  for (const phase of phases) {
    for (const w of [...phase.roadmap_weeks].sort((a, b) => a.order_index - b.order_index)) {
      const tasks = [...w.roadmap_tasks].sort((a, b) => a.order_index - b.order_index);
      const hasDetail = w.mission !== null && tasks.length > 0;
      const gen: GenerationStatus = w.generation_status ?? (hasDetail ? "ready" : "idle");
      const progress = missionProgress(tasks);
      const reflection =
        w.reflection_outcome || w.reflection_blocker || w.reflection_note || w.founder_reflection
          ? {
              outcome: w.reflection_outcome,
              blocker: w.reflection_blocker,
              note: w.reflection_note ?? w.founder_reflection,
            }
          : null;
      weeks.push({
        id: w.id,
        phaseId: phase.id,
        number: numbers.get(w.id) ?? 0,
        title: w.title,
        objective: w.objective,
        state: deriveWeekState({ status: w.status, generation_status: gen, hasDetail }, tasks),
        hasDetail,
        mission: w.mission,
        mistakes: Array.isArray(w.mistakes_to_avoid)
          ? (w.mistakes_to_avoid as unknown[]).filter((m): m is string => typeof m === "string")
          : [],
        successThreshold: w.success_threshold,
        evidenceTarget: w.evidence_target,
        evidenceRequiredText: w.evidence_required,
        adaptationNote: w.adaptation_note,
        generationStatus: gen,
        generationError: w.generation_error,
        reflection,
        closedAt: w.closed_at,
        unlockedAt: w.unlocked_at,
        evidenceCount: evidenceByWeek.get(w.id) ?? 0,
        progress: {
          total: progress.total,
          completed: progress.completed,
          requiredTotal: progress.requiredTotal,
          requiredCompleted: progress.requiredCompleted,
        },
        missions: tasks.map((t) => ({
          id: t.id,
          order: t.order_index,
          title: t.what,
          why: t.why,
          steps: missionSteps(t.steps, t.how),
          timeEstimate: t.time_estimate,
          doneWhen: t.done_when,
          required: t.required,
          evidenceRequired: Boolean(t.evidence_required),
          assumptionCategory: t.assumption_category,
          deadline: t.deadline,
          state: missionStateFromDb(t.status),
          evidenceCount: evidenceByTask.get(t.id) ?? 0,
          completedAt: t.completed_at ?? null,
        })),
      });
    }
  }

  const current = weeks.find((w) => w.state !== "locked" && w.state !== "completed") ?? null;
  const firstOpen = weeks.find((w) => w.state !== "completed") ?? null;
  const currentWeek = current ?? firstOpen;

  const phaseDTOs: PhaseDTO[] = phases.map((p) => {
    const pw = weeks.filter((w) => w.phaseId === p.id);
    const allDone = pw.length > 0 && pw.every((w) => w.state === "completed");
    return {
      id: p.id,
      order: p.order_index,
      key: p.key,
      title: p.title,
      description: p.description,
      range: ranges.get(p.id) ?? null,
      state: allDone
        ? "completed"
        : currentWeek && currentWeek.phaseId === p.id
          ? "current"
          : "future",
      weekIds: pw.map((w) => w.id),
    };
  });

  return {
    roadmap: {
      id: input.roadmap.id,
      status: deriveRoadmapState(input.roadmap.status),
      opportunityId: input.roadmap.opportunity_id,
      opportunityTitle: input.opportunityTitle,
      northStar: input.roadmap.north_star,
      buildError: input.roadmap.build_error,
      activatedAt: input.roadmap.activated_at,
    },
    phases: phaseDTOs,
    weeks,
    currentWeekId: current?.id ?? null,
    currentPhaseId: currentWeek?.phaseId ?? null,
    totals: {
      weeks: weeks.length,
      completedWeeks: weeks.filter((w) => w.state === "completed").length,
      missionsCompleted: weeks.reduce((n, w) => n + w.progress.completed, 0),
      evidence: input.evidence.length,
    },
  };
}

/** Optimistic update: the view as it will be once `taskId` is set to `state`.
 * Recomputes the mission's week progress and week state from the same rules the
 * server view uses, so the UI never shows a state the rules wouldn't produce. */
export function applyMissionState(
  view: RoadmapView,
  taskId: string,
  state: MissionState,
): RoadmapView {
  const weeks = view.weeks.map((w) => {
    if (!w.missions.some((m) => m.id === taskId)) return w;
    const missions = w.missions.map((m) =>
      m.id === taskId
        ? {
            ...m,
            state,
            completedAt: state === "completed" ? new Date().toISOString() : null,
          }
        : m,
    );
    const like = missions.map((m) => ({
      status: (m.state === "completed"
        ? "done"
        : m.state === "in_progress"
          ? "in_progress"
          : "pending") as DbTaskStatus,
      required: m.required,
    }));
    const progress = missionProgress(like);
    return {
      ...w,
      missions,
      progress: {
        total: progress.total,
        completed: progress.completed,
        requiredTotal: progress.requiredTotal,
        requiredCompleted: progress.requiredCompleted,
      },
      state: deriveWeekState(
        { status: "active", generation_status: w.generationStatus, hasDetail: w.hasDetail },
        like,
      ),
    };
  });
  return {
    ...view,
    weeks,
    totals: {
      ...view.totals,
      missionsCompleted: weeks.reduce((n, w) => n + w.progress.completed, 0),
    },
  };
}
