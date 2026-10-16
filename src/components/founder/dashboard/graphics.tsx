import { motion, useReducedMotion } from "motion/react";
import { Check, Loader2, Lock, LockOpen, TriangleAlert, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/* Small, data-true graphics for the Command Center. Every one draws a real count
 * or state from the founder's own roadmap and evidence — never a score. */

const EASE = [0.22, 1, 0.36, 1] as const;

/* -------------------------------------------------------------- ProgressRing */

const R = 34;
const CIRC = 2 * Math.PI * R;

/** A donut for "x of y". Empty (y = 0) draws a dashed outline instead of 0%. */
export function ProgressRing({
  value,
  total,
  label,
  tone = "violet",
  testId,
}: {
  value: number;
  total: number;
  label: string;
  tone?: "violet" | "champagne";
  testId?: string;
}) {
  const reduceMotion = useReducedMotion();
  const frac = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <div className="flex flex-col items-center gap-2" data-testid={testId}>
      <div
        className="relative size-[76px] sm:size-[92px]"
        role="img"
        aria-label={`${label}: ${value} / ${total}`}
      >
        <svg viewBox="0 0 88 88" className="size-full -rotate-90" aria-hidden="true">
          <circle
            cx={44}
            cy={44}
            r={R}
            fill="none"
            strokeWidth={9}
            strokeDasharray={total === 0 ? "3 7" : undefined}
            className="stroke-sol-ivory-depth"
          />
          <motion.circle
            cx={44}
            cy={44}
            r={R}
            fill="none"
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            className={tone === "violet" ? "stroke-sol-violet" : "stroke-sol-champagne-deep"}
            initial={{ strokeDashoffset: reduceMotion ? CIRC * (1 - frac) : CIRC }}
            animate={{ strokeDashoffset: CIRC * (1 - frac) }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-display text-[1.25rem] font-semibold leading-none text-sol-ink sm:text-[1.625rem]">
          <span>
            {value}
            <span className="text-[0.9375rem] font-medium text-sol-secondary">/{total}</span>
          </span>
        </span>
      </div>
      <span className="text-[0.875rem] font-bold uppercase tracking-[0.08em] text-sol-secondary">
        {label}
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------- StackedBar */

export interface BarSegment {
  value: number;
  className: string;
  label: string;
}

/** One bar split by state (supported / testing / untested / contradicted). */
export function StackedBar({
  segments,
  track,
  ariaLabel,
}: {
  segments: BarSegment[];
  track: string;
  ariaLabel: string;
}) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  return (
    <div
      className={cn("flex h-2.5 w-full overflow-hidden rounded-full", track)}
      role="img"
      aria-label={ariaLabel}
    >
      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <motion.span
              key={s.label}
              title={`${s.label}: ${s.value}`}
              className={cn("h-full", s.className)}
              initial={{ width: 0 }}
              animate={{ width: `${(s.value / total) * 100}%` }}
              transition={{ duration: 0.7, ease: EASE }}
            />
          ))}
    </div>
  );
}

/* ------------------------------------------------------------------ WeekTrack */

export interface TrackMission {
  id: string;
  title: string;
  state: "not_started" | "in_progress" | "completed";
}

/** This week as a short track: one node per mission, then the lock that opens
 * the next week. Done nodes are champagne, the active one violet. */
