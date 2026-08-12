import { motion } from "motion/react";
import { STAGE_THEMES } from "@/lib/onboarding-themes";

/** Mirrors the consultation's own seven chapters (see onboarding-themes.ts)
 * so the homepage promise and the actual flow always agree on the count —
 * and so each step can borrow that chapter's real color, not one flat accent. */
const STEPS = [
  {
    stage: STAGE_THEMES[1],
    body: ["We learn your background,", "skills, and starting point."],
  },
  {
    stage: STAGE_THEMES[2],
    body: ["We uncover your strengths", "and unique advantage."],
  },
  {
    stage: STAGE_THEMES[3],
    body: ["We map your budget, time,", "and what you can work with."],
  },
  {
    stage: STAGE_THEMES[4],
    body: ["We understand how you", "make decisions under risk."],
  },
  {
    stage: STAGE_THEMES[5],
    body: ["We learn what's really", "driving you to build this."],
  },
  {
    stage: STAGE_THEMES[6],
    body: ["We get practical about the", "time and effort you can give."],
  },
  {
    stage: STAGE_THEMES[7],
    body: ["We define your vision and", "generate your roadmap."],
  },
];

export function Steps() {
  return (
    <section id="how-it-works" className="mx-auto max-w-[1320px] scroll-mt-24 px-6 py-16 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "200px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-border/70 bg-card px-8 py-16 shadow-[0_30px_80px_-60px_oklch(0.245_0.055_268_/_0.5)] lg:px-16"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 top-6 font-display text-[10rem] font-bold leading-none text-secondary/70"
        >
          S
        </span>

        <p className="eyebrow text-center text-accent">The Solventia Path</p>
        <h2 className="mt-4 text-center text-[clamp(1.7rem,3vw,2.4rem)] font-semibold tracking-[-0.01em] text-primary">
          How Solventia <span className="text-accent">Works</span>
        </h2>
        <p className="mx-auto mt-3 max-w-[52ch] text-center text-[0.9rem] leading-[1.8] text-muted-foreground">
          Seven chapters, one consultation — each with its own focus.
        </p>

        <ol className="relative mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.stage.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex flex-col items-center text-center"
            >
              <div className="flex items-center gap-3">
                <span
                  className="font-sans text-xl font-extrabold"
                  style={{ color: step.stage.color }}
                >
                  {String(step.stage.section).padStart(2, "0")}
                </span>
                <motion.span
                  whileHover={{
                    scale: 1.06,
                    y: -4,
                    boxShadow: "0 20px 40px -18px oklch(0.245 0.055 268 / 0.8)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="relative z-10 flex size-16 items-center justify-center rounded-full border bg-card shadow-[0_14px_34px_-22px_oklch(0.245_0.055_268_/_0.7)]"
                  style={{
                    borderColor: `color-mix(in oklch, ${step.stage.color} 30%, transparent)`,
                  }}
                >
                  <step.stage.icon
                    className="size-7 stroke-[1.4]"
                    style={{ color: step.stage.color }}
                    aria-hidden="true"
                  />
                </motion.span>
              </div>

              <h3 className="mt-6 font-sans text-[0.95rem] font-bold text-primary">
                {step.stage.name}
              </h3>
              <p
                className="mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em]"
                style={{ color: step.stage.color }}
              >
                {step.stage.feeling}
              </p>
              <p className="mt-3 text-[0.86rem] leading-[1.9] text-muted-foreground">
                {step.body[0]}
                <br />
                {step.body[1]}
              </p>
            </motion.li>
          ))}
        </ol>
      </motion.div>
    </section>
  );
}
