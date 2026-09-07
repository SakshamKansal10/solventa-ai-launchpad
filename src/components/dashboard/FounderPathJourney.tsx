import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = ["Idea", "Proof", "Offer", "First Users", "Repeatability", "Growth"] as const;

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 120;
const AMPLITUDE = 26;

/** A gentle sine curve, not a straight line — node y-positions are
 * sampled from the exact same function that draws the path, so the
 * nodes always sit precisely on it. */
function pointAt(index: number, total: number) {
  const x = (VIEW_WIDTH / (total - 1)) * index;
  const y = VIEW_HEIGHT / 2 + Math.sin((index / (total - 1)) * Math.PI * 1.5) * AMPLITUDE;
  return { x, y };
}

function curvePath(total: number): string {
  const points = Array.from({ length: total }, (_, i) => pointAt(i, total));
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    d += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

/** The founder's whole journey as one elegant curved path — activeStage
 * is an index 0-5; everything before it reads as done (champagne),
 * activeStage itself glows violet, everything after is outlined/future.
 * Clicking any stage (done, current, or future) shows a small popover
 * naming it — future stages never navigate anywhere, just label
 * themselves. */
export function FounderPathJourney({ activeStage }: { activeStage: number }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const n = STAGES.length;
  const points = STAGES.map((_, i) => pointAt(i, n));

  return (
    <div className="relative w-full" style={{ height: VIEW_HEIGHT + 40 }}>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="absolute inset-x-0 top-0 h-[120px] w-full"
        preserveAspectRatio="none"
      >
        <path d={curvePath(n)} fill="none" stroke="var(--sol-border)" strokeWidth={2} />
        <path
          d={curvePath(Math.max(2, activeStage + 1))}
          fill="none"
          stroke="var(--sol-champagne)"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      <div className="absolute inset-x-0 top-0 h-[120px] w-full">
        {STAGES.map((stage, i) => {
          const isDone = i < activeStage;
          const isCurrent = i === activeStage;
          const isFuture = i > activeStage;
          const p = points[i];
          return (
            <button
              key={stage}
              type="button"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 outline-none"
              style={{ left: `${(p.x / VIEW_WIDTH) * 100}%`, top: p.y }}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-[0.75rem] font-bold transition-all",
                  isDone && "border-sol-champagne bg-sol-champagne text-white",
                  isCurrent &&
                    "border-sol-violet bg-sol-violet text-white shadow-[0_0_0_6px_oklch(0.5534_0.189_288.3_/_16%)]",
                  isFuture && "border-sol-border-strong bg-sol-surface text-sol-muted",
                )}
              >
                {isDone ? <Check className="size-4" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[0.74rem] font-semibold",
                  isCurrent
                    ? "text-sol-violet-deep"
                    : isDone
                      ? "text-sol-champagne-deep"
                      : "text-sol-muted",
                )}
              >
                {stage}
              </span>
              {openIndex === i && (
                <span
                  className="absolute top-full mt-1 whitespace-nowrap rounded-lg bg-sol-ink px-3 py-1.5 text-[0.72rem] font-medium text-white shadow-lg"
                  role="tooltip"
                >
                  {isCurrent ? "You are here." : isDone ? "Completed." : "Not reached yet."}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
