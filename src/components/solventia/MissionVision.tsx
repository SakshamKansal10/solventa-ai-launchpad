import { motion } from "motion/react";
import { Target, Telescope } from "lucide-react";

const PANELS = [
  {
    icon: Target,
    eyebrow: "Our Mission",
    statement:
      "Give every young dreamer the intelligence, validation, and support once reserved for founders with the right connections.",
    body: "A good idea should only need to be good — not well-connected. Solventia pairs each dreamer with AI-driven discovery, real market validation, and a step-by-step roadmap, so ambition is never the limiting factor.",
  },
  {
    icon: Telescope,
    eyebrow: "Our Vision",
    statement: "A world where opportunity is distributed by ambition, not geography or background.",
    body: "We're building toward a future where any young person with a real idea — in a metro city or a small town — can validate it, build it, and watch it create impact, with mentors and NGOs standing behind them.",
  },
];

export function MissionVision() {
  return (
    <section id="about-us" className="w-full scroll-mt-24 px-6 py-16 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "200px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-[900px] text-center"
      >
        <p className="eyebrow justify-center text-accent">Why Solventia Exists</p>
        <p className="mt-6 font-display text-[clamp(1.9rem,4vw,3rem)] font-medium leading-[1.25] text-primary">
          Millions have ideas.{" "}
          <span className="text-shimmer-gold font-semibold italic">Few have the clarity</span> to
          turn them into something real.
        </p>
        <p className="mx-auto mt-6 max-w-[56ch] text-[1rem] leading-[1.9] text-muted-foreground">
          Solventia exists to close that gap — with intelligence, real validation, and a roadmap you
          can actually follow.
        </p>
      </motion.div>

      <div className="mx-auto mt-14 flex items-center gap-6 max-w-[1320px]">
        <Target className="size-5 text-accent" aria-hidden="true" />
        <h2 className="shrink-0 text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold tracking-[-0.01em] text-primary">
          Mission &amp; Vision
        </h2>
        <span className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
      </div>

      <div className="mx-auto mt-10 grid max-w-[1320px] gap-6 lg:grid-cols-2">
        {PANELS.map((panel, i) => (
          <motion.div
            key={panel.eyebrow}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "200px" }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl border border-border/70 bg-card px-8 py-12 shadow-[0_20px_60px_-50px_oklch(0.245_0.055_268_/_0.6)] lg:px-10 lg:py-14"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 font-display text-[9rem] font-bold leading-none text-secondary/60"
            >
              S
            </span>
            <span className="relative flex size-12 items-center justify-center rounded-full border border-accent/25 bg-background">
              <panel.icon className="size-5 text-accent" aria-hidden="true" />
            </span>
            <p className="eyebrow relative mt-6 text-accent">{panel.eyebrow}</p>
            <p className="relative mt-4 font-display text-[1.5rem] font-medium leading-[1.35] text-primary lg:text-[1.65rem]">
              {panel.statement}
            </p>
            <p className="relative mt-5 text-[0.92rem] leading-[1.9] text-muted-foreground">
              {panel.body}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
