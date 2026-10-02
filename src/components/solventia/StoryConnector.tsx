import { motion, useReducedMotion } from "motion/react";

import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** The seam between two homepage sections, drawn as one signal path: a line
 * grows down the page and the transformation it stands for is named on it
 * ("Signals become opportunities"), so the sections read as one system rather
 * than a stack of unrelated blocks. */
export function StoryConnector({
  from,
  to,
  labelKey,
}: {
  from: string;
  to: string;
  labelKey: MessageKey;
}) {
  const { t } = useLocale();
  const reduceMotion = useReducedMotion();
  return (
    <div
      className="relative flex h-[84px] w-full items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)` }}
      data-testid="story-connector"
    >
      <motion.span
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-full w-px origin-top bg-gradient-to-b from-sol-champagne/70 via-sol-violet/60 to-sol-champagne/70"
        initial={{ scaleY: reduceMotion ? 1 : 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.span
        initial={{ opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.35 }}
        className="relative z-10 inline-flex min-h-9 items-center gap-2 rounded-full border border-sol-border bg-sol-hp-surface px-4 text-[14px] font-semibold text-sol-secondary shadow-[0_6px_18px_rgba(23,26,39,0.06)]"
      >
        <span className="size-2 rounded-full bg-sol-champagne" aria-hidden="true" />
        {t(labelKey)}
      </motion.span>
    </div>
  );
}
