import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Flame, Rocket, Users, type LucideIcon } from "lucide-react";

import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type FitStatus = "strong" | "moderate" | "conditional";
type OppId = "a" | "b" | "c";
type FitRow = "capability" | "resources" | "access" | "ambition";

/** Illustrative directions. Fit is shown in the product's own categorical
 * language (Strong / Developing / Early) — never a number or a percentage. */
const OPPS: { id: OppId; overall: FitStatus; fit: Record<FitRow, FitStatus> }[] = [
  {
    id: "a",
    overall: "strong",
    fit: { capability: "strong", resources: "moderate", access: "moderate", ambition: "strong" },
  },
  {
    id: "b",
    overall: "moderate",
    fit: { capability: "strong", resources: "strong", access: "conditional", ambition: "moderate" },
  },
  {
    id: "c",
    overall: "moderate",
    fit: { capability: "moderate", resources: "strong", access: "strong", ambition: "conditional" },
  },
];
const FIT_ROWS: FitRow[] = ["capability", "resources", "access", "ambition"];
const PIPS: Record<FitStatus, number> = { strong: 3, moderate: 2, conditional: 1 };
const STATUS_LABEL: Record<FitStatus, MessageKey> = {
  strong: "cc.oppPulse.strong",
  moderate: "cc.oppPulse.moderate",
  conditional: "cc.oppPulse.conditional",
};
const PIP_TONE: Record<FitStatus, string> = {
  strong: "bg-sol-champagne-deep",
  moderate: "bg-sol-violet",
  conditional: "bg-sol-border-strong",
};

const CHAIN: { key: "customer" | "problem" | "wedge"; icon: LucideIcon }[] = [
  { key: "customer", icon: Users },
  { key: "problem", icon: Flame },
  { key: "wedge", icon: Rocket },
];

