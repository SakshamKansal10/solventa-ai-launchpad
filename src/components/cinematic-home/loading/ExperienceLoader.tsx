import { motion } from "motion/react";

import { PALETTE } from "../scene/palette";

/**
 * The loading veil: server-rendered, so the very first paint is already the
 * dark stage (no white flash while three.js downloads). It lifts only once the
 * scene has rendered real frames, or at once for the static fallback.
 */
export function ExperienceLoader({ ready }: { ready: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-testid="cinematic-loader"
      data-state={ready ? "done" : "loading"}
      className={`pointer-events-none fixed inset-0 z-30 flex items-center justify-center transition-opacity duration-700 ease-[var(--sol-ease)] ${
        ready ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: PALETTE.midnight }}
    >
      <div className="flex flex-col items-center gap-5">
        <p className="font-display text-[15px] tracking-[0.5em] text-white/80">SOLVENTIA</p>
        <div className="h-px w-28 overflow-hidden bg-white/10">
          {!ready && (
            <motion.div
              className="h-full w-1/3"
              style={{ backgroundColor: PALETTE.champagne }}
              initial={{ x: "-100%" }}
              animate={{ x: "300%" }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], repeat: Infinity }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
