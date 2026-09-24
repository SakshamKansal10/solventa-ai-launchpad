import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, X } from "lucide-react";

import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/** Four rows each side, and only what the product actually does — no mentor
 * marketplace, funding signal or other capability that is not running today. */
const GENERIC: MessageKey[] = [
  "whySolventia.generic1",
  "whySolventia.generic2",
  "whySolventia.generic3",
  "whySolventia.generic4",
];
const SOLVENTIA: MessageKey[] = [
  "whySolventia.solventia1",
  "whySolventia.solventia2",
  "whySolventia.solventia3",
  "whySolventia.solventia4",
];

export function WhySolventia() {
  const { t, locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);

  return (
    <section
      id="why-solventia"
      className="scroll-mt-[76px] bg-sol-hp-why px-[18px] py-[88px] sm:px-6 lg:px-9 lg:py-[104px]"
    >
      <div className="mx-auto max-w-[1120px]">
        <p className="text-center text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
          {t("whySolventia.eyebrow")}
        </p>
        <h2
          className={cn(
            "mt-4 text-center font-display text-[30px] font-semibold text-sol-ink sm:text-[36px] lg:text-[44px]",
            locale === "hi" ? "leading-[1.35]" : "leading-[1.12]",
          )}
        >
          {t("whySolventia.headline")}
        </h2>

        <motion.div
          onViewportEnter={() => setEntered(true)}
          viewport={{ once: true, margin: "-100px" }}
          initial={{ opacity: 0, y: 12 }}
          animate={entered ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-12 grid overflow-hidden rounded-[28px] border border-sol-border sm:grid-cols-2"
          data-testid="why-comparison"
        >
          <div className="flex flex-col justify-center bg-sol-hp-ivory-light px-8 py-10 lg:px-12">
            <p className="text-[14px] font-semibold uppercase tracking-[0.12em] text-sol-muted">
              {t("whySolventia.generic")}
            </p>
            <ul className="mt-7 flex flex-col gap-5">
              {GENERIC.map((key, i) => (
                <motion.li
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={entered ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: reduceMotion ? 0 : 0.4,
                    delay: reduceMotion ? 0 : i * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-start gap-3"
                >
                  <X className="mt-1 size-5 shrink-0 text-sol-muted" aria-hidden="true" />
                  <span className="text-[17px] leading-[26px] text-sol-secondary">{t(key)}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div
            className="relative flex flex-col justify-center bg-sol-navy px-8 py-10 lg:px-12"
            style={{
              backgroundImage:
                "radial-gradient(circle at 90% 15%, rgba(112,88,215,.22), transparent 48%)",
            }}
          >
            <p className="text-[14px] font-semibold uppercase tracking-[0.12em] text-sol-champagne">
              {t("whySolventia.solventia")}
            </p>
            <ul className="relative mt-7 flex flex-col gap-5">
              {SOLVENTIA.map((key, i) => (
                <motion.li
                  key={key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={entered ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: reduceMotion ? 0 : 0.4,
                    delay: reduceMotion ? 0 : 0.28 + i * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-start gap-3"
                >
                  <Check className="mt-1 size-5 shrink-0 text-sol-champagne" aria-hidden="true" />
                  <span className="text-[17px] leading-[26px] text-white/95">{t(key)}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* One intentional divider at the comparison's centre (desktop only;
              on mobile the two halves simply stack). */}
          <motion.span
            initial={{ opacity: 0, scale: 0.92 }}
            animate={entered ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-1/2 hidden size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sol-border-strong bg-sol-hp-surface shadow-[0_8px_22px_rgba(23,26,39,.07)] sm:flex"
            aria-hidden="true"
          >
            <span className="text-[14px] font-bold tracking-[0.08em] text-sol-muted">VS</span>
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
}
