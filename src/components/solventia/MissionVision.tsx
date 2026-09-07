import { motion } from "motion/react";
import { Target, Telescope } from "lucide-react";

const PANELS = [
  {
    icon: Target,
    eyebrow: "Our Mission",
    statement:
      "Give every ambitious person the intelligence, validation, and support once reserved for founders with the right connections.",
    body: "A good idea should only need to be good — not well-connected. Solventia pairs each founder with structured discovery, real market validation, and a step-by-step roadmap, so ambition is never the limiting factor.",
  },
  {
    icon: Telescope,
    eyebrow: "Our Vision",
    statement: "A world where opportunity is distributed by ambition, not geography or background.",
    body: "We're building toward a future where anyone with a real idea — in a metro city or a small town — can validate it, build it, and watch it create impact.",
  },
];

/** Moved here from the homepage — this is company/mission content, not
 * the product demonstration the homepage now leads with. */
export function MissionVision() {
  return (
    <section className="mx-auto max-w-[1180px] px-[18px] py-16 sm:px-6 lg:px-10">
      <div className="flex items-center gap-6">
        <Target className="size-5 text-sol-champagne-deep" aria-hidden="true" />
        <h2 className="shrink-0 text-[26px] font-semibold tracking-[-0.01em] text-sol-ink">
          Mission &amp; Vision
        </h2>
        <span className="h-px flex-1 bg-linear-to-r from-sol-champagne/40 to-transparent" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {PANELS.map((panel, i) => (
          <motion.div
            key={panel.eyebrow}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "200px" }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[24px] border border-sol-border bg-sol-surface px-8 py-12 lg:px-10 lg:py-14"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 font-display text-[9rem] font-bold leading-none text-sol-ivory"
            >
              S
            </span>
            <span className="relative flex size-12 items-center justify-center rounded-full border border-sol-champagne/25 bg-sol-page">
              <panel.icon className="size-5 text-sol-champagne-deep" aria-hidden="true" />
            </span>
            <p className="relative mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
              {panel.eyebrow}
            </p>
            <p className="relative mt-4 font-display text-[1.5rem] font-medium leading-[1.35] text-sol-ink lg:text-[1.65rem]">
              {panel.statement}
            </p>
            <p className="relative mt-5 text-[0.92rem] leading-[1.9] text-sol-secondary">
              {panel.body}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
