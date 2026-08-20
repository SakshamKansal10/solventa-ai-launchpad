import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StageInfo {
  key: string;
  title: string;
  isCurrent: boolean;
  isDone: boolean;
}

/** Compact horizontal stepper — used both on the dashboard (glance-level
 * progress) and expanded on the full roadmap page. */
export function RoadmapStageTimeline({ phases }: { phases: StageInfo[] }) {
  return (
    <div className="flex items-start">
      {phases.map((phase, i) => (
        <div key={phase.key} className="flex flex-1 items-start last:flex-none">
          <div className="flex w-16 shrink-0 flex-col items-center gap-2 text-center sm:w-20">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full border-2 text-[0.75rem] font-semibold transition-colors",
                phase.isDone
                  ? "border-accent bg-accent text-primary"
                  : phase.isCurrent
                    ? "border-accent bg-card text-accent shadow-[0_0_0_4px_oklch(0.745_0.132_72_/_0.15)]"
                    : "border-border bg-card text-muted-foreground",
              )}
            >
              {phase.isDone ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-[0.68rem] font-medium leading-tight",
                phase.isCurrent ? "text-primary" : "text-muted-foreground",
              )}
            >
              {phase.title}
            </span>
          </div>
          {i < phases.length - 1 && (
            <div
              className={cn("mt-4 h-px flex-1", phase.isDone ? "bg-accent" : "bg-border")}
              aria-hidden="true"
            />
          )}
        </div>
      ))}
    </div>
  );
}
