import { motion, useReducedMotion } from "motion/react";
import mark from "@/assets/solventia-mark.png";

/** The branded "Sol is thinking" moment for a genuine AI-generation wait
 * (building a roadmap) — never for routine data loads or tab changes,
 * which stay fast, plain spinners. A soft gold/violet glow breathes
 * behind the mark; the whole animation collapses to a static presentation
 * under prefers-reduced-motion instead of just disabling one property. */
export function SolventiaLoadingState({ message }: { message: string }) {
  const reduceMotion = useReducedMotion();

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
      <p className="max-w-xs text-[0.92rem] leading-relaxed text-dashboard-body">{message}</p>
    </div>
  );
}
