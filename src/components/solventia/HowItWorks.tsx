import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from "motion/react";
import {
  Compass,
  FlaskConical,
  ListChecks,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/** Five steps. The rail fills and the current step lights up as the section is
 * scrolled through — progress is driven by scroll position, not a timer. */
const STEPS: { n: string; icon: LucideIcon; title: MessageKey; body: MessageKey }[] = [
  { n: "01", icon: Compass, title: "howItWorks.step1.title", body: "howItWorks.step1.body" },
  { n: "02", icon: Sparkles, title: "howItWorks.step2.title", body: "howItWorks.step2.body" },
  { n: "03", icon: FlaskConical, title: "howItWorks.step3.title", body: "howItWorks.step3.body" },
  { n: "04", icon: ListChecks, title: "howItWorks.step4.title", body: "howItWorks.step4.body" },
  { n: "05", icon: RefreshCw, title: "howItWorks.step5.title", body: "howItWorks.step5.body" },
];

export function HowItWorks() {
  const { t, locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 45%"] });
  const fill = useSpring(0, { stiffness: 140, damping: 26, mass: 0.6 });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length)));
    setActive(next);
    fill.set(next / (STEPS.length - 1));
  });

  return (
    <section
      id="how-it-works"
      className="scroll-mt-[76px] bg-sol-hp-pearl px-[18px] py-[72px] sm:px-6 lg:px-9 lg:py-[96px]"
    >
      <div className="mx-auto max-w-[1180px]">
        <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
          {t("howItWorks.eyebrow")}
        </p>
        <h2
          className={cn(
            "mt-4 max-w-[18ch] font-display text-[34px] font-semibold text-sol-ink sm:text-[40px] lg:text-[48px]",
            locale === "hi" ? "leading-[1.35]" : "leading-[1.1]",
          )}
        >
          {t("howItWorks.headline")}
        </h2>
        <p className="mt-4 max-w-[580px] text-[18px] leading-[28px] text-sol-secondary">
          {t("howItWorks.subhead")}
        </p>

        <div
          ref={ref}
          className="relative mt-14"
          data-testid="how-it-works-steps"
          data-active={active}
          role="group"
          aria-label={t("story.how.aria")}
        >
          {/* Desktop rail: sits behind the node row. */}
          <div
            className="pointer-events-none absolute left-[10%] right-[10%] top-[27px] hidden h-[3px] rounded-full bg-sol-hp-ivory-deep lg:block"
            aria-hidden="true"
          >
            <motion.span
              className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-sol-champagne via-sol-violet to-sol-violet"
              style={{ scaleX: reduceMotion ? active / (STEPS.length - 1) : fill }}
            />
          </div>
          {/* Mobile rail: down the left edge. */}
          <div
            className="pointer-events-none absolute bottom-6 left-[26px] top-6 w-[3px] rounded-full bg-sol-hp-ivory-deep lg:hidden"
            aria-hidden="true"
          >
            <motion.span
              className="absolute inset-0 origin-top rounded-full bg-gradient-to-b from-sol-champagne to-sol-violet"
              style={{ scaleY: reduceMotion ? active / (STEPS.length - 1) : fill }}
            />
          </div>

          <ol className="relative grid gap-8 lg:grid-cols-5 lg:gap-4">
            {STEPS.map((step, i) => {
              const reached = i <= active;
              const current = i === active;
              return (
                <li
                  key={step.n}
                  className="relative flex gap-5 lg:flex-col lg:items-center lg:gap-5 lg:text-center"
                  data-testid={`how-step-${i + 1}`}
                  data-state={current ? "current" : reached ? "done" : "upcoming"}
                >
                  <span className="relative flex size-[54px] shrink-0 items-center justify-center">
                    {current && !reduceMotion && (
                      <motion.span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full border-2 border-sol-violet/50"
                        animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}
                    <motion.span
                      animate={{ scale: current ? 1.08 : 1 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className={cn(
                        "relative flex size-full items-center justify-center rounded-full border-2 transition-colors duration-300",
                        reached
                          ? "border-sol-violet bg-sol-violet text-white shadow-[0_10px_26px_rgba(114,87,216,0.3)]"
                          : "border-sol-border-strong bg-sol-hp-surface text-sol-muted",
                      )}
                    >
                      <motion.span
                        key={`${i}-${current}`}
                        initial={
                          current && i === STEPS.length - 1 && !reduceMotion
                            ? { rotate: -180 }
                            : false
                        }
                        animate={{ rotate: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="flex"
                      >
                        <step.icon className="size-6" aria-hidden="true" />
                      </motion.span>
                    </motion.span>
                  </span>

                  <div
                    className={cn(
                      "min-w-0 transition-opacity duration-300",
                      reached ? "opacity-100" : "opacity-60",
                    )}
                  >
                    <p
                      className={cn(
                        "font-display text-[15px] font-semibold tracking-[0.12em] transition-colors duration-300",
                        reached ? "text-sol-champagne-deep" : "text-sol-muted",
                      )}
                    >
                      {step.n}
                    </p>
                    <h3 className="mt-1 font-display text-[26px] font-semibold leading-[1.15] text-sol-ink">
                      {t(step.title)}
                    </h3>
                    <p className="mt-2 text-[16.5px] leading-[26px] text-sol-secondary lg:mx-auto lg:max-w-[22ch]">
                      {t(step.body)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
