import { useEffect, useState } from "react";

/**
 * The founder's journey as one arc (brief 3, "Journey arc component"): a quadratic Bézier from
 * (20, 200) through (600, −60) to (1180, 200). Week i of n sits at t = i / (n − 1):
 * x = 20 + 1160t, y = 200 − 520t + 520t². The current phase is a thicker light-cobalt stroke,
 * phase boundaries get a tick, the current week a filled dot with a soft halo, the final week a
 * ring; completed weeks are champagne. It draws once per visit, then the halo breathes
 * (both off under reduced motion — see styles.css).
 *
 * Without `totalWeeks` (the roadmap is still being written) only the curve is drawn: no week
 * count is invented.
 */

export interface ArcPhase {
  /** 1-based week numbers. */
  first: number;
  last: number;
}

const P0 = { x: 20, y: 200 };
const P1 = { x: 600, y: -60 };
const P2 = { x: 1180, y: 200 };
export const at = (t: number) => ({ x: 20 + 1160 * t, y: 200 - 520 * t + 520 * t * t });
const r1 = (n: number) => Math.round(n * 10) / 10;

/** The sub-curve between t0 and t1, as a path (blossoming gives the new control point). */
export function segment(t0: number, t1: number) {
  const a = at(t0);
  const b = at(t1);
  const w0 = (1 - t0) * (1 - t1);
  const w1 = (1 - t0) * t1 + t0 * (1 - t1);
  const w2 = t0 * t1;
  const c = { x: w0 * P0.x + w1 * P1.x + w2 * P2.x, y: w0 * P0.y + w1 * P1.y + w2 * P2.y };
  return `M${r1(a.x)} ${r1(a.y)} Q${r1(c.x)} ${r1(c.y)} ${r1(b.x)} ${r1(b.y)}`;
}

// Derived from the cobalt token so it reads on navy (the brief's light blue).
const LIGHT = "color-mix(in oklab, var(--sol-cobalt) 55%, white)";
const NAVY = "var(--sol-navy)";
const DONE = "var(--sol-champagne)";

let drawnThisVisit = false;

export function JourneyArc({
  totalWeeks,
  phases = [],
  currentWeek = null,
  completedWeeks = 0,
  label,
  className,
  draw,
  loop = false,
}: {
  totalWeeks: number | null;
  phases?: ArcPhase[];
  /** 1-based; null when no week is open. */
  currentWeek?: number | null;
  completedWeeks?: number;
  /** The accessible description (e.g. "An arc of 13 weeks in four phases. You are at week 1."). */
  label: string;
  className?: string;
  /** Force the drawing animation (the building screen draws on every visit). */
  draw?: boolean;
  /** Keep redrawing (the building screen, while the roadmap is being written). */
  loop?: boolean;
}) {
  // Draw once per visit (module scope survives client navigation), unless asked to draw.
  const [animate] = useState(() => draw || !drawnThisVisit);
  useEffect(() => {
    drawnThisVisit = true;
  }, []);

  const n = totalWeeks && totalWeeks > 0 ? totalWeeks : null;
  const tOf = (week: number) => (n && n > 1 ? (week - 1) / (n - 1) : 0);
  const current = n && currentWeek ? Math.min(Math.max(currentWeek, 1), n) : null;
  const currentPhase = current
    ? (phases.find((p) => current >= p.first && current <= p.last) ?? null)
    : null;
  const boundaries = n ? phases.slice(0, -1).map((p) => p.last + 0.5) : [];

  return (
    <svg
      viewBox="-24 40 1248 190"
      role="img"
      aria-label={label}
      className={className}
      style={{ display: "block", width: "100%", height: "auto" }}
      data-testid="journey-arc"
    >
      <path
        d="M20 200 Q600 -60 1180 200"
        fill="none"
        stroke="white"
        strokeOpacity={0.22}
        strokeWidth={2}
        pathLength={1}
        className={loop ? "dash-arc-loop" : animate ? "dash-arc-draw" : undefined}
      />
      {n && currentPhase && (
        <path
          d={segment(tOf(currentPhase.first), tOf(currentPhase.last))}
          fill="none"
          stroke={LIGHT}
          strokeWidth={5}
          strokeLinecap="round"
          pathLength={1}
          className={animate ? "dash-arc-draw" : undefined}
        />
      )}
      {boundaries.map((w) => {
        const p = at(tOf(w));
        return (
          <line
            key={w}
            x1={r1(p.x)}
            y1={r1(p.y - 14)}
            x2={r1(p.x)}
            y2={r1(p.y + 14)}
            stroke="white"
            strokeOpacity={0.45}
            strokeWidth={2}
          />
        );
      })}
      {n &&
        Array.from({ length: n }, (_, i) => i + 1).map((week) => {
          if (week === current) return null;
          const p = at(tOf(week));
          const done = week <= completedWeeks;
          const inPhase = currentPhase && week >= currentPhase.first && week <= currentPhase.last;
          if (week === n)
            return (
              <circle
                key={week}
                cx={r1(p.x)}
                cy={r1(p.y)}
                r={9}
                fill={done ? DONE : NAVY}
                stroke={done ? DONE : "white"}
                strokeWidth={3}
              />
            );
          if (done) return <circle key={week} cx={r1(p.x)} cy={r1(p.y)} r={6} fill={DONE} />;
          return (
            <circle
              key={week}
              cx={r1(p.x)}
              cy={r1(p.y)}
              r={inPhase ? 6 : 5}
              fill={NAVY}
              stroke={inPhase ? LIGHT : "white"}
              strokeOpacity={inPhase ? 1 : 0.5}
              strokeWidth={inPhase ? 2.5 : 2}
            />
          );
        })}
      {current &&
        (() => {
          const p = at(tOf(current));
          return (
            <g data-testid="arc-current" data-week={current}>
              <circle
                cx={r1(p.x)}
                cy={r1(p.y)}
                r={22}
                fill={LIGHT}
                fillOpacity={0.3}
                className="dash-halo"
              />
              <circle cx={r1(p.x)} cy={r1(p.y)} r={11} fill={LIGHT} />
            </g>
          );
        })()}
    </svg>
  );
}
