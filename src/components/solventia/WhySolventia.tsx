import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, X } from "lucide-react";

import mark from "@/assets/solventia-mark.png";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type ChipId = "opp" | "week" | "interviews" | "payment";
const CHIPS: { id: ChipId; key: MessageKey }[] = [
  { id: "opp", key: "story.ask.chip.opp" },
  { id: "week", key: "story.ask.chip.week" },
  { id: "interviews", key: "story.ask.chip.interviews" },
  { id: "payment", key: "story.ask.chip.payment" },
];

function ThinkingDots() {
  return (
    <span className="flex items-center gap-1.5 py-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-2 rounded-full bg-sol-violet/60"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

/** Rendered inside the proof section. Why Ask Sol is not a generic chatbot: the same question, asked twice. The
 * Ask Sol side already knows the opportunity, the week and the evidence — turn
 * those context chips off and the answer drops back to generic advice. */
export function WhySolventia() {
  const { t, locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const [on, setOn] = useState<Record<ChipId, boolean>>({
    opp: true,
    week: true,
    interviews: true,
    payment: true,
  });
  const [thinking, setThinking] = useState(true);
  const full = CHIPS.every((c) => on[c.id]);

  useEffect(() => {
    if (!entered) return;
    if (reduceMotion) {
      setThinking(false);
      return;
    }
    const id = window.setTimeout(() => setThinking(false), 1100);
    return () => window.clearTimeout(id);
  }, [entered, reduceMotion]);

  const toggle = (id: ChipId) => {
    setOn((cur) => ({ ...cur, [id]: !cur[id] }));
    if (!reduceMotion) {
      setThinking(true);
      window.setTimeout(() => setThinking(false), 550);
    }
  };

  return (
    <div
      id="ask-sol-demo"
      className="mt-10 scroll-mt-[76px] rounded-[32px] bg-sol-hp-why p-5 sm:p-8"
    >
      <div>
        <p className="text-center text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
          {t("whySolventia.eyebrow")}
        </p>
        <h3
          className={cn(
            "mt-3 text-center font-display text-[26px] font-semibold text-sol-ink sm:text-[30px] lg:text-[34px]",
            locale === "hi" ? "leading-[1.35]" : "leading-[1.15]",
          )}
        >
          {t("whySolventia.headline")}
        </h3>

        <motion.div
          onViewportEnter={() => setEntered(true)}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-8 grid gap-5 lg:grid-cols-2"
          data-testid="asksol-demo"
        >
          {/* Generic chatbot */}
          <div className="flex flex-col rounded-[28px] border border-sol-border bg-sol-hp-ivory-light p-6 sm:p-7">
            <p className="text-[14px] font-semibold uppercase tracking-[0.12em] text-sol-muted">
              {t("whySolventia.generic")}
            </p>
            <div className="mt-4 rounded-2xl border border-sol-border bg-sol-hp-surface px-4 py-3 text-[17px] text-sol-ink">
              {t("story.ask.prompt")}
            </div>
            <div className="mt-4 flex-1 rounded-2xl bg-sol-hp-ivory-deep/70 p-4 text-[16.5px] leading-[26px] text-sol-secondary">
              {t("story.ask.answer.generic")}
            </div>
            <p className="mt-4 flex items-center gap-2 text-[14.5px] font-semibold text-sol-muted">
              <X className="size-4" aria-hidden="true" />
              {t("story.ask.contextOff")}
            </p>
          </div>

          {/* Ask Sol */}
          <div className="flex flex-col rounded-[28px] border border-sol-violet/30 bg-sol-hp-surface p-6 shadow-[0_18px_50px_rgba(114,87,216,0.12)] sm:p-7">
            <p className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-[0.12em] text-sol-violet-deep">
              <img src={mark} alt="" width={298} height={436} className="h-5 w-auto" />
              {t("story.ask.eyebrow")}
            </p>

            <p className="mt-4 text-[0.875rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
              {t("story.ask.contextLabel")}
            </p>
            <div
              className="mt-2 flex flex-wrap gap-2"
              role="group"
              aria-label={t("story.ask.contextLabel")}
            >
              {CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={on[chip.id]}
                  data-testid={`asksol-chip-${chip.id}`}
                  onClick={() => toggle(chip.id)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[14.5px] font-semibold transition-colors duration-[180ms]",
                    on[chip.id]
                      ? "border-sol-violet/50 bg-sol-violet-soft text-sol-violet-deep"
                      : "border-sol-border-strong bg-transparent text-sol-muted line-through",
                  )}
                >
                  {on[chip.id] && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                  {t(chip.key)}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-sol-border bg-sol-hp-pearl px-4 py-3 text-[17px] text-sol-ink">
              {t("story.ask.prompt")}
            </div>

            <div
              className={cn(
                "mt-4 min-h-[132px] flex-1 rounded-2xl p-4 text-[16.5px] leading-[26px]",
                full
                  ? "border-l-4 border-sol-champagne bg-sol-violet-soft/60 text-sol-ink"
                  : "bg-sol-hp-ivory-deep/70 text-sol-secondary",
              )}
              aria-live="polite"
              data-testid="asksol-answer"
              data-context={full ? "full" : "partial"}
            >
              <AnimatePresence mode="wait" initial={false}>
                {thinking ? (
                  <motion.div key="thinking" exit={{ opacity: 0 }}>
                    <ThinkingDots />
                  </motion.div>
                ) : (
                  <motion.p
                    key={full ? "sol" : "generic"}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3 }}
                  >
                    {full ? t("story.ask.answer.sol") : t("story.ask.answer.generic")}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <p
              className={cn(
                "mt-4 flex items-center gap-2 text-[14.5px] font-semibold",
                full ? "text-sol-violet-deep" : "text-sol-muted",
              )}
            >
              {full ? (
                <Check className="size-4" strokeWidth={3} aria-hidden="true" />
              ) : (
                <X className="size-4" aria-hidden="true" />
              )}
              {full ? t("story.ask.contextOn") : t("story.ask.contextOff")}
            </p>
            <p className="mt-1 text-[14px] text-sol-secondary">{t("story.ask.hint")}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
