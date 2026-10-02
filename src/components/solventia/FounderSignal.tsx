import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import mark from "@/assets/solventia-mark.png";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type Level = "low" | "mid" | "high";
type ScenarioId = "a" | "b" | "c";
type SignalId =
  | "education"
  | "skills"
  | "experience"
  | "capital"
  | "time"
  | "location"
  | "access"
  | "risk"
  | "ambition";

const SIGNALS: SignalId[] = [
  "education",
  "skills",
  "experience",
  "capital",
  "time",
  "location",
  "access",
  "risk",
  "ambition",
];

/** Illustrative inputs only. There is no score, percentage or ranking anywhere
 * in this demonstration — it shows the MECHANISM (what a founder brings changes
 * what Solventia recommends), and says so on the page. */
const SCENARIOS: Record<ScenarioId, Record<SignalId, Level>> = {
  a: {
    education: "mid",
    skills: "low",
    experience: "low",
    capital: "low",
    time: "mid",
    location: "mid",
    access: "low",
    risk: "mid",
    ambition: "mid",
  },
  b: {
    education: "high",
    skills: "high",
    experience: "mid",
    capital: "mid",
    time: "mid",
    location: "high",
    access: "mid",
    risk: "high",
    ambition: "high",
  },
  c: {
    education: "mid",
    skills: "mid",
    experience: "high",
    capital: "high",
    time: "low",
    location: "high",
    access: "high",
    risk: "mid",
    ambition: "mid",
  },
};

const SCENARIO_IDS: ScenarioId[] = ["a", "b", "c"];
const LEVEL_PIPS: Record<Level, number> = { low: 1, mid: 2, high: 3 };

/** Stage geometry (desktop). One viewBox is stretched over a container with the
 * same aspect ratio, so HTML chips positioned by percentage line up exactly with
 * the SVG paths. */
const W = 1100;
const H = 520;
const NODE = { x: 550, y: 260, r: 68 };
const CHIP_RIGHT = 275;
const CARD_LEFT = 770;
const chipY = (i: number) => ((i + 0.5) / SIGNALS.length) * H;
const cardY = (i: number) => ((i + 0.5) / 3) * H;

type Pt = { x: number; y: number };
const IN_PATHS = SIGNALS.map((_, i) => {
  const p0: Pt = { x: CHIP_RIGHT, y: chipY(i) };
  const p1: Pt = { x: 390, y: chipY(i) };
  const p2: Pt = { x: 400, y: NODE.y };
  const p3: Pt = { x: NODE.x - NODE.r, y: NODE.y };
  return {
    d: `M ${p0.x},${p0.y} C ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`,
    pts: [p0, p1, p2, p3],
  };
});
const OUT_PATHS = [0, 1, 2].map((i) => {
  const p0: Pt = { x: NODE.x + NODE.r, y: NODE.y };
  const p1: Pt = { x: 690, y: NODE.y };
  const p2: Pt = { x: 700, y: cardY(i) };
  const p3: Pt = { x: CARD_LEFT, y: cardY(i) };
  return {
    d: `M ${p0.x},${p0.y} C ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`,
    pts: [p0, p1, p2, p3],
  };
});

function bezier(pts: Pt[], steps: number): { xs: number[]; ys: number[] } {
  const [p0, p1, p2, p3] = pts;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let k = 0; k <= steps; k++) {
    const u = k / steps;
    const v = 1 - u;
    xs.push(v ** 3 * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u ** 3 * p3.x);
    ys.push(v ** 3 * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u ** 3 * p3.y);
  }
  return { xs, ys };
}

function LevelPips({ level }: { level: Level }) {
  const filled = LEVEL_PIPS[level];
  return (
    <span className="flex gap-1" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "h-2 w-5 rounded-full transition-colors duration-[240ms]",
            n <= filled ? "bg-sol-violet" : "bg-sol-hp-ivory-deep",
          )}
        />
      ))}
    </span>
  );
}

