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
const NODE_Y = 20;
function nodeX(i: number) {
  return (VIEW_WIDTH / (STAGES.length - 1)) * i + 30;
}
/** A shallow sine-based dip so the path reads as one real curved journey
 * rather than a ruled line with dots on it. */
function nodeYAt(i: number) {
  return NODE_Y + Math.sin((i / (STAGES.length - 1)) * Math.PI) * -8;
}
function curvePath(): string {
  const points = STAGES.map((_, i) => ({ x: nodeX(i), y: nodeYAt(i) }));
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    d += ` C ${midX},${prev.y} ${midX},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}
const PATH_D = curvePath();
const DRAW_DURATION = 1.2;

/** One continuous journey — a shallow curved path drawn once across all
 * four nodes as the section scrolls into view, each node briefly lighting
 * violet as the path reaches it before settling to champagne — replacing
 * the old seven isolated circle-plus-paragraph grid, which read as a list
 * rather than a transformation. */
export function HowItWorks() {
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);

  return (
    <section
      id="how-it-works"
      className="scroll-mt-[84px] bg-sol-hp-ivory px-[18px] py-[96px] sm:px-6 lg:px-9 lg:pb-[104px] lg:pt-[96px]"
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
            <defs>
              <linearGradient id="how-it-works-path" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--sol-champagne)" />
                <stop offset="50%" stopColor="var(--sol-violet)" />
                <stop offset="100%" stopColor="var(--sol-champagne)" />
              </linearGradient>
            </defs>
            <path d={PATH_D} fill="none" stroke="rgba(197,163,106,.34)" strokeWidth={1.4} />
            <motion.path
              d={PATH_D}
              fill="none"
              stroke="url(#how-it-works-path)"
              strokeWidth={2}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={entered ? { pathLength: 1 } : {}}
              transition={{ duration: reduceMotion ? 0 : DRAW_DURATION, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>

          <ol className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STAGES.map((stage, i) => {
              // When the drawing path reaches this node, in seconds.
              const reachDelay = reduceMotion ? 0 : (i / (STAGES.length - 1)) * DRAW_DURATION;
              return (
                <motion.li
                  key={stage.n}
                  initial={{ opacity: 0, y: 16 }}
                  animate={entered ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: reduceMotion ? 0 : 0.5,
                    delay: reduceMotion ? 0 : 0.15 + i * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex max-w-[255px] flex-col gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-semibold text-sol-champagne-deep">
                      {stage.n}
                    </span>
                    <motion.span
                      className="flex size-12 items-center justify-center rounded-full"
                      style={{
                        border: "1px solid rgba(197,163,106,.45)",
                        background: "rgba(255,253,249,.86)",
                      }}
                      animate={
                        entered && !reduceMotion
                          ? {
                              borderColor: [
                                "rgba(197,163,106,.45)",
                                "rgba(114,87,216,.9)",
                                "rgba(197,163,106,.45)",
                              ],
                              boxShadow: [
                                "0 0 0 0px rgba(114,87,216,0)",
                                "0 0 0 7px rgba(114,87,216,.055)",
                                "0 0 0 0px rgba(114,87,216,0)",
                              ],
                            }
                          : undefined
                      }
                      transition={{ duration: 0.35, delay: reachDelay, ease: "easeOut" }}
                    >
                      <stage.icon className="size-[18px] text-sol-violet-deep" aria-hidden="true" />
                    </motion.span>
                  </div>
                  <div>
                    <h3 className="font-display text-[18px] font-semibold leading-[26px] text-sol-ink">
                      {stage.title}
                    </h3>
                    <p className="mt-1.5 text-[16px] leading-[24px] text-[#66616A]">{stage.body}</p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </motion.div>
      </div>
    </section>
  );
}
