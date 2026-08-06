import { motion } from "motion/react";
import { CalendarDays } from "lucide-react";

const MILESTONES = [
  {
    mark: "Month 1",
    title: "Validate",
    body: "Talk to 20+ potential customers, stress-test your assumptions, and finalize your MVP concept.",
  },
  {
    mark: "Month 3",
    title: "Launch",
    body: "Ship your MVP, onboard your first real users, and start collecting honest feedback.",
  },
  {
    mark: "Month 6",
    title: "Refine",
    body: "Iterate on what the data tells you, build repeatable processes, hit your first revenue milestone.",
  },
  {
    mark: "Year 1",
    title: "Scale",
    body: "Double down on what works, formalize operations, and pursue funding or sustainable growth.",
  },
];

export function RoadmapTimeline() {
  return (
    <section className="w-full px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex items-center gap-6">
          <CalendarDays className="size-5 text-accent" aria-hidden="true" />
          <h2 className="shrink-0 text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold tracking-[-0.01em] text-primary">
            What Your First Year Could Look Like
          </h2>
          <span className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
        </div>
        <p className="mt-4 max-w-[62ch] text-[0.95rem] leading-[1.9] text-muted-foreground">
          Every roadmap is tailored to you — this is the shape a typical journey takes.
        </p>

        <div className="relative mt-14">
          <div
            aria-hidden="true"
            className="absolute left-5 top-5 hidden h-[calc(100%-2.5rem)] w-px bg-border lg:left-0 lg:top-5 lg:h-px lg:w-full"
          />
          <motion.div
            aria-hidden="true"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "200px" }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-5 top-5 hidden h-[calc(100%-2.5rem)] w-px origin-top bg-accent lg:left-0 lg:top-5 lg:h-px lg:w-full lg:origin-left"
          />

          <ol className="relative grid gap-10 lg:grid-cols-4 lg:gap-8">
            {MILESTONES.map((m, i) => (
              <motion.li
                key={m.mark}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "200px" }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex gap-5 pl-14 lg:flex-col lg:gap-0 lg:pl-0"
              >
                <span className="absolute left-0 top-0 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-card font-display text-sm font-bold text-accent lg:relative lg:mb-6">
                  {i + 1}
                </span>
                <div>
                  <p className="eyebrow text-accent">{m.mark}</p>
                  <h3 className="mt-2 font-sans text-[1.02rem] font-bold text-primary">
                    {m.title}
                  </h3>
                  <p className="mt-2 max-w-[32ch] text-[0.86rem] leading-[1.8] text-muted-foreground">
                    {m.body}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
