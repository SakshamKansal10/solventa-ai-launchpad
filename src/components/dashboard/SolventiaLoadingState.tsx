import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import mark from "@/assets/solventia-mark.png";

/** The branded "Sol is thinking" moment for a genuine AI-generation wait
 * (building a roadmap) — never for routine data loads or tab changes,
 * which stay fast, plain spinners. A soft gold/violet glow breathes
 * behind the mark; the whole animation collapses to a static presentation
 * under prefers-reduced-motion instead of just disabling one property.
 *
 * `stages`, when given, rotates through a short list of honest, real
 * step descriptions (never a fake percentage or progress bar tied to
 * nothing) every 3.2s, and simply holds on the last one if the actual
 * call outlives the sequence — it never claims to finish before the
 * real response has actually arrived. `message` alone still works
 * everywhere else unchanged. */
export function SolventiaLoadingState({
  message,
  stages,
}: {
  message?: string;
  stages?: string[];
}) {
  const reduceMotion = useReducedMotion();
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!stages || stages.length <= 1) return;
    const id = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, stages.length - 1));
    }, 3200);
    return () => clearInterval(id);
  }, [stages]);

  const displayMessage = stages && stages.length > 0 ? stages[stageIndex] : (message ?? "");

  return (
    <div className="flex flex-col items-center justify-center gap-5 px-6 py-14 text-center">
      <div className="relative flex size-20 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, var(--gold-soft) 0%, var(--violet-soft) 55%, transparent 75%)",
          }}
          animate={reduceMotion ? undefined : { opacity: [0.5, 0.9, 0.5], scale: [0.9, 1.08, 0.9] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.img
          src={mark}
          alt=""
          width={298}
          height={436}
          className="relative h-11 w-auto"
          animate={reduceMotion ? undefined : { scale: [1, 1.06, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={displayMessage}
          initial={reduceMotion ? undefined : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="max-w-xs text-[0.92rem] leading-relaxed text-dashboard-body"
        >
          {displayMessage}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
