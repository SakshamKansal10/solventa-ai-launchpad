import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const HEIGHT = 96;

/** The seam between two homepage sections, drawn as one signal path. The line
 * draws itself as the seam scrolls through the viewport and a signal travels
 * down it into the next section, so the page reads as one system passing its
 * output along — not a stack of unrelated blocks. Driven by scroll position
 * (transform only), so fast or slow scrolling can never leave it half-done. */
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
  const ref = useRef<HTMLDivElement>(null);
  // 0 as the seam enters at the bottom of the viewport, 1 as it leaves at the top.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const draw = useTransform(scrollYProgress, [0.05, 0.5], [0, 1]);
  const travel = useTransform(scrollYProgress, [0.15, 0.85], [0, HEIGHT - 6]);
  const glow = useTransform(scrollYProgress, [0.1, 0.2, 0.8, 0.9], [0, 1, 1, 0]);

  return (
    <div
      ref={ref}
      className="relative flex w-full items-center justify-center overflow-hidden"
      style={{ height: HEIGHT, background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)` }}
      data-testid="story-connector"
    >
      <motion.span
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-full w-px origin-top bg-gradient-to-b from-sol-champagne/70 via-sol-violet/60 to-sol-champagne/70"
        style={{ scaleY: reduceMotion ? 1 : draw }}
      />
      {!reduceMotion && (
        <motion.span
          aria-hidden="true"
          className="absolute left-1/2 top-0 -ml-[3.5px] size-[7px] rounded-full bg-sol-violet shadow-[0_0_0_4px_rgba(114,87,216,0.18),0_0_14px_rgba(114,87,216,0.55)]"
          style={{ y: travel, opacity: glow }}
        />
      )}
      <motion.span
        initial={{ opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 0.94 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 inline-flex min-h-9 items-center gap-2 rounded-full border border-sol-border bg-sol-hp-surface px-4 text-[14px] font-semibold text-sol-secondary shadow-[0_6px_18px_rgba(23,26,39,0.06)]"
      >
        <span className="size-2 rounded-full bg-sol-champagne" aria-hidden="true" />
        {t(labelKey)}
      </motion.span>
    </div>
  );
}
