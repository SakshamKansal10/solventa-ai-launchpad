import type { AssumptionStatus } from "@/lib/proof/links";
import type { WeekDTO } from "@/lib/roadmap/view";

/** The mission a founder should do next in a week: in progress, else the first required one
 * waiting, else the first one left. */
export function nextMissionId(week: WeekDTO): string | null {
  return (
    week.missions.find((m) => m.state === "in_progress")?.id ??
    week.missions.find((m) => m.state === "not_started" && m.required)?.id ??
    week.missions.find((m) => m.state !== "completed")?.id ??
    null
  );
}

/** A proof check has a result: supported, not supported, or unclear ("checking" is not yet a
 * result). Today's "N / M things checked" and Proof's count use this one rule. */
export function isProofChecked(status: AssumptionStatus): boolean {
  return status === "supported" || status === "contradicted" || status === "inconclusive";
}
