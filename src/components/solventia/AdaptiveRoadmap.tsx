import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Lock } from "lucide-react";

import mark from "@/assets/solventia-mark.png";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const MISSIONS: MessageKey[] = [
  "adaptiveRoadmap.m1",
  "adaptiveRoadmap.m2",
  "adaptiveRoadmap.m3",
  "adaptiveRoadmap.m4",
];
const MISSIONS_DONE = 3;
const EVIDENCE_TOTAL = 8;
const EVIDENCE_REPEATED = 5;
const FUTURE_WEEKS = [3, 4];

/** The demonstration plays once, as one causal sequence — missions tick, the
 * evidence dots fill, Solventia adapts, and only then does Week 02 unlock — and
 * shows the finished state immediately for anyone who prefers reduced motion.
 * It is labelled as a demonstration and shows counts, never a score. */
export function AdaptiveRoadmap() {
  const { t, locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const [missions, setMissions] = useState(0);
  const [evidence, setEvidence] = useState(0);
  const [pulsing, setPulsing] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!entered) return;
    if (reduceMotion) {
      setMissions(MISSIONS_DONE);
      setEvidence(EVIDENCE_REPEATED);
      setUnlocked(true);
      return;
    }
    const timers: number[] = [];
    for (let i = 1; i <= MISSIONS_DONE; i++) {
      timers.push(window.setTimeout(() => setMissions(i), 500 + i * 380));
    }
    for (let i = 1; i <= EVIDENCE_REPEATED; i++) {
      timers.push(window.setTimeout(() => setEvidence(i), 1900 + i * 170));
    }
    timers.push(window.setTimeout(() => setPulsing(true), 2950));
    timers.push(
      window.setTimeout(() => {
        setPulsing(false);
        setUnlocked(true);
      }, 3650),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [entered, reduceMotion]);

  return (
    <section
      id="adaptive-roadmap"
      className="scroll-mt-[76px] bg-sol-hp-pearl px-[18px] py-[88px] sm:px-6 lg:px-9 lg:py-[112px]"
    >
      <div className="mx-auto max-w-[1180px]">
        <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
          {t("adaptiveRoadmap.eyebrow")}
        </p>
        <h2
          className={cn(
            "mt-4 max-w-[20ch] font-display text-[30px] font-semibold text-sol-ink sm:text-[36px] lg:text-[44px]",
            locale === "hi" ? "leading-[1.35]" : "leading-[1.12]",
          )}
        >
          {t("adaptiveRoadmap.headline")}
        </h2>
        <p className="mt-4 max-w-[600px] text-[17px] leading-[28px] text-sol-secondary">
          {t("adaptiveRoadmap.subhead")}
        </p>

        <motion.div
          onViewportEnter={() => setEntered(true)}
          viewport={{ once: true, margin: "-100px" }}
          className="relative mt-14 rounded-[32px] border border-sol-hp-border bg-sol-hp-surface p-5 sm:p-8"
          data-testid="adaptive-demo"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex min-h-8 items-center rounded-full border border-sol-violet/30 bg-sol-violet-soft px-4 text-[14px] font-bold tracking-[0.1em] text-sol-violet-deep">
              {t("adaptiveRoadmap.demoLabel")}
            </span>
            <span className="text-[15px] text-sol-secondary">{t("adaptiveRoadmap.demoNote")}</span>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_150px_0.9fr] lg:items-stretch lg:gap-4">
            {/* Week 01 */}
            <div className="rounded-3xl border border-sol-violet/25 bg-sol-violet-soft/60 p-6 sm:p-8">
              <p className="text-[14px] font-bold uppercase tracking-[0.1em] text-sol-violet-deep">
                {t("adaptiveRoadmap.week")}
              </p>
              <p className="mt-2 font-display text-[26px] font-semibold leading-tight text-sol-ink">
                {t("adaptiveRoadmap.weekTitle")}
              </p>

              <ul className="mt-5 flex flex-col gap-3" data-testid="demo-missions">
                {MISSIONS.map((key, i) => {
                  const done = i < missions;
                  return (
                    <li key={key} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-[240ms]",
                          done
                            ? "border-sol-champagne bg-sol-champagne text-sol-ink"
                            : "border-sol-violet/40 bg-transparent",
                        )}
                        aria-hidden="true"
                      >
                        {done && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span
                        className={cn(
                          "text-[17px] leading-snug",
                          done ? "text-sol-ink" : "text-sol-secondary",
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
                {t("adaptiveRoadmap.missions")}
              </p>

              <div className="mt-6 border-t border-sol-violet/20 pt-5">
                <p className="text-[14px] font-bold uppercase tracking-[0.1em] text-sol-secondary">
                  {t("adaptiveRoadmap.evidenceLabel")}
                </p>
                <div
                  className="mt-3 flex gap-1.5"
                  role="img"
                  aria-label={t("adaptiveRoadmap.evidence")}
                >
                  {Array.from({ length: EVIDENCE_TOTAL }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-3 flex-1 rounded-full transition-colors duration-[240ms]",
                        i < evidence ? "bg-sol-violet" : "bg-sol-hp-ivory-deep",
                      )}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[16px] font-medium text-sol-ink">
                  {t("adaptiveRoadmap.evidence")}
                </p>
              </div>
            </div>

            {/* Solventia adapts */}
            <div className="flex flex-row items-center justify-center gap-4 lg:flex-col lg:gap-3">
              <div className="relative flex size-[104px] items-center justify-center">
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(114,87,216,.16), transparent 68%)",
                  }}
                  animate={
                    pulsing && !reduceMotion
                      ? { scale: [1, 1.25], opacity: [0.6, 0] }
                      : { scale: 1, opacity: 0.8 }
                  }
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
                <span className="relative flex size-[84px] items-center justify-center rounded-full bg-sol-violet">
                  <img src={mark} alt="" width={298} height={436} className="h-8 w-auto" />
                </span>
              </div>
              <p className="max-w-[8rem] text-center font-display text-[17px] font-semibold leading-tight text-sol-violet-deep">
                {t("adaptiveRoadmap.adapts")}
              </p>
            </div>

            {/* Week 02 */}
            <div className="flex flex-col gap-3">
              <motion.div
                animate={
                  unlocked
                    ? { opacity: 1, borderColor: "rgba(195,160,100,0.7)" }
                    : { opacity: 0.6, borderColor: "#E4DDD3" }
                }
                transition={{ duration: reduceMotion ? 0 : 0.46, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-3xl border bg-sol-hp-surface p-6 sm:p-8"
                data-testid="demo-week2"
                data-unlocked={unlocked}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                      {t("adaptiveRoadmap.next")}
                    </p>
                    <p className="mt-2 font-display text-[24px] font-semibold leading-tight text-sol-ink">
                      {t("adaptiveRoadmap.nextTitle")}
                    </p>
                  </div>
                  {unlocked ? (
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sol-violet text-white">
                      <Check className="size-4" aria-hidden="true" />
                    </span>
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
        </motion.div>
      </div>
    </section>
  );
}
