/**
 * Assumptions ↔ missions — which roadmap mission tests which assumption, the
 * founder-facing status of each assumption, and the one next action it needs.
 *
 * The status is still derived ONLY from recorded evidence (see state.ts). A
 * mission links an assumption to work; it never moves the status by itself:
 * finishing a mission with nothing recorded leaves the assumption "testing" and
 * asks the founder to record what the mission showed.
 */
import type { MissionState } from "@/lib/roadmap/state";
import type { ProofState, StateResult } from "./state";

/** The five statuses a founder sees (Not tested / Testing / Supported /
 * Contradicted / Inconclusive). */
export type AssumptionStatus =
  "not_tested" | "testing" | "supported" | "contradicted" | "inconclusive";

export const ASSUMPTION_STATUSES: AssumptionStatus[] = [
  "not_tested",
  "testing",
  "inconclusive",
  "supported",
  "contradicted",
];

export interface LinkableAssumption {
  id: string;
  category: string;
  position: number;
}
export interface LinkableTask {
  id: string;
  assumption_category: string | null;
}
export interface LinkableEvidence {
  task_id: string | null;
  assumption_id: string | null;
}

/** taskId → assumptionId. Evidence recorded from a mission against an
 * assumption is the strongest link; otherwise a mission tests the first
 * assumption (by position) in the category it was written for. A mission with
 * no category, or a category with no assumption, links to nothing. */
export function linkMissions(
  assumptions: LinkableAssumption[],
  tasks: LinkableTask[],
  evidence: LinkableEvidence[],
): Map<string, string> {
  const ids = new Set(assumptions.map((a) => a.id));
  const byCategory = new Map<string, string>();
  for (const a of [...assumptions].sort((x, y) => x.position - y.position)) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, a.id);
  }
  const explicit = new Map<string, string>();
  for (const e of evidence) {
    if (e.task_id && e.assumption_id && ids.has(e.assumption_id) && !explicit.has(e.task_id)) {
      explicit.set(e.task_id, e.assumption_id);
    }
  }
  const out = new Map<string, string>();
  for (const t of tasks) {
    const id =
      explicit.get(t.id) ?? (t.assumption_category ? byCategory.get(t.assumption_category) : null);
    if (id) out.set(t.id, id);
  }
  return out;
}

/** Evidence decides; a started or finished mission only says testing has begun. */
export function assumptionStatus(state: ProofState, missionStarted: boolean): AssumptionStatus {
  if (state === "supported") return "supported";
  if (state === "contradicted") return "contradicted";
  if (state === "mixed") return "inconclusive";
  if (state === "weak") return "testing";
  return missionStarted ? "testing" : "not_tested";
}

export interface LinkedMissionState {
  id: string;
  state: MissionState;
  evidenceCount: number;
}

export type NextActionCode =
  | "run_test"
  | "start_mission"
  | "finish_mission"
  | "record_mission"
  | "more_evidence"
  | "resolve"
  | "build_on"
  | "reconsider";

export interface NextAction {
  code: NextActionCode;
  /** The mission the action is about, when there is one. */
  missionId?: string;
  /** How many more independent results are needed ("more_evidence"). */
  n?: number;
}

/** The one thing to do next for an assumption — from its evidence and the
 * state of the missions that test it. */
export function nextAssumptionAction(
  status: AssumptionStatus,
  result: Pick<StateResult, "supporters">,
  threshold: number,
  missions: LinkedMissionState[],
): NextAction {
  if (status === "supported") return { code: "build_on" };
  if (status === "contradicted") return { code: "reconsider" };
  if (status === "inconclusive") return { code: "resolve" };

  const finishedSilent = missions.find((m) => m.state === "completed" && m.evidenceCount === 0);
  if (finishedSilent) return { code: "record_mission", missionId: finishedSilent.id };
  const running = missions.find((m) => m.state === "in_progress");
  if (running) return { code: "finish_mission", missionId: running.id };

  if (status === "testing") {
    return { code: "more_evidence", n: Math.max(1, threshold - result.supporters) };
  }
  const ready = missions.find((m) => m.state === "not_started");
  if (ready) return { code: "start_mission", missionId: ready.id };
  return { code: "run_test" };
}
