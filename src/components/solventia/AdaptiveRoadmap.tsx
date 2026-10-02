import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Lock, Quote } from "lucide-react";

import mark from "@/assets/solventia-mark.png";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const MISSIONS: MessageKey[] = ["adaptiveRoadmap.m1", "adaptiveRoadmap.m2", "adaptiveRoadmap.m3"];
const FUTURE_WEEKS = [3, 4];
const LOOP_MS = 9400;

type Pt = { x: number; y: number };

/** The demonstration is one causal chain that loops quietly: the last mission is
 * completed, the evidence it produced appears, that evidence travels through
 * Solventia Intelligence, and only then does Week 02 unlock. It shows counts and
 * a quote — never a score — and is labelled as a demonstration. Reduced-motion
 * visitors get the finished state with no loop. */
export function AdaptiveRoadmap() {
  const { t, locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [lastDone, setLastDone] = useState(false);
  const [evidence, setEvidence] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [fading, setFading] = useState(false);
  const [trail, setTrail] = useState<{ a: Pt; b: Pt; c: Pt } | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const evidenceRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const week2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entered) return;
    if (reduceMotion) {
      setLastDone(true);
      setEvidence(true);
      setUnlocked(true);
      return;
    }
    const center = (el: HTMLElement | null, stage: DOMRect): Pt | null => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - stage.left + r.width / 2, y: r.top - stage.top + r.height / 2 };
    };
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    at(800, () => setLastDone(true));
    at(1500, () => setEvidence(true));
    at(2500, () => {
      const stage = stageRef.current?.getBoundingClientRect();
      if (!stage) return;
      const a = center(evidenceRef.current, stage);
      const b = center(nodeRef.current, stage);
      const c = center(week2Ref.current, stage);
      if (a && b && c) setTrail({ a, b, c });
    });
    at(3500, () => setPulsing(true));
    at(4300, () => {
      setPulsing(false);
      setUnlocked(true);
    });
    at(LOOP_MS - 500, () => setFading(true));
    at(LOOP_MS, () => {
      setFading(false);
      setLastDone(false);
      setEvidence(false);
      setUnlocked(false);
      setPulsing(false);
      setTrail(null);
      setCycle((n) => n + 1);
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [entered, reduceMotion, cycle]);

  const done = 2 + (lastDone ? 1 : 0);

  return (
    <section
      id="adaptive-roadmap"
      className="scroll-mt-[76px] bg-sol-hp-ivory px-[18px] py-[72px] sm:px-6 lg:px-9 lg:py-[96px]"
    >
      <div className="mx-auto max-w-[1180px]">
        <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
          {t("adaptiveRoadmap.eyebrow")}
        </p>
        <h2
          className={cn(
            "mt-4 max-w-[20ch] font-display text-[34px] font-semibold text-sol-ink sm:text-[40px] lg:text-[48px]",
            locale === "hi" ? "leading-[1.35]" : "leading-[1.1]",
          )}
        >
          {t("adaptiveRoadmap.headline")}
        </h2>
        <p className="mt-4 max-w-[600px] text-[18px] leading-[28px] text-sol-secondary">
          {t("adaptiveRoadmap.subhead")}
        </p>

        <motion.div
          onViewportEnter={() => setEntered(true)}
          viewport={{ once: true, margin: "-100px" }}
          ref={stageRef}
          animate={{ opacity: fading ? 0.35 : 1 }}
          transition={{ duration: 0.45 }}
          className="relative mt-12 rounded-[32px] border border-sol-hp-border bg-sol-hp-surface p-5 sm:p-8"
          data-testid="adaptive-demo"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex min-h-8 items-center rounded-full border border-sol-violet/30 bg-sol-violet-soft px-4 text-[14px] font-bold tracking-[0.1em] text-sol-violet-deep">
              {t("adaptiveRoadmap.demoLabel")}
            </span>
            <span className="text-[15px] text-sol-secondary">{t("adaptiveRoadmap.demoNote")}</span>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_170px_0.9fr] lg:items-stretch lg:gap-4">
            {/* Week 01 */}
            <div className="rounded-3xl border border-sol-violet/25 bg-sol-violet-soft/60 p-6 sm:p-7">
              <p className="text-[14px] font-bold uppercase tracking-[0.1em] text-sol-violet-deep">
                {t("adaptiveRoadmap.week")}
              </p>
              <p className="mt-2 font-display text-[28px] font-semibold leading-tight text-sol-ink">
                {t("adaptiveRoadmap.weekTitle")}
              </p>

              <ul className="mt-5 flex flex-col gap-3" data-testid="demo-missions">
                {MISSIONS.map((key, i) => {
                  const isDone = i < done;
                  return (
                    <li key={key} className="flex items-center gap-3">
                      <motion.span
                        animate={isDone && i === 2 ? { scale: [0.85, 1.12, 1] } : { scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-[240ms]",
                          isDone
                            ? "border-sol-champagne bg-sol-champagne text-sol-ink"
                            : "border-sol-violet/40 bg-transparent",
                        )}
                        aria-hidden="true"
                      >
                        {isDone && <Check className="size-3.5" strokeWidth={3} />}
                      </motion.span>
                      <span
                        className={cn(
                          "text-[17px] leading-snug transition-colors",
                          isDone ? "text-sol-ink" : "text-sol-secondary",
                        )}
                      >
                        {t(key)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p
                className="mt-3 text-[15px] font-semibold text-sol-secondary"
                data-testid="demo-missions-count"
              >
                {t("story.road.missionsCount", { done, total: MISSIONS.length })}
              </p>

              <div
                className="mt-5 min-h-[132px] border-t border-sol-violet/20 pt-5"
                ref={evidenceRef}
              >
                <AnimatePresence initial={false}>
                  {evidence ? (
                    <motion.div
                      key="evidence"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="rounded-2xl border border-sol-champagne/60 bg-sol-hp-surface p-4"
                      data-testid="demo-evidence"
                    >
                      <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                        <Quote className="size-3.5" aria-hidden="true" />
                        {t("story.road.captured")} · {t("story.road.evidenceKind")}
                      </p>
                      <p className="mt-2 text-[16.5px] font-medium leading-snug text-sol-ink">
                        {t("story.road.evidenceQuote")}
                      </p>
                      <p className="mt-2 text-[14.5px] font-semibold text-sol-secondary">
                        {t("adaptiveRoadmap.evidence")}
                      </p>
                    </motion.div>
                  ) : (
                    <p key="waiting" className="text-[15px] text-sol-muted">
                      {t("adaptiveRoadmap.evidenceLabel")}
                    </p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Solventia adapts */}
            <div className="flex flex-row items-center justify-center gap-4 lg:flex-col lg:gap-3">
              <div ref={nodeRef} className="relative flex size-[104px] items-center justify-center">
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(114,87,216,.2), transparent 68%)",
                  }}
                  animate={
                    pulsing && !reduceMotion
                      ? { scale: [1, 1.35], opacity: [0.7, 0] }
                      : { scale: 1, opacity: 0.8 }
                  }
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                <motion.span
                  animate={pulsing && !reduceMotion ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={{ duration: 0.6 }}
                  className="relative flex size-[84px] items-center justify-center rounded-full bg-sol-violet"
                >
                  <img src={mark} alt="" width={298} height={436} className="h-8 w-auto" />
                </motion.span>
              </div>
              <p className="max-w-[9rem] text-center font-display text-[17px] font-semibold leading-tight text-sol-violet-deep">
                {pulsing ? t("story.road.reads") : t("adaptiveRoadmap.adapts")}
              </p>
            </div>

            {/* Week 02 */}
            <div className="flex flex-col gap-3">
              <motion.div
                ref={week2Ref}
                animate={
                  unlocked
                    ? { borderColor: "rgba(195,160,100,0.85)", scale: 1.01 }
                    : { borderColor: "#E4DDD3", scale: 1 }
                }
                transition={{ duration: reduceMotion ? 0 : 0.46, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "rounded-3xl border bg-sol-hp-surface p-6 transition-shadow duration-500 sm:p-7",
                  unlocked && "shadow-[0_16px_44px_rgba(195,160,100,0.22)]",
                )}
                data-testid="demo-week2"
                data-unlocked={unlocked}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                      {t("adaptiveRoadmap.next")}
                    </p>
                    <p className="mt-2 font-display text-[26px] font-semibold leading-tight text-sol-ink">
                      {t("adaptiveRoadmap.nextTitle")}
                    </p>
                  </div>
                  {unlocked ? (
                    <motion.span
                      initial={{ scale: 0.5, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sol-violet text-white"
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </motion.span>
                  ) : (
                    <Lock className="size-5 shrink-0 text-sol-muted" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-3 text-[16px] leading-[26px] text-sol-secondary">
                  {unlocked ? t("adaptiveRoadmap.reason") : t("adaptiveRoadmap.lockedNow")}
                </p>
              </motion.div>

              <ul className="flex flex-col gap-2">
                {FUTURE_WEEKS.map((n) => (
                  <li
                    key={n}
                    className="flex items-center justify-between rounded-2xl border border-dashed border-sol-border-strong bg-sol-hp-pearl px-5 py-3.5"
                  >
                    <span className="text-[16px] font-medium text-sol-muted">
                      {t("common.weekN", { n: String(n).padStart(2, "0") })}
                    </span>
                    <span className="flex items-center gap-2 text-[14px] text-sol-muted">
                      <Lock className="size-4" aria-hidden="true" />
                      {t("common.locked")}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[15px] text-sol-secondary">{t("adaptiveRoadmap.locked")}</p>
            </div>
          </div>

          {/* The evidence particle: evidence → Solventia → Week 02. */}
          {trail && !reduceMotion && (
            <motion.span
              key={`particle-${cycle}`}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 z-20 size-3.5 rounded-full bg-sol-champagne shadow-[0_0_0_6px_rgba(195,160,100,0.25)]"
              initial={{ x: trail.a.x - 7, y: trail.a.y - 7, opacity: 0, scale: 0.6 }}
              animate={{
                x: [trail.a.x - 7, trail.b.x - 7, trail.c.x - 7],
                y: [trail.a.y - 7, trail.b.y - 7, trail.c.y - 7],
                opacity: [0, 1, 1, 0],
                scale: [0.6, 1, 1, 0.8],
              }}
              transition={{
                duration: 1.8,
                ease: "easeInOut",
                x: { times: [0, 0.5, 1] },
                y: { times: [0, 0.5, 1] },
                opacity: { times: [0, 0.2, 0.8, 1] },
                scale: { times: [0, 0.2, 0.8, 1] },
              }}
            />
          )}
        </motion.div>
      </div>
    </section>
  );
}
