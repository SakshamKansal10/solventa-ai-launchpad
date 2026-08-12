import { motion } from "motion/react";
import { ArrowRight, Banknote, Clock, MapPin, Palette, Sparkles, UserRound } from "lucide-react";

const STARTING_POINT = [
  { icon: UserRound, label: "Age", value: "19" },
  { icon: MapPin, label: "Location", value: "Chandigarh" },
  { icon: Banknote, label: "Budget", value: "₹25,000" },
  { icon: Clock, label: "Time", value: "10 hrs/week" },
  { icon: Palette, label: "Strengths", value: "Design + Communication" },
];

const OPPORTUNITIES = [
  {
    rank: "01",
    name: "Social Media Design for Local Businesses",
    fit: 92,
  },
  {
    rank: "02",
    name: "Freelance Brand Identity Packages",
    fit: 87,
  },
  {
    rank: "03",
    name: "Print-on-Demand Poster Shop",
    fit: 79,
  },
];

export function AIDiscoveryFlow() {
  return (
    <section className="w-full px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex items-center gap-6">
          <Sparkles className="size-5 text-accent" aria-hidden="true" />
          <h2 className="shrink-0 text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold tracking-[-0.01em] text-primary">
            See It In Action
          </h2>
          <span className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
        </div>
        <p className="mt-4 max-w-[62ch] text-[0.95rem] leading-[1.9] text-muted-foreground">
          <span className="font-semibold text-primary">Example.</span> Here&rsquo;s what a
          consultation produces for one kind of founder — yours will be built entirely around your
          own answers.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "200px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1.1fr]"
        >
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Starting Point
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {STARTING_POINT.map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "200px" }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-2.5"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent">
                    <row.icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="text-[0.8rem] text-muted-foreground">{row.label}</span>
                  <span className="ml-auto text-[0.82rem] font-semibold text-primary">
                    {row.value}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <ArrowRight
            className="mx-auto hidden size-6 shrink-0 text-accent/50 lg:block"
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "200px" }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto flex aspect-square w-full max-w-[160px] flex-col items-center justify-center rounded-full border border-accent/30 bg-primary text-center shadow-[0_30px_60px_-30px_oklch(0.245_0.055_268_/_0.6)]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-3 rounded-full border border-accent/20"
            />
            <Sparkles className="size-7 text-accent" aria-hidden="true" />
            <p className="mt-2 px-4 text-[0.82rem] font-bold leading-tight text-primary-foreground">
              Solventia Analyzes
            </p>
          </motion.div>

          <ArrowRight
            className="mx-auto hidden size-6 shrink-0 text-accent/50 lg:block"
            aria-hidden="true"
          />

          <div className="flex flex-col gap-3">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              3 High-Fit Opportunities
            </p>
            {OPPORTUNITIES.map((opp, i) => (
              <motion.div
                key={opp.name}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "200px" }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[0.72rem] font-bold text-accent">{opp.rank}</span>
                  <span className="flex-1 text-[0.85rem] font-bold leading-tight text-primary">
                    {opp.name}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent/15">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${opp.fit}%` }}
                    />
                  </div>
                  <span className="text-[0.75rem] font-bold text-accent">{opp.fit}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
