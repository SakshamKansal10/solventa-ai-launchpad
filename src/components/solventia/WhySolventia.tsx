import { motion } from "motion/react";
import { Check, Sparkles, X } from "lucide-react";

const ROWS = [
  {
    generic: "One-off answers with no memory of your goals",
    solventia: "A living profile that shapes every recommendation",
  },
  {
    generic: "Guesses drawn from generic training data",
    solventia: "Ideas validated against real market & funding signals",
  },
  {
    generic: "No accountability once the chat ends",
    solventia: "A step-by-step roadmap with milestones you can track",
  },
  {
    generic: "You're left to find support on your own",
    solventia: "Direct connections to mentors & NGOs",
  },
  {
    generic: "The same generic advice for everyone",
    solventia: "Adapts to your budget, skills & interests",
  },
];

export function WhySolventia() {
  return (
    <section className="mx-auto max-w-[1320px] px-6 py-16 lg:px-10">
      <div className="flex items-center gap-6">
        <Sparkles className="size-5 text-accent" aria-hidden="true" />
        <h2 className="shrink-0 text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold tracking-[-0.01em] text-primary">
          Why Solventia
        </h2>
        <span className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
      </div>
      <p className="mt-4 max-w-[62ch] text-[0.95rem] leading-[1.9] text-muted-foreground">
        A generic AI chatbot gives you an answer. Solventia gives you a validated path.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "200px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-12 grid overflow-hidden rounded-3xl border border-border/70 shadow-[0_30px_80px_-60px_oklch(0.245_0.055_268_/_0.5)] lg:grid-cols-2"
      >
        <div className="bg-secondary/50 px-8 py-10 lg:px-12 lg:py-14">
          <p className="eyebrow text-muted-foreground">Normal AI</p>
          <ul className="mt-7 flex flex-col gap-5">
            {ROWS.map((row) => (
              <li key={row.generic} className="flex items-start gap-3">
                <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                <span className="text-[0.9rem] leading-[1.7] text-muted-foreground">
                  {row.generic}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative bg-primary px-8 py-10 lg:px-12 lg:py-14">
          <p className="eyebrow text-accent">Solventia</p>
          <ul className="mt-7 flex flex-col gap-5">
            {ROWS.map((row) => (
              <li key={row.solventia} className="flex items-start gap-3">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="text-[0.9rem] leading-[1.7] text-primary-foreground/90">
                  {row.solventia}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 hidden size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-background bg-card font-display text-xs font-bold tracking-[0.2em] text-primary shadow-lg lg:flex"
        >
          VS
        </span>
      </motion.div>
    </section>
  );
}
