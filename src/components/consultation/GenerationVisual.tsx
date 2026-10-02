import { motion, useReducedMotion } from "motion/react";

import mark from "@/assets/solventia-mark.png";
import { cn } from "@/lib/utils";
import { useProfileFacts } from "./ProfileSignals";

/** A short, repeating dot that travels along a connector. Ambient motion only —
 * it never represents measured backend progress, and there is no percentage
 * anywhere on this screen. */
function Flow({ vertical, delay = 0 }: { vertical?: boolean; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full bg-gradient-to-r from-sol-violet/15 via-sol-violet/40 to-sol-champagne/50",
        vertical ? "h-9 w-0.5 bg-gradient-to-b" : "h-0.5 w-14",
      )}
    >
      {!reduceMotion && (
        <motion.span
          className={cn(
            "absolute rounded-full bg-sol-violet",
            vertical ? "left-0 top-0 h-3 w-0.5" : "left-0 top-0 h-0.5 w-3",
          )}
          animate={vertical ? { y: [-12, 40] } : { x: [-12, 64] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: "easeIn", delay }}
        />
      )}
    </span>
  );
}

/** Founder signals (the founder's own confirmed answers) flow into Solventia
 * Intelligence, which is forming three directions. Laid out entirely in normal
 * document flow — nothing here is fixed, absolute or negatively positioned
 * relative to its card — so it can never overlap the copy around it. */
export function GenerationVisual() {
  const reduceMotion = useReducedMotion();
  const facts = useProfileFacts().slice(0, 6);

  return (
    <div
      className="grid w-full items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3"
      aria-hidden="true"
      data-testid="generation-visual"
    >
      {/* Signals */}
      <ul className="flex flex-wrap justify-center gap-2 sm:flex-col sm:flex-nowrap sm:justify-center">
        {facts.map((f, i) => (
          <motion.li
            key={f.key}
            initial={reduceMotion ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.09 }}
            className="min-w-0 rounded-xl border border-sol-border bg-sol-surface px-3 py-2 text-left"
          >
            <span className="block truncate text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-sol-secondary">
              {f.label}
            </span>
            <span className="block truncate text-[0.9375rem] font-medium leading-snug text-sol-ink">
              {f.value}
            </span>
          </motion.li>
        ))}
      </ul>

      {/* Flow in → node → flow out */}
      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
        <span className="sm:hidden">
          <Flow vertical />
        </span>
        <span className="hidden sm:block">
          <Flow delay={0.2} />
        </span>
        <div className="relative flex size-[104px] items-center justify-center">
          {!reduceMotion && (
            <>
              <motion.span
                className="absolute inset-0 rounded-full border border-sol-violet/40"
                animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.span
                className="absolute inset-0 rounded-full border border-sol-champagne/50"
                animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1 }}
              />
            </>
          )}
          <div className="relative flex size-[84px] items-center justify-center rounded-full border border-sol-violet/40 bg-sol-surface shadow-[0_14px_36px_rgba(114,87,216,0.16)]">
            <span className="absolute inset-2 rounded-full border border-dashed border-sol-champagne/55" />
            <img src={mark} alt="" width={298} height={436} className="relative h-9 w-auto" />
          </div>
        </div>
        <span className="sm:hidden">
          <Flow vertical delay={0.4} />
        </span>
        <span className="hidden sm:block">
          <Flow delay={0.5} />
        </span>
      </div>

      {/* Three directions, still forming */}
      <ul className="flex flex-col gap-2">
        {[1, 2, 3].map((n, i) => (
          <motion.li
            key={n}
            initial={reduceMotion ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 + i * 0.12 }}
            className="flex items-center gap-3 rounded-xl border border-dashed border-sol-border-strong bg-sol-pearl px-3 py-3"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sol-champagne-soft font-display text-[0.9375rem] font-semibold text-sol-champagne-deep">
              {n}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <motion.span
                className="h-2 w-full rounded-full bg-sol-ivory-depth"
                animate={reduceMotion ? undefined : { opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.25 }}
              />
              <motion.span
                className="h-2 w-2/3 rounded-full bg-sol-ivory-depth"
                animate={reduceMotion ? undefined : { opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.25 + 0.3 }}
              />
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
