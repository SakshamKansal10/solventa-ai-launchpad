import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Compass, FlaskConical, Map, Sparkles } from "lucide-react";

/** Four stages only — the seven internal onboarding chapters don't need
 * individual advertising; what matters publicly is the shape of the
 * whole journey, not a chapter-by-chapter inventory. */
const STAGES = [
  { n: "01", icon: Compass, title: "Understand", body: "Founder Genome forms from your reality." },
  { n: "02", icon: Sparkles, title: "Discover", body: "Three directions calibrated to you." },
  { n: "03", icon: FlaskConical, title: "Prove", body: "Test assumptions with real evidence." },
  { n: "04", icon: Map, title: "Build", body: "Your next week adapts as you learn." },
];

const VIEW_WIDTH = 1000;
function nodeX(i: number) {
  return (VIEW_WIDTH / (STAGES.length - 1)) * i + 30;
}

/** One continuous journey — a thin path drawn once across all four
 * nodes as the section scrolls into view — replacing the old seven
 * isolated circle-plus-paragraph grid, which read as a list rather
 * than a transformation. */
export function HowItWorks() {
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);

  return (
    <section
      id="how-it-works"
      className="scroll-mt-[84px] bg-sol-page px-[18px] py-[96px] sm:px-6 lg:px-9 lg:py-[120px]"
    >
      <div className="mx-auto max-w-[1180px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sol-champagne-deep">
          How It Works
        </p>
        <h2 className="mt-4 font-display text-[32px] font-semibold leading-[1.15] text-sol-ink sm:text-[40px] sm:leading-[46px]">
          From uncertainty to execution.
        </h2>
        <p className="mt-4 max-w-[560px] text-[17px] leading-[27px] text-sol-secondary">
          Every consultation moves you through the same four stages, calibrated to your own answers.
        </p>

        <motion.div
          onViewportEnter={() => setEntered(true)}
          viewport={{ once: true, margin: "-100px" }}
          className="relative mt-16"
        >
          <svg
            viewBox={`0 0 ${VIEW_WIDTH + 60} 40`}
            className="pointer-events-none absolute inset-x-0 top-[26px] hidden h-[40px] w-full lg:block"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={`M ${nodeX(0)},20 L ${nodeX(1)},20 L ${nodeX(2)},20 L ${nodeX(3)},20`}
              fill="none"
              stroke="#D7CABB"
              strokeWidth={2}
            />
            <motion.path
              d={`M ${nodeX(0)},20 L ${nodeX(1)},20 L ${nodeX(2)},20 L ${nodeX(3)},20`}
              fill="none"
              stroke="var(--sol-champagne)"
              strokeWidth={2}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={entered ? { pathLength: 1 } : {}}
              transition={{ duration: reduceMotion ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>

          <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STAGES.map((stage, i) => (
              <motion.li
                key={stage.n}
                initial={{ opacity: 0, y: 16 }}
                animate={entered ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: reduceMotion ? 0 : 0.5,
                  delay: reduceMotion ? 0 : 0.3 + i * (1200 / 1000 / STAGES.length),
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex max-w-[255px] flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-[22px] font-bold text-sol-champagne-deep">
                    {stage.n}
                  </span>
                  <span className="flex size-11 items-center justify-center rounded-full border border-sol-border bg-sol-surface">
                    <stage.icon className="size-4 text-sol-violet-deep" aria-hidden="true" />
                  </span>
                </div>
                <div>
                  <h3 className="text-[21px] font-semibold leading-[28px] text-sol-ink">
                    {stage.title}
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-[24px] text-sol-secondary">
                    {stage.body}
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
