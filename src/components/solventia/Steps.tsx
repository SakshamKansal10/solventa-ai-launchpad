import { motion } from "motion/react";
import { BrainCircuit, ClipboardCheck, Map, UserRound } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: UserRound,
    title: "Understand You",
    body: ["We learn your skills, resources,", "and constraints — deeply."],
  },
  {
    n: "02",
    icon: BrainCircuit,
    title: "AI Generates Opportunities",
    body: ["Our AI surfaces ideas matched", "to your real profile."],
  },
  {
    n: "03",
    icon: ClipboardCheck,
    title: "Validate Ideas",
    body: ["Test demand with real market", "data before you commit."],
  },
  {
    n: "04",
    icon: Map,
    title: "Create Roadmap",
    body: ["Get a step-by-step plan with", "milestones, tools & resources."],
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

        <ol className="relative mt-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[10%] top-10 hidden h-px border-t-[2.5px] border-dotted border-accent/60 lg:block"
          />
          {STEPS.map((step, i) => (
            <motion.li
              key={step.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex flex-col items-center text-center"
            >
              <div className="flex items-center gap-4">
                <span className="font-sans text-2xl font-extrabold text-accent">{step.n}</span>
                <motion.span
                  whileHover={{
                    scale: 1.06,
                    y: -4,
                    boxShadow: "0 20px 40px -18px oklch(0.245 0.055 268 / 0.8)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="relative z-10 flex size-20 items-center justify-center rounded-full border border-accent/25 bg-card shadow-[0_14px_34px_-22px_oklch(0.245_0.055_268_/_0.7)]"
                >
                  <step.icon className="size-9 stroke-[1.4] text-accent" aria-hidden="true" />
                </motion.span>
              </div>

              <h3 className="mt-7 font-sans text-[0.95rem] font-bold text-primary">{step.title}</h3>
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
