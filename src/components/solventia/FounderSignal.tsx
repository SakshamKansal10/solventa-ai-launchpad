import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import mark from "@/assets/solventia-mark.png";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type Level = "low" | "mid" | "high";
type ScenarioId = "a" | "b" | "c";
type InputId = "technical" | "operating" | "capital" | "time" | "scale";

/** Illustrative inputs only. There is no score, percentage or ranking anywhere
 * in this demonstration — it shows the MECHANISM (what a founder brings changes
 * what Solventia recommends), and says so on the page. */
const SCENARIOS: Record<ScenarioId, Record<InputId, Level>> = {
  a: { technical: "low", operating: "low", capital: "low", time: "mid", scale: "mid" },
  b: { technical: "high", operating: "mid", capital: "mid", time: "mid", scale: "high" },
  c: { technical: "mid", operating: "high", capital: "high", time: "low", scale: "mid" },
};

const GROUPS: { id: "capability" | "resources" | "ambition"; inputs: InputId[] }[] = [
  { id: "capability", inputs: ["technical", "operating"] },
  { id: "resources", inputs: ["capital", "time"] },
  { id: "ambition", inputs: ["scale"] },
];

const LEVEL_PIPS: Record<Level, number> = { low: 1, mid: 2, high: 3 };
const SCENARIO_IDS: ScenarioId[] = ["a", "b", "c"];

function LevelPips({ level }: { level: Level }) {
  const filled = LEVEL_PIPS[level];
  return (
    <span className="flex gap-1" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "h-2 w-6 rounded-full transition-colors duration-[240ms]",
            n <= filled ? "bg-sol-violet" : "bg-sol-hp-ivory-deep",
          )}
        />
      ))}
    </span>
  );
}

/** Left-to-right connector lines drawn behind the three columns: each input
 * group flows into the Solventia node, and the node flows out to each of the
 * three directions. Desktop only — on small screens the columns simply stack. */
function Connectors({ active, reduceMotion }: { active: boolean; reduceMotion: boolean | null }) {
  const rows = [100 / 6, 50, 500 / 6];
  const draw = (d: string, delay: number, key: string) => (
    <motion.path
      key={key}
      d={d}
      fill="none"
      stroke="rgba(114,87,216,0.38)"
      strokeWidth={0.35}
      strokeDasharray="1.4 1.1"
      vectorEffect="non-scaling-stroke"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={active ? { pathLength: 1, opacity: 1 } : {}}
      transition={{
        duration: reduceMotion ? 0 : 0.5,
        delay: reduceMotion ? 0 : delay,
        ease: "easeInOut",
      }}
    />
  );
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
      aria-hidden="true"
    >
      {rows.map((y, i) => draw(`M 36,${y} C 41,${y} 41,50 45,50`, i * 0.12, `in-${i}`))}
      {rows.map((y, i) => draw(`M 55,50 C 59,50 59,${y} 64,${y}`, 0.5 + i * 0.12, `out-${i}`))}
    </svg>
  );
}

