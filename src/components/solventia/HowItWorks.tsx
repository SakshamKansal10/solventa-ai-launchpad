import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Compass, FlaskConical, Map, Sparkles, type LucideIcon } from "lucide-react";

import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/** Four steps only — the seven consultation stages are not advertised one by
 * one; what matters publicly is the shape of the whole journey. */
const STEPS: { n: string; icon: LucideIcon; title: MessageKey; body: MessageKey }[] = [
  { n: "01", icon: Compass, title: "howItWorks.step1.title", body: "howItWorks.step1.body" },
  { n: "02", icon: Sparkles, title: "howItWorks.step2.title", body: "howItWorks.step2.body" },
  { n: "03", icon: FlaskConical, title: "howItWorks.step3.title", body: "howItWorks.step3.body" },
  { n: "04", icon: Map, title: "howItWorks.step4.title", body: "howItWorks.step4.body" },
];

/** The trajectory rises left to right: each node sits at the horizontal centre
 * of its column (12.5% / 37.5% / 62.5% / 87.5%) and a little higher than the
 * last. One viewBox is stretched across the row, and the path passes exactly
 * through every node. */
const VIEW_W = 1000;
const VIEW_H = 120;
const NODES = STEPS.map((_, i) => ({
  x: ((i * 2 + 1) / (STEPS.length * 2)) * VIEW_W,
  y: 100 - i * 27,
}));
const PATH = NODES.reduce((d, p, i) => {
  if (i === 0) return `M ${p.x},${p.y}`;
  const prev = NODES[i - 1];
  const mid = (prev.x + p.x) / 2;
  return `${d} C ${mid},${prev.y} ${mid},${p.y} ${p.x},${p.y}`;
}, "");
const DRAW_SECONDS = 1.3;

export function HowItWorks() {
  const { t, locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);

  return (
    <section
      id="how-it-works"
      className="scroll-mt-[76px] bg-sol-hp-ivory px-[18px] py-[88px] sm:px-6 lg:px-9 lg:py-[112px]"
    >
      <div className="mx-auto max-w-[1180px]">
        <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
          {t("howItWorks.eyebrow")}
        </p>
        <h2
          className={cn(
            "mt-4 max-w-[18ch] font-display text-[30px] font-semibold text-sol-ink sm:text-[36px] lg:text-[44px]",
            locale === "hi" ? "leading-[1.35]" : "leading-[1.12]",
          )}
        >
          {t("howItWorks.headline")}
        </h2>
        <p className="mt-4 max-w-[580px] text-[17px] leading-[28px] text-sol-secondary">
          {t("howItWorks.subhead")}
        </p>

        <motion.div
          onViewportEnter={() => setEntered(true)}
          viewport={{ once: true, margin: "-100px" }}
          className="relative mt-14"
          data-testid="how-it-works-steps"
        >
          {/* Desktop trajectory: one curve rising through all four steps. */}
          <div className="relative hidden h-[120px] lg:block" aria-hidden="true">
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              <defs>
                <linearGradient id="hiw-trajectory" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--sol-champagne)" />
                  <stop offset="100%" stopColor="var(--sol-violet)" />
                </linearGradient>
              </defs>
              <path
                d={PATH}
                fill="none"
                stroke="rgba(195,160,100,.3)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              <motion.path
                d={PATH}
                fill="none"
                stroke="url(#hiw-trajectory)"
                strokeWidth={3}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                animate={entered ? { pathLength: 1 } : {}}
                transition={{ duration: reduceMotion ? 0 : DRAW_SECONDS, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            {NODES.map((node, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={entered ? { scale: 1, opacity: 1 } : {}}
                transition={{
                  duration: reduceMotion ? 0 : 0.35,
                  delay: reduceMotion ? 0 : (i / (STEPS.length - 1)) * DRAW_SECONDS * 0.85,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute flex size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-sol-hp-ivory bg-sol-violet shadow-[0_0_0_1px_rgba(112,88,215,.4)]"
                style={{ left: `${(node.x / VIEW_W) * 100}%`, top: `${(node.y / VIEW_H) * 100}%` }}
              />
            ))}
          </div>

          <ol className="relative grid gap-5 lg:mt-2 lg:grid-cols-4 lg:gap-6">
            {/* Mobile trajectory: a vertical line down the left edge. */}
            <span
              aria-hidden="true"
              className="absolute bottom-10 left-[27px] top-10 w-px bg-gradient-to-b from-sol-champagne/60 via-sol-violet/40 to-sol-champagne/60 lg:hidden"
            />
            {STEPS.map((step, i) => (
              <motion.li
                key={step.n}
                initial={{ opacity: 0, y: 18 }}
                animate={entered ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: reduceMotion ? 0 : 0.5,
                  delay: reduceMotion ? 0 : 0.1 + i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative flex gap-5 rounded-3xl border border-sol-hp-border bg-sol-hp-surface p-6 shadow-[0_14px_40px_rgba(23,26,39,0.05)] lg:min-h-[260px] lg:flex-col lg:gap-6 lg:p-8"
                data-testid={`how-step-${i + 1}`}
              >
                <div className="flex shrink-0 flex-col items-center gap-2 lg:flex-row lg:gap-4">
                  <span className="flex size-[54px] items-center justify-center rounded-full border border-sol-champagne/50 bg-sol-champagne-soft">
                    <step.icon className="size-6 text-sol-violet-deep" aria-hidden="true" />
                  </span>
                  <span className="font-display text-[30px] font-semibold leading-none text-sol-champagne-deep lg:text-[44px]">
                    {step.n}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-[22px] font-semibold leading-[1.25] text-sol-ink lg:text-[26px]">
                    {t(step.title)}
                  </h3>
                  <p className="mt-2 text-[17px] leading-[28px] text-sol-secondary">
                    {t(step.body)}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      </div>
    </section>
  );
}
