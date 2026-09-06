import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = ["Idea", "Validation", "First Offer", "First Users", "Growth"] as const;

/** The founder's whole journey in one glance — five fixed milestones,
 * never a paragraph explaining where they are. `activeStage` is an index
 * 0-4; everything before it reads as done, everything after as upcoming. */
export function ProgressMap({ activeStage }: { activeStage: number }) {
  return (
    <div className="flex items-center">
      {STAGES.map((stage, i) => {
        const isDone = i < activeStage;
        const isCurrent = i === activeStage;
        const isLast = i === STAGES.length - 1;
        return (
          <div key={stage} className={cn("flex items-center", !isLast && "flex-1")}>
            <div className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-[0.72rem] font-bold transition-colors",
                  isDone && "border-econ-green-active bg-econ-green-active text-white",
                  isCurrent &&
                    "border-gold bg-gold/[0.14] text-dashboard-heading ring-4 ring-gold/15",
                  !isDone && !isCurrent && "border-border bg-card text-dashboard-muted",
                )}
              >
                {isDone ? <Check className="size-4" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[0.72rem] font-semibold",
                  isCurrent
                    ? "text-dashboard-heading"
                    : isDone
                      ? "text-econ-green-active"
                      : "text-dashboard-muted",
                )}
              >
                {stage}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1 rounded-full",
                  isDone ? "bg-econ-green-active/60" : "bg-border",
                )}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
