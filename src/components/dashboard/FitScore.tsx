import { FIT_SCORE_MAXIMA, type FitScoreBreakdown } from "@/lib/profile/scoring";
import { cn } from "@/lib/utils";

const LABELS: Record<keyof FitScoreBreakdown, string> = {
  skills: "Skills",
  resources: "Resources",
  time: "Time",
  motivation: "Motivation",
  risk: "Risk",
  experience: "Experience",
  context: "Context",
};

// A fit score never hides an opportunity — even the best of 3 low scores is
// still shown as PRIMARY, with the label attached here as an honest
// confidence signal rather than a gate on visibility.
export function fitQualitativeLabel(score: number): string {
  if (score >= 90) return "Exceptional fit";
  if (score >= 80) return "Strong fit";
  if (score >= 70) return "Promising fit";
  if (score >= 60) return "Exploratory fit";
  return "Needs validation";
}

/** The dashboard hero's fit visual — a radial gauge, not a bordered
 * circle, since this is the single most important number on the page. */
export function FitRing({ score, size = 128 }: { score: number; size?: number }) {
  const stroke = size * 0.075;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[1.9rem] font-semibold leading-none text-primary">
          {score}
        </span>
        <span className="mt-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Solventia Fit
        </span>
      </div>
    </div>
  );
}

export function FitScoreBadge({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-full border-2 border-accent bg-card",
        size === "lg" ? "size-24" : "size-14",
      )}
    >
      <span
        className={cn(
          "font-display font-semibold text-primary",
          size === "lg" ? "text-3xl" : "text-lg",
        )}
      >
        {score}
      </span>
      {size === "lg" && (
        <span className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">Fit</span>
      )}
    </div>
  );
}

function qualitativeFactorLabel(value: number, max: number): string {
  const ratio = max > 0 ? value / max : 1;
  if (ratio >= 0.85) return "Excellent";
  if (ratio >= 0.65) return "Strong";
  if (ratio >= 0.4) return "Moderate";
  return "Low";
}

const FACTOR_TONE_CLASS: Record<"light" | "dark", Record<string, string>> = {
  light: {
    Excellent: "text-econ-green-active",
    Strong: "text-econ-green-deep",
    Moderate: "text-muted-foreground",
    Low: "text-muted-foreground/70",
  },
  dark: {
    Excellent: "text-econ-green-active",
    Strong: "text-workspace-foreground/85",
    Moderate: "text-workspace-muted",
    Low: "text-workspace-muted/70",
  },
};

/** Compact replacement for seven identical progress bars — a founder
 * scans this in under two seconds instead of decoding relative bar
 * lengths. A conspicuously low factor (e.g. skills) next to a still-solid
 * overall score gets an explicit one-line reframe instead of reading as a
 * contradiction — the score already accounts for how learnable the gap is. */
export function FitScoreMatrix({
  breakdown,
  variant = "light",
}: {
  breakdown: FitScoreBreakdown;
  variant?: "light" | "dark";
}) {
  const skillsLabel = qualitativeFactorLabel(breakdown.skills, FIT_SCORE_MAXIMA.skills);
  const labelClass = variant === "dark" ? "text-workspace-muted" : "text-muted-foreground";
  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {(Object.keys(FIT_SCORE_MAXIMA) as (keyof FitScoreBreakdown)[]).map((key) => {
          const label = qualitativeFactorLabel(breakdown[key], FIT_SCORE_MAXIMA[key]);
          return (
            <div key={key} className="flex items-center justify-between gap-3 text-[0.85rem]">
              <dt className={labelClass}>{LABELS[key]}</dt>
              <dd className={cn("font-medium", FACTOR_TONE_CLASS[variant][label])}>{label}</dd>
            </div>
          );
        })}
      </dl>
      {skillsLabel === "Low" && (
        <p className={cn("mt-3 text-[0.78rem] leading-relaxed", labelClass)}>
          Skill gap — learnable. The score already accounts for this being something you can pick
          up, not a disqualifier.
        </p>
      )}
    </div>
  );
}

export function FitScoreBreakdownList({ breakdown }: { breakdown: FitScoreBreakdown }) {
  return (
    <dl className="flex flex-col gap-2">
      {(Object.keys(FIT_SCORE_MAXIMA) as (keyof FitScoreBreakdown)[]).map((key) => (
        <div key={key} className="flex items-center gap-3 text-[0.82rem]">
          <dt className="w-24 shrink-0 text-muted-foreground">{LABELS[key]}</dt>
          <div className="h-1.5 flex-1 rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
              style={{ width: `${(breakdown[key] / FIT_SCORE_MAXIMA[key]) * 100}%` }}
            />
          </div>
          <dd className="w-12 shrink-0 text-right font-medium text-foreground">
            {breakdown[key]}/{FIT_SCORE_MAXIMA[key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