function FitBars({ fit }: { fit: Record<FitRow, FitStatus> }) {
  const { t } = useLocale();
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {FIT_ROWS.map((row, i) => (
        <li
          key={row}
          className="flex items-center justify-between gap-3 rounded-xl border border-sol-border bg-sol-hp-pearl px-4 py-3"
        >
          <span className="text-[15px] font-semibold text-sol-ink">
            {t(`fit.row.${row}` as MessageKey)}
          </span>
          <span className="flex items-center gap-2.5">
            <span className="flex gap-1" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <motion.span
                  key={n}
                  initial={{ scaleX: 0.3, opacity: 0.4 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.25 + i * 0.06 + n * 0.04 }}
                  className={cn(
                    "h-2 w-5 origin-left rounded-full",
                    n <= PIPS[fit[row]] ? PIP_TONE[fit[row]] : "bg-sol-hp-ivory-deep",
                  )}
                />
              ))}
            </span>
            <span className="min-w-[5.5rem] text-right text-[14px] font-semibold text-sol-secondary">
              {t(STATUS_LABEL[fit[row]])}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function OpportunityDemo() {
  const { t, locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const [focus, setFocus] = useState<OppId>("a");
  const [userPicked, setUserPicked] = useState(false);
  const opp = OPPS.find((o) => o.id === focus)!;

  // Until the visitor takes over, focus drifts through the three directions so
  // the "rises into focus" behaviour is visible without any interaction.
  useEffect(() => {
    if (!entered || userPicked || reduceMotion) return;
    const id = window.setInterval(() => {
      setFocus((cur) => OPPS[(OPPS.findIndex((o) => o.id === cur) + 1) % OPPS.length].id);
    }, 5200);
    return () => window.clearInterval(id);
  }, [entered, userPicked, reduceMotion]);

  const pick = (id: OppId) => {
    setUserPicked(true);
    setFocus(id);
  };

  return (
    <section
      id="opportunity-demo"
      className="scroll-mt-[76px] bg-sol-hp-ivory px-[18px] py-[72px] sm:px-6 lg:px-9 lg:py-[96px]"
    >
      <div className="mx-auto max-w-[1180px]">
        <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
          {t("story.opp.eyebrow")}
        </p>
        <h2
          className={cn(
            "mt-4 max-w-[20ch] font-display text-[34px] font-semibold text-sol-ink sm:text-[40px] lg:text-[48px]",
            locale === "hi" ? "leading-[1.35]" : "leading-[1.1]",
          )}
        >
          {t("story.opp.headline")}
        </h2>

        <motion.div
          onViewportEnter={() => setEntered(true)}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
          data-testid="opportunity-demo"
          data-focus={focus}
        >
          <div role="radiogroup" aria-label={t("story.opp.pick")} className="flex flex-col gap-3">
            {OPPS.map((o, i) => {
              const active = o.id === focus;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-testid={`opp-option-${o.id}`}
                  onClick={() => pick(o.id)}
                  onMouseEnter={() => {
                    if (window.matchMedia("(hover: hover)").matches) pick(o.id);
                  }}
                  className={cn(
                    "relative flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-colors duration-200",
                    active
                      ? "border-sol-violet/50"
                      : "border-sol-border bg-sol-hp-surface hover:border-sol-violet/30",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="opp-focus-bg"
                      className="absolute inset-0 rounded-2xl bg-sol-violet-soft"
                      transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      "relative flex size-9 shrink-0 items-center justify-center rounded-full font-display text-[17px] font-semibold",
                      active
                        ? "bg-sol-violet text-white"
                        : "bg-sol-champagne-soft text-sol-champagne-deep",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold leading-snug text-sol-ink">
                      {t(`story.opp.${o.id}.title` as MessageKey)}
                    </span>
                    <span className="mt-1 block text-[14px] font-semibold text-sol-secondary">
                      {t("story.opp.fit")} · {t(STATUS_LABEL[o.overall])}
                    </span>
                  </span>
                  {active && (
                    <span className="relative hidden rounded-full bg-sol-violet px-3 py-1 text-[0.875rem] font-bold uppercase tracking-[0.08em] text-white sm:inline">
                      {t("story.opp.focus")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div
            className="relative overflow-hidden rounded-[28px] border border-sol-hp-border bg-sol-hp-surface p-6 shadow-[0_18px_50px_rgba(23,26,39,0.06)] sm:p-8"
            data-testid="opp-focus-panel"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={focus}
                initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <h3 className="font-display text-[26px] font-semibold leading-[1.15] text-sol-ink sm:text-[30px]">
                  {t(`story.opp.${opp.id}.title` as MessageKey)}
                </h3>

                <div className="relative mt-7 grid gap-5 sm:grid-cols-3 sm:gap-4">
                  {/* Connector line behind the three nodes (desktop). */}
                  <motion.span
                    aria-hidden="true"
                    className="absolute left-[16%] right-[16%] top-[27px] hidden h-0.5 origin-left rounded-full bg-gradient-to-r from-sol-champagne via-sol-violet to-sol-champagne sm:block"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 0.6, delay: 0.1 }}
                  />
                  {CHAIN.map((node, i) => (
                    <motion.div
                      key={node.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.35, delay: 0.08 + i * 0.1 }}
                      className="relative flex gap-4 sm:flex-col sm:items-center sm:gap-3 sm:text-center"
                    >
                      <span className="relative z-10 flex size-[54px] shrink-0 items-center justify-center rounded-full border border-sol-champagne/60 bg-sol-hp-surface shadow-[0_8px_20px_rgba(23,26,39,0.08)]">
                        <node.icon className="size-6 text-sol-violet-deep" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                          {t(`story.opp.${node.key}` as MessageKey)}
                        </p>
                        <p className="mt-1 text-[16px] font-medium leading-snug text-sol-ink">
                          {t(`story.opp.${opp.id}.${node.key}` as MessageKey)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <p className="mt-8 text-[14px] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                  {t("story.opp.fit")}
                </p>
                <div className="mt-3">
                  <FitBars fit={opp.fit} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