/** Product demonstration: three input groups → Solventia → three directions. */
export function FounderSignal() {
  const { t, locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const [scenario, setScenario] = useState<ScenarioId>("a");
  const levels = SCENARIOS[scenario];
  const dir = (n: 1 | 2 | 3) => t(`founderSignal.dir.${scenario}${n}` as MessageKey);

  return (
    <section
      id="founder-signal"
      className="scroll-mt-[76px] bg-sol-hp-pearl px-[18px] py-[88px] sm:px-6 lg:px-9 lg:py-[112px]"
    >
      <div className="mx-auto max-w-[1180px] text-center">
        <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
          {t("founderSignal.eyebrow")}
        </p>
        <h2
          className={cn(
            "mx-auto mt-5 max-w-[760px] font-display text-[30px] font-semibold text-sol-ink sm:text-[36px] lg:text-[44px]",
            locale === "hi" ? "leading-[1.35]" : "leading-[1.12]",
          )}
        >
          {t("founderSignal.headline1")}{" "}
          <span className="italic text-sol-champagne-deep">{t("founderSignal.headline2")}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[600px] text-[17px] leading-[28px] text-sol-secondary">
          {t("founderSignal.subhead")}
        </p>
      </div>

      <motion.div
        onViewportEnter={() => setEntered(true)}
        viewport={{ once: true, margin: "-120px" }}
        className="relative mx-auto mt-14 max-w-[1240px] rounded-[32px] border border-sol-border p-5 sm:p-8 lg:p-10"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(114,87,216,.09), rgba(114,87,216,.03) 30%, transparent 52%), linear-gradient(135deg, #FFFDFB 0%, #F8F2E9 100%)",
        }}
        data-testid="founder-signal-demo"
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
                onClick={() => setScenario(id)}
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

        <div className="relative mt-8 grid gap-6 lg:grid-cols-[minmax(0,36fr)_minmax(0,28fr)_minmax(0,36fr)] lg:gap-0">
          <Connectors active={entered} reduceMotion={reduceMotion} />

          {/* Three input groups */}
          <div className="relative grid gap-4 lg:grid-rows-3 lg:pr-6">
            {GROUPS.map((group, gi) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, x: -10 }}
                animate={entered ? { opacity: 1, x: 0 } : {}}
                transition={{
                  duration: reduceMotion ? 0 : 0.45,
                  delay: reduceMotion ? 0 : gi * 0.12,
                }}
                className="rounded-2xl border border-sol-border bg-sol-hp-surface p-5"
                data-testid={`group-${group.id}`}
              >
                <p className="text-[14px] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                  {t(`founderSignal.group.${group.id}` as MessageKey)}
                </p>
                <dl className="mt-3 flex flex-col gap-3">
                  {group.inputs.map((input) => (
                    <div key={input} className="flex items-center justify-between gap-3">
                      <dt className="text-[16px] font-medium text-sol-ink">
                        {t(`founderSignal.input.${input}` as MessageKey)}
                      </dt>
                      <dd className="flex shrink-0 items-center gap-2.5">
                        <LevelPips level={levels[input]} />
                        <span className="min-w-[4.5rem] text-right text-[15px] font-semibold text-sol-secondary">
                          {t(`founderSignal.level.${levels[input]}` as MessageKey)}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </motion.div>
            ))}
          </div>

          {/* The node */}
          <div className="relative flex items-center justify-center py-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={entered ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.45 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="relative flex size-[132px] items-center justify-center rounded-full border border-sol-violet/35 bg-sol-hp-surface shadow-[0_18px_50px_rgba(114,87,216,0.14)]">
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
              </div>
              <p className="max-w-[9rem] font-display text-[19px] font-semibold leading-tight text-sol-ink">
                {t("founderSignal.node")}
              </p>
            </motion.div>
          </div>

          {/* Three directions */}
          <div className="relative flex flex-col gap-4 lg:pl-6">
            <p className="text-[14px] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep lg:hidden">
              {t("founderSignal.output.title")}
            </p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={scenario}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="grid gap-4 lg:h-full lg:grid-rows-3"
                data-testid="demo-directions"
                data-scenario={scenario}
                aria-live="polite"
              >
                {([1, 2, 3] as const).map((n) => (
                  <div
                    key={n}
                    className="flex items-center gap-4 rounded-2xl border border-sol-border bg-sol-hp-surface p-5"
                    data-testid={`direction-${n}`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sol-champagne-soft font-display text-[17px] font-semibold text-sol-champagne-deep">
                      {n}
                    </span>
                    <p className="text-[17px] font-medium leading-snug text-sol-ink">{dir(n)}</p>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <p className="mt-6 text-center text-[15px] font-medium text-sol-secondary">
          {t(`founderSignal.class.${scenario}` as MessageKey)}
        </p>
      </motion.div>
    </section>
  );
}