export function WeekTrack({
  missions,
  unlocked,
  nextLabel,
  onOpen,
  testId,
}: {
  missions: TrackMission[];
  unlocked: boolean;
  nextLabel: string;
  onOpen: (missionId: string) => void;
  testId?: string;
}) {
  const reduceMotion = useReducedMotion();
  const activeId =
    missions.find((m) => m.state === "in_progress")?.id ??
    missions.find((m) => m.state === "not_started")?.id ??
    null;
  return (
    <div className="flex items-center" data-testid={testId}>
      {missions.map((m, i) => {
        const done = m.state === "completed";
        const active = m.id === activeId;
        return (
          <div key={m.id} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => onOpen(m.id)}
              title={m.title}
              aria-label={m.title}
              data-state={m.state}
              data-testid="track-node"
              className="relative flex size-12 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/60"
            >
              {active && !reduceMotion && (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border-2 border-sol-violet/60"
                  animate={{ scale: [1, 1.3], opacity: [0.7, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border-2 font-display text-[1rem] font-semibold transition-colors",
                  done
                    ? "border-sol-champagne bg-sol-champagne text-sol-ink"
                    : active
                      ? "border-sol-violet bg-sol-violet text-white"
                      : "border-sol-border-strong bg-sol-surface text-sol-secondary",
                )}
              >
                {done ? <Check className="size-5" strokeWidth={3} aria-hidden="true" /> : i + 1}
              </span>
            </button>
            <motion.span
              aria-hidden="true"
              className={cn(
                "mx-1 h-[3px] flex-1 origin-left rounded-full",
                done ? "bg-sol-champagne" : "bg-sol-border",
              )}
              initial={{ scaleX: reduceMotion ? 1 : 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
            />
          </div>
        );
      })}
      <span
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-full border-2 px-3.5 py-2 text-[0.9375rem] font-semibold transition-colors",
          unlocked
            ? "border-sol-champagne bg-sol-champagne-soft text-sol-champagne-deep"
            : "border-dashed border-sol-border-strong text-sol-secondary",
        )}
        data-testid="track-lock"
        data-unlocked={unlocked}
      >
        {unlocked ? (
          <LockOpen className="size-4" aria-hidden="true" />
        ) : (
          <Lock className="size-4" aria-hidden="true" />
        )}
        {nextLabel}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------- JourneyRibbon */

export interface RibbonPhase {
  id: string;
  number: number;
  title: string;
  current: boolean;
  weeks: { id: string; state: "completed" | "current" | "future" }[];
}

/** The whole roadmap on one line: a segment per week, grouped by phase. */
export function JourneyRibbon({
  phases,
  onOpenPhase,
}: {
  phases: RibbonPhase[];
  onOpenPhase: (id: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1" data-testid="journey-ribbon">
      <ol className="flex min-w-[28rem] items-end gap-3">
        {phases.map((p, pi) => (
          <li key={p.id} className="flex flex-1 flex-col gap-2">
            <button
              type="button"
              onClick={() => onOpenPhase(p.id)}
              title={p.title}
              aria-label={p.title}
              className={cn(
                "flex items-center gap-2 text-left text-[0.875rem] font-bold uppercase tracking-[0.08em] outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/50",
                p.current ? "text-sol-violet-deep" : "text-sol-secondary",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[0.875rem]",
                  p.current ? "bg-sol-violet text-white" : "bg-sol-ivory-depth text-sol-secondary",
                )}
              >
                {p.number}
              </span>
            </button>
            <div className="flex gap-1">
              {p.weeks.map((w, wi) => (
                <motion.span
                  key={w.id}
                  data-state={w.state}
                  className={cn(
                    "h-3 flex-1 rounded-full",
                    w.state === "completed"
                      ? "bg-sol-champagne"
                      : w.state === "current"
                        ? "bg-sol-violet"
                        : "bg-sol-ivory-depth",
                  )}
                  initial={{ opacity: 0, scaleY: reduceMotion ? 1 : 0.2 }}
                  animate={
                    w.state === "current" && !reduceMotion
                      ? { opacity: [1, 0.55, 1], scaleY: 1 }
                      : { opacity: 1, scaleY: 1 }
                  }
                  transition={
                    w.state === "current" && !reduceMotion
                      ? { opacity: { duration: 1.8, repeat: Infinity }, scaleY: { duration: 0.3 } }
                      : { duration: 0.35, delay: 0.04 * (pi * 3 + wi) }
                  }
                />
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------- MomentumBars */

export interface MomentumDay {
  key: string;
  missions: number;
  evidence: number;
  today: boolean;
}

/** The last fortnight, one bar per day: missions finished and evidence captured. */
export function MomentumBars({
  days,
  ariaLabel,
  missionsLabel,
  evidenceLabel,
}: {
  days: MomentumDay[];
  ariaLabel: string;
  missionsLabel: string;
  evidenceLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const max = Math.max(1, ...days.map((d) => d.missions + d.evidence));
  return (
    <div className="flex flex-col gap-3" data-testid="momentum">
      <div className="flex h-24 items-end gap-1.5" role="img" aria-label={ariaLabel}>
        {days.map((d, i) => {
          const total = d.missions + d.evidence;
          return (
            <div
              key={d.key}
              className="flex h-full flex-1 flex-col justify-end gap-px"
              title={d.key}
            >
              {total === 0 ? (
                <span
                  className={cn(
                    "h-1.5 rounded-full",
                    d.today ? "bg-sol-violet/40" : "bg-sol-ivory-depth",
                  )}
                />
              ) : (
                <>
                  <motion.span
                    className="w-full rounded-t-md bg-sol-champagne"
                    style={{ height: `${(d.evidence / max) * 100}%` }}
                    initial={{ scaleY: reduceMotion ? 1 : 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.03 }}
                  />
                  <motion.span
                    className="w-full rounded-b-md bg-sol-violet"
                    style={{ height: `${(d.missions / max) * 100}%` }}
                    initial={{ scaleY: reduceMotion ? 1 : 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.03 }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 text-[0.875rem] font-semibold text-sol-secondary">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-sol-violet" aria-hidden="true" />
          {missionsLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-sol-champagne" aria-hidden="true" />
          {evidenceLabel}
        </span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- GhostChart */

/** The shape of a chart that has no data yet — dashed axes and a faint rising
 * line, so an empty card still looks like what it will become. */
export function GhostChart() {
  return (
    <svg
      viewBox="0 0 240 96"
      className="h-24 w-full text-sol-border-strong"
      aria-hidden="true"
      data-testid="ghost-chart"
    >
      <path d="M8 8 V88 H232" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 84 C60 80 90 70 124 50 S190 22 232 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="5 7"
        strokeLinecap="round"
      />
      <circle cx="124" cy="50" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/* ----------------------------------------------------------------- GhostNodes */

/** An evidence map with nothing in it yet: five dashed nodes on a dashed line. */
export function GhostNodes() {
  const xs = [30, 105, 180, 255, 330];
  const ys = [58, 34, 54, 30, 50];
  return (
    <svg
      viewBox="0 0 360 96"
      className="h-24 w-full max-w-[22rem] text-sol-border-strong"
      aria-hidden="true"
      data-testid="ghost-nodes"
    >
      <path
        d={`M ${xs.map((x, i) => `${x},${ys[i]}`).join(" L ")}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 7"
        strokeLinecap="round"
      />
      {xs.map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy={ys[i]}
          r={i === 0 ? 14 : 11}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="3 5"
        />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------- StepPath */

export interface PathStep {
  id: string;
  label: string;
  state: "done" | "current" | "future";
  /** Small line under the label, e.g. "You are here". */
  note?: string;
  /** The current step is being worked on right now. */
  busy?: boolean;
  /** The current step needs attention (e.g. the last attempt failed). */
  warn?: boolean;
}

/** A short path for the dark command surface: finished stops are champagne with a
 * tick, the current stop is violet and pulses, the rest are outlined. It shows
 * where the founder is — the button beside it is what moves them forward. */
export function StepPath({
  steps,
  ariaLabel,
  testId,
}: {
  steps: PathStep[];
  ariaLabel: string;
  testId?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <nav aria-label={ariaLabel} data-testid={testId}>
      {/* A vertical timeline on a phone, a horizontal path from sm up. */}
      <ol className="flex flex-col sm:flex-row sm:items-start">
        {steps.map((s, i) => {
          const next = steps[i + 1];
          const flow = !next
            ? null
            : s.state === "done"
              ? next.state === "done"
                ? "done"
                : "toCurrent"
              : "idle";
          const done = s.state === "done";
          const current = s.state === "current";
          return (
            <li
              key={s.id}
              className="relative flex min-h-14 min-w-0 items-start gap-4 sm:min-h-0 sm:flex-1 sm:flex-col sm:items-center sm:gap-0"
              data-status={s.state}
              data-testid={`step-${s.id}`}
            >
              {flow && (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-[19.5px] top-10 h-5 w-[3px] rounded-full sm:hidden",
                      flow === "done" && "bg-sol-champagne",
                      flow === "toCurrent" && "bg-gradient-to-b from-sol-champagne to-sol-violet",
                      flow === "idle" && "bg-white/15",
                    )}
                  />
                  <motion.span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-1/2 top-[21px] hidden h-[3px] w-full origin-left rounded-full sm:block",
                      flow === "done" && "bg-sol-champagne",
                      flow === "toCurrent" && "bg-gradient-to-r from-sol-champagne to-sol-violet",
                      flow === "idle" && "bg-white/15",
                    )}
                    initial={{ scaleX: reduceMotion ? 1 : 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.45, delay: 0.1 + i * 0.09, ease: "easeOut" }}
                  />
                </>
              )}
              <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center">
                {current && !reduceMotion && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0.5 rounded-full border-2 border-sol-violet/70"
                    animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <motion.span
                  initial={{ scale: reduceMotion ? 1 : 0.6, opacity: reduceMotion ? 1 : 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.05 + i * 0.09 }}
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-full border-2",
                    done
                      ? "border-sol-champagne bg-sol-champagne text-sol-navy"
                      : current
                        ? "border-sol-violet bg-sol-violet text-white shadow-[0_0_0_4px_rgba(114,87,216,0.28)]"
                        : "border-white/25 bg-transparent text-white/55",
                  )}
                >
                  {done ? (
                    <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                  ) : current && s.busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : current && s.warn ? (
                    <TriangleAlert className="size-4" aria-hidden="true" />
                  ) : (
                    <span className="text-[0.875rem] font-bold">{i + 1}</span>
                  )}
                </motion.span>
              </span>
              <span className="flex min-h-11 min-w-0 flex-col justify-center sm:min-h-0 sm:items-center sm:justify-start sm:text-center">
                <span
                  className={cn(
                    "text-[0.875rem] font-semibold leading-tight sm:mt-1.5",
                    done || current ? "text-white" : "text-white/60",
                  )}
                >
                  {s.label}
                </span>
                {s.note && (
                  <span
                    className={cn(
                      "mt-0.5 text-[0.875rem] leading-tight",
                      current ? "font-semibold text-sol-champagne" : "text-white/45",
                    )}
                  >
                    {s.note}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------- JourneyPreview */

export interface PreviewStep {
  id: string;
  label: string;
  icon: LucideIcon;
}

/** What waits after the consultation, drawn rather than described: the first
 * stop is lit (that is where the founder is), the others are dashed ghosts that
 * fill in as the work happens. */
export function JourneyPreview({ steps, ariaLabel }: { steps: PreviewStep[]; ariaLabel: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <nav aria-label={ariaLabel} data-testid="journey-preview">
      {/* A vertical list on a phone, a horizontal path from sm up. */}
      <ol className="flex flex-col sm:flex-row sm:items-start">
        {steps.map((s, i) => {
          const first = i === 0;
          const last = i === steps.length - 1;
          const Icon = s.icon;
          return (
            <li
              key={s.id}
              className="relative flex min-h-[4.5rem] min-w-0 items-start gap-4 sm:min-h-0 sm:flex-1 sm:flex-col sm:items-center sm:gap-0"
            >
              {!last && (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute left-[26px] top-[54px] h-[1.5rem] w-0 border-l-2 border-dashed border-sol-border-strong sm:hidden"
                  />
                  <motion.span
                    aria-hidden="true"
                    className="absolute left-1/2 top-[27px] hidden h-0 w-full origin-left border-t-2 border-dashed border-sol-border-strong sm:block"
                    initial={{ scaleX: reduceMotion ? 1 : 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.12, ease: "easeOut" }}
                  />
                </>
              )}
              <motion.span
                initial={{ opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.12 }}
                className={cn(
                  "relative z-10 flex size-[54px] shrink-0 items-center justify-center rounded-full border-2",
                  first
                    ? "border-sol-violet bg-sol-violet text-white shadow-[0_8px_22px_rgba(112,88,215,0.3)]"
                    : "border-dashed border-sol-border-strong bg-sol-surface text-sol-secondary",
                )}
              >
                <Icon className="size-6" aria-hidden="true" />
              </motion.span>
              <span
                className={cn(
                  "flex min-h-[54px] items-center text-[0.875rem] font-bold uppercase tracking-[0.06em] sm:mt-2.5 sm:min-h-0 sm:text-center",
                  first ? "text-sol-violet-deep" : "text-sol-secondary",
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
