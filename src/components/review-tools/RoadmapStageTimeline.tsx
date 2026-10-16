import { cn } from "@/lib/utils";

export interface StageInfo {
  key: string;
  title: string;
  isCurrent: boolean;
  isDone: boolean;
}

/** Compact horizontal stepper — used both on the dashboard (glance-level
 * progress) and expanded on the full roadmap page. A thin connecting rail
 * with small tick indicators, deliberately not a row of large numbered
 * circles — this is a progress instrument, not a game board. */
export function RoadmapStageTimeline({ phases }: { phases: StageInfo[] }) {
  return (
    <div className="flex items-center">
      {phases.map((phase, i) => (
        <div key={phase.key} className="flex flex-1 items-center last:flex-none">
          <div className="flex w-16 shrink-0 flex-col items-center gap-2.5 text-center sm:w-20">
            <span
              className={cn(
                "block rounded-full transition-colors",
                phase.isDone
                  ? "size-1.5 bg-econ-green-active"
                  : phase.isCurrent
                    ? "size-2 bg-econ-green-active ring-4 ring-econ-green-active/15"
                    : "size-1.5 bg-border",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "text-[0.66rem] font-medium uppercase tracking-[0.04em] leading-tight",
                phase.isCurrent
                  ? "text-primary"
                  : phase.isDone
                    ? "text-muted-foreground"
                    : "text-muted-foreground/60",
              )}
            >
              {phase.title}
            </span>
          </div>
          {i < phases.length - 1 && (
            <div
              className={cn("h-px flex-1", phase.isDone ? "bg-econ-green-active/50" : "bg-border")}
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </div>
  );
}