/** 0 = waiting to enter · 1 = signals arrive · 2 = node pulses · 3 = directions
 * emerge · 4 = the strongest direction settles. */
type Phase = 0 | 1 | 2 | 3 | 4;

/** Product demonstration: nine founder signals → Solventia → three directions. */
export function FounderSignal() {
  const { t, locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const [scenario, setScenario] = useState<ScenarioId>("a");
  const [phase, setPhase] = useState<Phase>(0);
  const [run, setRun] = useState(0);
  const levels = SCENARIOS[scenario];
  const dir = (n: 1 | 2 | 3) => t(`founderSignal.dir.${scenario}${n}` as MessageKey);

  useEffect(() => {
    if (!entered) return;
    if (reduceMotion) {
      setPhase(4);
      return;
    }
    setPhase(1);
    const timers = [
      window.setTimeout(() => setPhase(2), 1300),
      window.setTimeout(() => setPhase(3), 1750),
      window.setTimeout(() => setPhase(4), 2550),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [entered, scenario, run, reduceMotion]);

  const signalsIn = phase >= 1;
  const pulsing = phase === 2;
  const directionsOut = phase >= 3;
  const settled = phase >= 4;

  return (
    <section
      id="founder-signal"
      className="scroll-mt-[76px] bg-sol-hp-pearl px-[18px] py-[72px] sm:px-6 lg:px-9 lg:py-[96px]"
    >
      <div className="mx-auto max-w-[1180px] text-center">
        <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
          {t("founderSignal.eyebrow")}
        </p>
        <h2
          className={cn(
            "mx-auto mt-5 max-w-[760px] font-display text-[34px] font-semibold text-sol-ink sm:text-[40px] lg:text-[48px]",
            locale === "hi" ? "leading-[1.35]" : "leading-[1.1]",
          )}
        >
          {t("founderSignal.headline1")}{" "}
          <span className="italic text-sol-champagne-deep">{t("founderSignal.headline2")}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[600px] text-[18px] leading-[28px] text-sol-secondary">
          {t("founderSignal.subhead")}
        </p>
      </div>

      <motion.div
        onViewportEnter={() => setEntered(true)}
        viewport={{ once: true, margin: "-120px" }}
        className="relative mx-auto mt-12 max-w-[1240px] rounded-[32px] border border-sol-border p-5 sm:p-8 lg:p-10"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(114,87,216,.10), rgba(114,87,216,.03) 30%, transparent 52%), linear-gradient(135deg, #FFFDFB 0%, #F8F2E9 100%)",
        }}
        data-testid="founder-signal-demo"
        data-phase={phase}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="inline-flex min-h-8 items-center rounded-full border border-sol-violet/30 bg-sol-violet-soft px-4 text-[14px] font-bold tracking-[0.1em] text-sol-violet-deep"
              data-testid="demo-label"
            >
              {t("founderSignal.demoLabel")}
            </span>
            <span className="text-[15px] text-sol-secondary">{t("founderSignal.demoNote")}</span>
          </div>

          <div
            role="radiogroup"
            aria-label={t("founderSignal.scenario.pick")}
            className="flex flex-wrap gap-2"
          >
            {SCENARIO_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={scenario === id}
                data-testid={`scenario-${id}`}
                onClick={() => {
                  // Reset to the first phase in the same batch as the change so the
                  // replay starts from a clean slate instead of flashing the old end state.
                  if (entered && !reduceMotion) setPhase(1);
                  if (id === scenario) setRun((n) => n + 1);
                  else setScenario(id);
                }}
                className={cn(
                  "min-h-11 rounded-full border px-5 text-[15px] font-semibold transition-colors duration-[180ms]",
                  scenario === id
                    ? "border-sol-violet bg-sol-violet-soft text-sol-violet-deep"
                    : "border-sol-border-strong bg-sol-hp-surface text-sol-ink hover:border-sol-violet/50",
                )}
              >
                {t(`founderSignal.scenario.${id}` as MessageKey)}
              </button>
            ))}
          </div>
        </div>

        <div
          className="relative mt-8 grid gap-5 lg:mt-6 lg:block lg:aspect-[1100/520]"
          role="group"
          aria-label={t("story.engine.aria")}
        >
          {/* Desktop paths: signals → node → directions. */}
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
            aria-hidden="true"
            key={`paths-${scenario}-${run}`}
          >
            {IN_PATHS.map((p, i) => (
              <motion.path
                key={`in-${i}`}
                d={p.d}
                fill="none"
                stroke="rgba(114,87,216,0.42)"
                strokeWidth={1.6}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={signalsIn ? { pathLength: 1, opacity: 1 } : {}}
                transition={{
                  duration: reduceMotion ? 0 : 0.55,
                  delay: reduceMotion ? 0 : 0.15 + i * 0.07,
                  ease: "easeInOut",
                }}
              />
            ))}
            {!reduceMotion &&
              signalsIn &&
              IN_PATHS.map((p, i) => {
                const { xs, ys } = bezier(p.pts, 14);
                return (
                  <motion.circle
                    key={`dot-${i}`}
                    r={4}
                    fill="var(--sol-violet)"
                    initial={{ cx: xs[0], cy: ys[0], opacity: 0 }}
                    animate={{ cx: xs, cy: ys, opacity: [0, 1, 1, 0] }}
                    transition={{
                      duration: 0.85,
                      delay: 0.45 + i * 0.07,
                      ease: "linear",
                      opacity: {
                        times: [0, 0.15, 0.85, 1],
                        duration: 0.85,
                        delay: 0.45 + i * 0.07,
                      },
                    }}
                  />
                );
              })}
            {OUT_PATHS.map((p, i) => (
              <motion.path
                key={`out-${i}`}
                d={p.d}
                fill="none"
                stroke={i === 0 && settled ? "rgba(195,160,100,0.85)" : "rgba(195,160,100,0.45)"}
                strokeWidth={i === 0 && settled ? 2.4 : 1.6}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={directionsOut ? { pathLength: 1, opacity: 1 } : {}}
                transition={{
                  duration: reduceMotion ? 0 : 0.5,
                  delay: reduceMotion ? 0 : i * 0.1,
                  ease: "easeInOut",
                }}
              />
            ))}
          </svg>

          {/* Signals */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:contents">
            <p className="col-span-full text-left text-[14px] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep lg:hidden">
              {t("story.signals.title")}
            </p>
            {SIGNALS.map((id, i) => (
              <motion.div
                key={`${id}-${scenario}-${run}`}
                initial={{ opacity: 0, x: -14 }}
                animate={signalsIn ? { opacity: 1, x: 0 } : {}}
                transition={{
                  duration: reduceMotion ? 0 : 0.4,
                  delay: reduceMotion ? 0 : i * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex items-center justify-between gap-2 rounded-xl border border-sol-border bg-sol-hp-surface px-3 py-2.5 text-left shadow-[0_6px_18px_rgba(23,26,39,0.04)] lg:absolute lg:left-0 lg:w-[25%] lg:-translate-y-1/2"
                style={{ top: `${((i + 0.5) / SIGNALS.length) * 100}%` }}
                data-testid={`signal-${id}`}
              >
                <span className="text-[15px] font-semibold leading-tight text-sol-ink">
                  {t(`story.sig.${id}` as MessageKey)}
                </span>
                <LevelPips level={levels[id]} />
              </motion.div>
            ))}
          </div>

          {/* Mobile connector into the node. */}
          <motion.span
            aria-hidden="true"
            className="mx-auto block h-10 w-px origin-top bg-gradient-to-b from-sol-violet/10 via-sol-violet/50 to-sol-violet lg:hidden"
            initial={{ scaleY: 0 }}
            animate={signalsIn ? { scaleY: 1 } : {}}
            transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.5 }}
          />

          {/* The node */}
          <div className="flex flex-col items-center gap-3 text-center lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
            <div className="relative flex size-[132px] items-center justify-center">
              {pulsing && !reduceMotion && (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border-2 border-sol-violet/60"
                  initial={{ scale: 1, opacity: 0.7 }}
                  animate={{ scale: 1.7, opacity: 0 }}
                  transition={{ duration: 0.75, ease: "easeOut" }}
                />
              )}
              <motion.div
                animate={pulsing && !reduceMotion ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="relative flex size-full items-center justify-center rounded-full border border-sol-violet/35 bg-sol-hp-surface shadow-[0_18px_50px_rgba(114,87,216,0.16)]"
                data-testid="signal-node"
              >
                <span
                  className="absolute inset-2.5 rounded-full border border-dashed border-sol-champagne/60"
                  aria-hidden="true"
                />
                <img
                  src={mark}
                  alt=""
                  width={298}
                  height={436}
                  className="relative h-[52px] w-auto"
                />
              </motion.div>
            </div>
            <p className="max-w-[9rem] font-display text-[19px] font-semibold leading-tight text-sol-ink">
              {t("founderSignal.node")}
            </p>
          </div>

          {/* Mobile connector out of the node. */}
          <motion.span
            aria-hidden="true"
            className="mx-auto block h-10 w-px origin-top bg-gradient-to-b from-sol-champagne to-sol-champagne/20 lg:hidden"
            initial={{ scaleY: 0 }}
            animate={directionsOut ? { scaleY: 1 } : {}}
            transition={{ duration: reduceMotion ? 0 : 0.4 }}
          />

          {/* Three directions */}
          <div
            className="grid gap-3 lg:contents"
            data-testid="demo-directions"
            data-scenario={scenario}
            aria-live="polite"
          >
            <p className="text-left text-[14px] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep lg:hidden">
              {t("story.directions.title")}
            </p>
            {([1, 2, 3] as const).map((n, i) => {
              const strongest = n === 1 && settled;
              return (
                <motion.div
                  key={`${n}-${scenario}-${run}`}
                  initial={{ opacity: 0, scale: 0.94, y: 10 }}
                  animate={
                    directionsOut ? { opacity: n === 1 || !settled ? 1 : 0.9, scale: 1, y: 0 } : {}
                  }
                  transition={{
                    duration: reduceMotion ? 0 : 0.45,
                    delay: reduceMotion ? 0 : 0.1 + i * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={cn(
                    "relative flex flex-col justify-center gap-2 rounded-2xl border bg-sol-hp-surface p-4 text-left transition-shadow duration-300 lg:absolute lg:left-[70%] lg:w-[30%] lg:-translate-y-1/2",
                    strongest
                      ? "border-sol-champagne shadow-[0_14px_40px_rgba(195,160,100,0.28)]"
                      : "border-sol-border",
                  )}
                  style={{ top: `${((i + 0.5) / 3) * 100}%` }}
                  data-testid={`direction-${n}`}
                  data-strongest={strongest ? "true" : undefined}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sol-champagne-soft font-display text-[16px] font-semibold text-sol-champagne-deep">
                      {n}
                    </span>
                    {strongest && (
                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-full bg-sol-champagne px-3 py-1 text-[0.875rem] font-bold uppercase tracking-[0.08em] text-sol-ink"
                      >
                        {t("story.strongest")}
                      </motion.span>
                    )}
                  </div>
                  <p className="text-[16.5px] font-medium leading-snug text-sol-ink">{dir(n)}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        <p className="mt-6 text-center text-[15px] font-medium text-sol-secondary">
          {t(`founderSignal.class.${scenario}` as MessageKey)}
        </p>
      </motion.div>
    </section>
  );
}
