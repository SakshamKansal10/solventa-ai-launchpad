import type { MessageKey } from "@/lib/i18n";
import type { RoadmapView } from "@/lib/roadmap/view";

import type { RouteStage } from "./graphics";

export type StageKey = "validate" | "build" | "elevate";

/** Which of Validate · Build · Elevate a phase belongs to (by its key, else its position). */
export function stageOfPhase(key: string | undefined, index: number): StageKey {
  const k = (key ?? "").toLowerCase();
  if (/understand|valid|test|discover|problem|research/.test(k)) return "validate";
  if (/build|launch|first|deliver|offer/.test(k)) return "build";
  if (/improve|grow|scale|repeat|elevat/.test(k)) return "elevate";
  return index < 2 ? "validate" : index < 4 ? "build" : "elevate";
}

const LABEL: Record<StageKey, MessageKey> = {
  validate: "os.rm.validate",
  build: "os.rm.build",
  elevate: "os.rm.elevate",
};

/**
 * The roadmap's phases folded into one continuous route of three stages, each with the weeks it
 * spans and where the founder stands: done (every phase closed), current (holds the current
 * phase), or later.
 */
export function routeStages(
  view: RoadmapView,
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
): RouteStage[] {
  const groups: Record<StageKey, RoadmapView["phases"]> = { validate: [], build: [], elevate: [] };
  view.phases.forEach((p, i) => groups[stageOfPhase(p.key, i)].push(p));
  return (["validate", "build", "elevate"] as const).map((key) => {
    const phases = groups[key];
    const ranges = phases.flatMap((p) => (p.range ? [p.range] : []));
    const first = ranges.length ? Math.min(...ranges.map((r) => r.first)) : null;
    const last = ranges.length ? Math.max(...ranges.map((r) => r.last)) : null;
    const current = phases.some((p) => p.id === view.currentPhaseId);
    const done = phases.length > 0 && phases.every((p) => p.state === "completed");
    return {
      key,
      label: t(LABEL[key]),
      span:
        first === null || last === null
          ? t("os.rm.later")
          : first === last
            ? t("os.rm.week", { n: first })
            : t("os.rm.weeks", { a: first, b: last }),
      state: done ? "done" : current ? "current" : "later",
    };
  });
}
