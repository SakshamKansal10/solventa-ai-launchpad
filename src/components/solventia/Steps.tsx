import { motion } from "motion/react";
import { UserRound, BrainCircuit, ClipboardCheck, Flag } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: UserRound,
    title: "Tell Us About You",
    body: ["Share your background,", "skills, budget & interests."],
  },
  {
    n: "02",
    icon: BrainCircuit,
    title: "AI Finds Opportunities",
    body: ["Our AI analyzes real data", "to find the best ideas for you."],
  },
  {
    n: "03",
    icon: ClipboardCheck,
    title: "Validate & Choose",
    body: ["Compare options, validate", "feasibility, and choose right."],
  },
  {
    n: "04",
    icon: Flag,
    title: "Get Your Roadmap",
    body: ["Receive a step-by-step plan", "with milestones & resources."],
  },
];

export function Steps() {
  return (
    <section id="how-it-works" className="mx-auto max-w-[1320px] px-6 py-16 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
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
          From Idea to Impact in <span className="text-accent">4 Simple Steps</span>
        </h2>

        <ol className="relative mt-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex flex-col items-center text-center"
            >
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[62%] top-9 hidden h-px w-[76%] border-t-2 border-dotted border-accent/45 lg:block"
                />
              )}

              <div className="flex items-center gap-4">
                <span className="font-sans text-2xl font-bold text-accent">{step.n}</span>
                <motion.span
                  whileHover={{ scale: 1.06, y: -3 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="relative z-10 flex size-[4.5rem] items-center justify-center rounded-full border border-accent/25 bg-card shadow-[0_14px_34px_-22px_oklch(0.245_0.055_268_/_0.7)]"
                >
                  <step.icon className="size-8 stroke-[1.4] text-accent" aria-hidden="true" />
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
