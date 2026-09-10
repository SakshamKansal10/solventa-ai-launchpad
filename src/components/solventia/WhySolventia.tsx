import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, X } from "lucide-react";

/** Exactly three rows each side — compressed from the old five, and with
 * every unsupported claim removed (no "mentor marketplace", "funding
 * signal validation", or "direct connections to mentors & NGOs" — none
 * of that is real, running infrastructure yet). Only what the product
 * actually does. */
const GENERIC = ["One-off advice", "No execution memory", "No proof loop"];
const SOLVENTIA = ["Living founder profile", "Real-world evidence", "Adaptive weekly execution"];

export function WhySolventia() {
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);

  return (
    <section className="bg-[#F5EFE6] px-[18px] py-[100px] sm:px-6 lg:px-9">
      <div className="mx-auto max-w-[1120px]">
        <h2 className="text-center font-display text-[32px] font-semibold leading-[1.15] text-sol-ink sm:text-[40px]">
          Why not just ask a chatbot?
        </h2>

        <motion.div
          onViewportEnter={() => setEntered(true)}
          viewport={{ once: true, margin: "-100px" }}
          initial={{ opacity: 0, y: 12 }}
          animate={entered ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-12 grid overflow-hidden rounded-[28px] border border-sol-border sm:grid-cols-2"
          style={{ minHeight: 360 }}
        >
          <div className="flex flex-col justify-center bg-[oklch(0.9649_0.0045_78.3)] px-8 py-10 lg:px-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sol-muted">
              Generic AI
            </p>
            <ul className="mt-7 flex flex-col gap-5">
              {GENERIC.map((row, i) => (
                <motion.li
                  key={row}
                  initial={{ opacity: 0, y: 8 }}
                  animate={entered ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: reduceMotion ? 0 : 0.4,
                    delay: reduceMotion ? 0 : i * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-start gap-3"
                >
                  <X className="mt-0.5 size-4 shrink-0 text-sol-muted" aria-hidden="true" />
                  <span className="text-[15px] leading-[24px] text-sol-secondary">{row}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div
            className="relative flex flex-col justify-center bg-sol-navy px-8 py-10 lg:px-12"
            style={{
              backgroundImage:
                "radial-gradient(circle at 90% 15%, rgba(114,87,216,.20), transparent 48%)",
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sol-champagne">
              Solventia
            </p>
            <ul className="relative mt-7 flex flex-col gap-5">
              {SOLVENTIA.map((row, i) => (
                <motion.li
                  key={row}
                  initial={{ opacity: 0, y: 8 }}
                  animate={entered ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: reduceMotion ? 0 : 0.4,
                    delay: reduceMotion ? 0 : 0.21 + i * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex items-start gap-3"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-sol-champagne" aria-hidden="true" />
                  <span className="text-[15px] leading-[24px] text-white/90">{row}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* VS marker — one intentional divider at the comparison's
           * center, desktop only (mobile stacks the two halves). */}
          <motion.span
            initial={{ opacity: 0, scale: 0.92 }}
            animate={entered ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-1/2 hidden size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full sm:flex"
            style={{
              background: "#FFFDFB",
              border: "1px solid #DDD4C8",
              boxShadow: "0 8px 22px rgba(23,32,61,.07)",
            }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#77717A]">
              VS
            </span>
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
}
