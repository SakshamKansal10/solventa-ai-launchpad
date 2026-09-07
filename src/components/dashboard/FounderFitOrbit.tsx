import { useState } from "react";
import type { FitScoreBreakdown } from "@/lib/profile/scoring";
import { cn } from "@/lib/utils";

/** The four orbit points around the fit ring — real breakdown values,
 * mapped from the seven-factor score to the spec's four labels (Capital
 * = resources, Access = context/location, matching this app's existing
 * deterministic scoring dimensions — never invented). */
function orbitPoints(breakdown: FitScoreBreakdown) {
  return [
    { label: "Skills", value: breakdown.skills, max: 20, angle: -45 },
    { label: "Capital", value: breakdown.resources, max: 20, angle: 45 },
    { label: "Time", value: breakdown.time, max: 15, angle: 135 },
    { label: "Access", value: breakdown.context, max: 10, angle: 225 },
  ];
}

/** 160x160 radial fit visualization with four orbit points (Skills,
 * Capital, Time, Access) positioned around it — hover/tap any point for
 * its real breakdown value, never a decorative-only ring. */
export function FounderFitOrbit({
  score,
  breakdown,
  variant = "light",
}: {
  score: number;
  breakdown: FitScoreBreakdown;
  variant?: "light" | "dark";
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const size = 160;
  const stroke = size * 0.06;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const trackColor = variant === "dark" ? "var(--workspace-border)" : "var(--sol-border)";
  const numberClass = variant === "dark" ? "text-white" : "text-sol-ink";
  const labelClass = variant === "dark" ? "text-white/60" : "text-sol-secondary";

  const points = orbitPoints(breakdown);
  const orbitRadius = size / 2 + 22;

  return (
    <div className="relative shrink-0" style={{ width: size + 60, height: size + 60 }}>
      <div className="absolute" style={{ left: 30, top: 30, width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--sol-champagne)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn("font-display text-[2.1rem] font-semibold leading-none", numberClass)}
          >
            {score}
          </span>
          <span
            className={cn(
              "mt-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em]",
              labelClass,
            )}
          >
            Founder Fit
          </span>
        </div>
      </div>

      {points.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        const x = size / 2 + 30 + orbitRadius * Math.cos(rad);
        const y = size / 2 + 30 + orbitRadius * Math.sin(rad);
        const ratio = p.max > 0 ? p.value / p.max : 0;
        const isActive = activeIndex === i;
        return (
          <button
            key={p.label}
            type="button"
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={() => setActiveIndex(isActive ? null : i)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 outline-none"
            style={{ left: x, top: y }}
          >
            <span
              className={cn(
                "flex size-2.5 rounded-full transition-transform duration-150",
                isActive && "scale-125",
              )}
              style={{
                backgroundColor:
                  ratio >= 0.65 ? "var(--sol-champagne)" : "var(--sol-border-strong)",
              }}
            />
            <span
              className={cn(
                "text-[0.62rem] font-semibold uppercase tracking-[0.08em]",
                variant === "dark" ? "text-white/70" : "text-sol-secondary",
              )}
            >
              {p.label}
            </span>
            {isActive && (
              <span
                className="absolute top-full mt-1.5 whitespace-nowrap rounded-lg bg-sol-ink px-2.5 py-1 text-[0.7rem] font-medium text-white shadow-lg"
                role="tooltip"
              >
                {p.value}/{p.max}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
