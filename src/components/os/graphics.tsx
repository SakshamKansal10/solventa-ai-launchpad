import { useId } from "react";
import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Solventia's visual language for the product — graphics that EXPLAIN, never decorate.
 *
 *   Trajectory      the one engineered stroke: light electric blue → cobalt → deep navy
 *   BusinessGraphic the opportunity's own mechanics (who pays → offer → how it earns → outcome),
 *                   drawn in the shape of the kind of business it is; labels are its own data
 *   FilterVisual    many possibilities narrowing to three paths (the idea reveal's transition)
 *   RoutePath       Validate → Build → Elevate as one continuous route, the current point lit
 *
 * Motion is quiet (a slow travelling light along a path) and disappears under reduced motion.
 * Champagne marks only what is resolved or current.
 */

export const TRAJECTORY = ["#6FBBFF", "#2F62D9", "#0E2A6B"] as const;

/**
 * The trajectory gradient, in canvas units (so even a perfectly straight path is painted —
 * a bounding-box gradient vanishes on a zero-height line).
 */
function Gradient({ id, x2, y2 }: { id: string; x2: number; y2: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor={TRAJECTORY[0]} />
      <stop offset="0.5" stopColor={TRAJECTORY[1]} />
      <stop offset="1" stopColor={TRAJECTORY[2]} />
    </linearGradient>
  );
}

/**
 * A trajectory drawn in, then (motion-safe) a slow light travelling along it.
 *
 * A `uniform` canvas (fixed aspect, one scale on both axes) draws the stroke itself and can carry
 * the light. A stretched canvas keeps strokes hairline-true (non-scaling) and wipes in instead — a
 * light there would smear into an ellipse, so it has none.
 */
function FlowPath({
  d,
  gradient,
  width = 2,
  delay = 0,
  uniform = false,
  light = false,
}: {
  d: string;
  gradient: string;
  width?: number;
  delay?: number;
  uniform?: boolean;
  light?: boolean;
}) {
  const reduced = useReducedMotion() === true;
  const id = useId().replace(/:/g, "");
  if (uniform)
    return (
      <>
        <path
          d={d}
          pathLength={1}
          fill="none"
          stroke={`url(#${gradient})`}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1"
          className="motion-safe:animate-[os-draw_1.6s_cubic-bezier(0.45,0,0.2,1)_both]"
          style={{ animationDelay: `${delay}ms` }}
        />
        {light && !reduced && (
          <g>
            <circle r={width * 2.6} fill="#FFFFFF" opacity={0.28} />
            <circle r={width * 1.05} fill="#FFFFFF" />
            <animateMotion
              dur="6s"
              begin={`${(delay + 1600) / 1000}s`}
              repeatCount="indefinite"
              path={d}
            />
          </g>
        )}
      </>
    );
  return (
    <>
      <defs>
        <mask id={`w-${id}`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
          <rect
            x="-10"
            y="-10"
            width="120"
            height="120"
            fill="white"
            className="motion-safe:animate-[os-wipe_1.4s_cubic-bezier(0.45,0,0.2,1)_both]"
            style={{
              transformBox: "fill-box",
              transformOrigin: "left center",
              animationDelay: `${delay}ms`,
            }}
          />
        </mask>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={`url(#${gradient})`}
        strokeWidth={width}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        mask={`url(#w-${id})`}
      />
    </>
  );
}

// ---- The business graphic ---------------------------------------------------------------

import type { GraphicNode, ModelKind } from "./model";

export type { GraphicNode, ModelKind };

type Pt = readonly [number, number];

/** A smooth curve from a to b; its tangents run down (the hero rail) or across (the card). */
function curve(a: Pt, b: Pt, down: boolean) {
  if (down) {
    const m = (b[1] - a[1]) / 2;
    return `M ${a[0]} ${a[1]} C ${a[0]} ${a[1] + m} ${b[0]} ${b[1] - m} ${b[0]} ${b[1]}`;
  }
  const m = (b[0] - a[0]) / 2;
  return `M ${a[0]} ${a[1]} C ${a[0] + m} ${a[1]} ${b[0] - m} ${b[1]} ${b[0]} ${b[1]}`;
}

/** An engineered route from a down to b: straight runs, rounded corners (goods moving). */
function routed(a: Pt, b: Pt) {
  const mid = (a[1] + b[1]) / 2;
  const r = 3;
  const s = Math.sign(b[0] - a[0]) || 1;
  return `M ${a[0]} ${a[1]} V ${mid - r} Q ${a[0]} ${mid} ${a[0] + s * r} ${mid} H ${b[0] - s * r} Q ${b[0]} ${mid} ${b[0]} ${mid + r} V ${b[1]}`;
}

const chain = (pts: Pt[], seg: (a: Pt, b: Pt) => string) =>
  pts
    .slice(1)
    .map((p, i) => seg(pts[i], p))
    .join(" ");

/**
 * How each kind of business moves. The hero draws the four steps down a rail (canvas 80 × 100)
 * with full labels beside them; the card draws the same model as a compact signature
 * (canvas 160 × 70). Both canvases hold a fixed aspect, so the geometry is never stretched.
 */
const SIGNATURES: Record<
  ModelKind,
  {
    rail: [number, number, number, number];
    mini: [Pt, Pt, Pt, Pt];
    motif?: "loop" | "converge" | "broadcast" | "routed";
  }
> = {
  // One clean sweep: the customer → your work → paid.
  service: {
    rail: [9, 17, 9, 17],
    mini: [
      [20, 50],
      [60, 20],
      [100, 48],
      [140, 20],
    ],
  },
  // Recurring use: the outcome returns to the start (champagne).
  product: {
    rail: [12, 18, 18, 12],
    mini: [
      [22, 35],
      [64, 14],
      [106, 35],
      [64, 58],
    ],
    motif: "loop",
  },
  // Two sides meeting in the middle.
  marketplace: {
    rail: [8, 14, 14, 14],
    mini: [
      [22, 35],
      [80, 16],
      [138, 35],
      [80, 58],
    ],
    motif: "converge",
  },
  // One piece of work reaching many people.
  content: {
    rail: [10, 13, 13, 16],
    mini: [
      [22, 48],
      [62, 20],
      [100, 44],
      [140, 18],
    ],
    motif: "broadcast",
  },
  // A steady climb.
  education: {
    rail: [6, 10, 14, 18],
    mini: [
      [22, 54],
      [62, 40],
      [100, 28],
      [140, 14],
    ],
  },
  // Goods routed to the customer.
  physical: {
    rail: [8, 17, 8, 17],
    mini: [
      [22, 26],
      [62, 50],
      [100, 24],
      [140, 46],
    ],
    motif: "routed",
  },
};

/**
 * The opportunity explained as its own mechanism — who pays → your offer → how it earns →
 * outcome — in the shape of the business it is, every label the opportunity's own words. The
 * outcome resolves in champagne. `mini` is the same model as a compact signature for cards.
 */
export function BusinessGraphic({
  kind,
  nodes,
  size = "hero",
  className,
  label,
  testId,
}: {
  kind: ModelKind;
  nodes: GraphicNode[];
  size?: "hero" | "mini";
  className?: string;
  /** Accessible summary of the model. */
  label: string;
  testId?: string;
}) {
  const id = useId().replace(/:/g, "");
  const sig = SIGNATURES[kind];
  const n = Math.min(nodes.length, 4);
  // The outcome always takes the last slot, however many steps the opportunity names.
  const slot = (i: number) => (i === n - 1 ? 3 : i);
  const full = n === 4;

  if (size === "mini") {
    const pts = Array.from({ length: n }, (_, i) => sig.mini[slot(i)]);
    const links: [number, number][] =
      full && sig.motif === "converge"
        ? [
            [0, 1],
            [2, 1],
            [1, 3],
          ]
        : pts.slice(1).map((_, i) => [i, i + 1]);
    const loop = full && sig.motif === "loop";
    const blue = loop ? links.slice(0, 2) : links;
    return (
      <figure
        role="img"
        aria-label={label}
        data-testid={testId}
        data-model={kind}
        className={cn("relative aspect-[16/7] w-full select-none", className)}
      >
        <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 160 70">
          <defs>
            <Gradient id={`g-${id}`} x2={160} y2={0} />
          </defs>
          {blue.map(([a, b], i) => (
            <FlowPath
              key={`${a}-${b}`}
              d={curve(pts[a], pts[b], false)}
              gradient={`g-${id}`}
              width={1.4}
              delay={i * 220}
              uniform
            />
          ))}
          {loop && (
            <path
              d={`${curve(pts[2], pts[3], false)} ${curve(pts[3], pts[0], false)}`}
              fill="none"
              stroke="#B8924F"
              strokeWidth={1.1}
              strokeDasharray="1.6 2.4"
              strokeLinecap="round"
            />
          )}
          {pts.map(([x, y], i) =>
            i === n - 1 ? (
              <g key={i}>
                <circle cx={x} cy={y} r={7} fill="#B8924F" opacity={0.16} />
                <circle cx={x} cy={y} r={3.6} fill="#B8924F" />
              </g>
            ) : (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={3.2}
                fill="#FFFFFF"
                stroke="#2F62D9"
                strokeWidth={1.1}
              />
            ),
          )}
        </svg>
      </figure>
    );
  }

  // Hero: the steps evenly down the canvas, the rail on the left, the words beside it.
  const ys = Array.from({ length: n }, (_, i) => ((i + 0.5) * 100) / n);
  const pts: Pt[] = ys.map((y, i) => [sig.rail[slot(i)], y]);
  const main = chain(pts, sig.motif === "routed" && full ? routed : (a, b) => curve(a, b, true));
  const [p0, p1, p2, p3] = pts;
  return (
    <figure
      role="img"
      aria-label={label}
      data-testid={testId}
      data-model={kind}
      className={cn("relative mx-auto aspect-[4/5] w-full max-w-[30rem] select-none", className)}
    >
      {/* Faint engineering grid (square cells): the canvas the model is drawn on. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(23,26,39,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(23,26,39,0.04)_1px,transparent_1px)] [background-size:12.5%_10%]"
      />
      <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 80 100">
        <defs>
          <Gradient id={`g-${id}`} x2={0} y2={100} />
        </defs>
        {full && sig.motif === "loop" && (
          <path
            d={`M ${p3[0]} ${p3[1]} C ${p3[0]} ${p3[1] + 9} 2.5 ${p3[1] + 4} 2.5 ${p3[1] - 10} V ${p0[1] + 10} C 2.5 ${p0[1] - 4} ${p0[0]} ${p0[1] - 9} ${p0[0]} ${p0[1]}`}
            fill="none"
            stroke="#B8924F"
            strokeWidth={0.32}
            strokeDasharray="0.9 1.3"
            strokeLinecap="round"
            className="motion-safe:animate-[os-fade_1s_ease-out_both]"
            style={{ animationDelay: "1500ms" }}
          />
        )}
        {full && sig.motif === "converge" && (
          <g opacity={0.5}>
            <FlowPath
              d={curve([22, 1], p1, true)}
              gradient={`g-${id}`}
              width={0.34}
              delay={200}
              uniform
            />
          </g>
        )}
        {full && sig.motif === "broadcast" && (
          <g opacity={0.45}>
            {[-5, 5].map((o) => (
              <FlowPath
                key={o}
                d={`M ${p1[0]} ${p1[1]} C ${p1[0] + o} ${p1[1] + 8} ${p2[0] + o} ${p2[1] - 8} ${p2[0]} ${p2[1]}`}
                gradient={`g-${id}`}
                width={0.3}
                delay={600}
                uniform
              />
            ))}
          </g>
        )}
        <FlowPath d={main} gradient={`g-${id}`} width={0.44} uniform light />
        {pts.map(([x, y], i) => (
          <g
            key={i}
            className="motion-safe:animate-[os-fade_0.6s_ease-out_both]"
            style={{ animationDelay: `${150 + i * 320}ms` }}
          >
            {i === n - 1 ? (
              <>
                <circle cx={x} cy={y} r={3} fill="#B8924F" opacity={0.16} />
                <circle cx={x} cy={y} r={1.45} fill="#B8924F" />
              </>
            ) : (
              <circle cx={x} cy={y} r={1.2} fill="#FFFFFF" stroke="#2F62D9" strokeWidth={0.44} />
            )}
          </g>
        ))}
      </svg>
      <div className="absolute inset-y-0 left-[32%] right-0">
        {nodes.slice(0, n).map((node, i) => {
          const outcome = i === n - 1;
          return (
            <div
              key={i}
              className="absolute inset-x-0 flex -translate-y-1/2 flex-col gap-1.5 motion-safe:animate-[os-rise_0.7s_cubic-bezier(0.22,1,0.36,1)_both]"
              style={{ top: `${ys[i]}%`, animationDelay: `${250 + i * 320}ms` }}
            >
              <span
                className={cn(
                  "text-[0.875rem] font-semibold uppercase leading-none tracking-[0.14em]",
                  outcome ? "text-[#7A5B2B]" : "text-[#3C4250]",
                )}
              >
                {node.role}
              </span>
              <span className="line-clamp-3 text-[clamp(0.9375rem,0.82rem+0.3vw,1.125rem)] font-semibold leading-snug text-[#171A27]">
                {node.text}
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

// ---- The reveal's transition --------------------------------------------------------------

/** Many possible directions, filtered by the founder's reality, resolving into three paths. */
export function FilterVisual({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const strands = Array.from({ length: 14 }, (_, i) => i);
  const ends = [22, 50, 78];
  // The canvas stretches to its box, so strokes stay non-scaling and the three end points are
  // real round dots laid over it (a circle in a stretched SVG would flatten into an oval).
  return (
    <div aria-hidden="true" className={cn("pointer-events-none relative", className)}>
      <svg
        className="absolute inset-0 size-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <Gradient id={`f-${id}`} x2={100} y2={0} />
        </defs>
        {/* Possibilities: faint strands that stop where reality filters them. */}
        <mask id={`s-${id}`} maskUnits="userSpaceOnUse" x="-5" y="-5" width="110" height="110">
          <rect
            x="-5"
            y="-5"
            width="50"
            height="110"
            fill="white"
            className="motion-safe:animate-[os-wipe_1s_ease-out_both]"
            style={{ transformBox: "fill-box", transformOrigin: "left center" }}
          />
        </mask>
        <g mask={`url(#s-${id})`}>
          {strands.map((i) => {
            const y = 6 + i * 6.6;
            return (
              <path
                key={i}
                d={`M 0 ${y} C 18 ${y} 26 ${y} 40 ${y + (50 - y) * 0.15}`}
                stroke="#171A27"
                strokeOpacity={0.16}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>
        {/* The filter: the founder's reality. */}
        <line
          x1="42"
          y1="4"
          x2="42"
          y2="96"
          stroke="#171A27"
          strokeOpacity={0.35}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          strokeDasharray="2 3"
        />
        {/* Three directions that fit. */}
        {ends.map((y, i) => (
          <FlowPath
            key={y}
            d={`M 42 ${50 + (y - 50) * 0.4} C 60 ${50 + (y - 50) * 0.5} 74 ${y} 96 ${y}`}
            gradient={`f-${id}`}
            width={i === 0 ? 2.6 : 1.8}
            delay={700 + i * 180}
          />
        ))}
      </svg>
      {ends.map((y, i) => (
        <span
          key={`e-${y}`}
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-[os-fade_0.5s_ease-out_both]",
            i === 0
              ? "size-4 bg-[#B8924F] shadow-[0_0_0_6px_rgba(184,146,79,0.16)]"
              : "size-2.5 bg-[#0E2A6B]",
          )}
          style={{ left: "96%", top: `${y}%`, animationDelay: `${1500 + i * 160}ms` }}
        />
      ))}
    </div>
  );
}

// ---- The roadmap route --------------------------------------------------------------------

export interface RouteStage {
  key: "validate" | "build" | "elevate";
  label: string;
  /** e.g. "Weeks 1–2" */
  span: string;
  state: "done" | "current" | "later";
}

/**
 * Validate → Build → Elevate as one continuous route. Achieved and current points carry
 * champagne; the way ahead is the trajectory blue. Horizontal on wide screens, vertical on
 * phones (stacked, one stage at a time).
 */
export function RoutePath({
  stages,
  className,
  testId,
  ariaLabel,
}: {
  stages: RouteStage[];
  className?: string;
  testId?: string;
  ariaLabel: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <div className={cn("relative", className)} data-testid={testId}>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[22px] hidden h-6 w-full overflow-visible sm:block"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <Gradient id={`r-${id}`} x2={100} y2={0} />
        </defs>
        <FlowPath d="M 2 5 C 20 1 30 9 50 5 C 70 1 80 9 98 5" gradient={`r-${id}`} width={2.5} />
      </svg>
      <ol aria-label={ariaLabel} className="relative grid gap-6 sm:grid-cols-3 sm:gap-4">
        {stages.map((s) => (
          <li key={s.key} className="flex items-start gap-4 sm:flex-col sm:items-start sm:gap-5">
            <span
              aria-hidden="true"
              className={cn(
                "relative z-[1] mt-1 flex size-[44px] shrink-0 items-center justify-center rounded-full border-2 bg-[#FCFAF7] sm:mt-0",
                s.state === "done" && "border-[#B8924F] bg-[#B8924F]",
                s.state === "current" && "border-[#B8924F]",
                s.state === "later" && "border-[#2F62D9]/50",
              )}
            >
              {s.state === "current" && (
                <span className="size-3.5 rounded-full bg-[#B8924F] motion-safe:animate-pulse" />
              )}
              {s.state === "done" && <span className="size-2 rounded-full bg-white" />}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block font-os text-[1.375rem] font-medium uppercase leading-none tracking-[-0.01em]",
                  s.state === "later" ? "text-[#454B59]" : "text-[#171A27]",
                )}
              >
                {s.label}
                {s.state === "current" && <span className="sr-only"> (current)</span>}
              </span>
              <span className="mt-2 block text-[0.9375rem] font-medium text-[#454B59]">
                {s.span}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
