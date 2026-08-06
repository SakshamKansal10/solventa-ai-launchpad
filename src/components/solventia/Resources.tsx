import { motion } from "motion/react";
import { toast } from "sonner";
import { BookOpen, FlaskConical, LineChart, Sparkles, Users } from "lucide-react";

const RESOURCES = [
  {
    icon: BookOpen,
    title: "Guides",
    body: "Step-by-step playbooks for common business models and first launches.",
  },
  {
    icon: Users,
    title: "Entrepreneur Stories",
    body: "Real journeys from founders who started exactly where you are now.",
  },
  {
    icon: FlaskConical,
    title: "AI Tools",
    body: "Quick tools to stress-test an idea or check demand before you commit.",
  },
  {
    icon: LineChart,
    title: "Research",
    body: "Market data and trends behind the industries Solventia covers.",
  },
];

export function Resources() {
  return (
    <section id="resources" className="w-full scroll-mt-24 px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex items-center gap-6">
          <Sparkles className="size-5 text-accent" aria-hidden="true" />
          <h2 className="shrink-0 text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold tracking-[-0.01em] text-primary">
            Resources
          </h2>
          <span className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
        </div>
        <p className="mt-4 max-w-[62ch] text-[0.95rem] leading-[1.9] text-muted-foreground">
          A growing library to help you think, plan, and validate — even before you start a
          consultation.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {RESOURCES.map((r, i) => (
            <motion.button
              key={r.title}
              type="button"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "200px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -5 }}
              onClick={() =>
                toast(`${r.title} — coming soon`, {
                  description: "This resource hub is still being built.",
                })
              }
              className="group flex flex-col rounded-2xl border border-border/70 bg-card p-7 text-left shadow-[0_10px_30px_-26px_oklch(0.245_0.055_268_/_0.6)] transition-shadow duration-300 hover:shadow-[0_34px_60px_-38px_oklch(0.245_0.055_268_/_0.55)]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 transition-transform duration-300 group-hover:scale-110">
                <r.icon className="size-5 stroke-[1.6] text-accent" aria-hidden="true" />
              </span>
              <h3 className="mt-6 font-sans text-[0.98rem] font-bold text-primary">{r.title}</h3>
              <p className="mt-3 text-[0.88rem] leading-[1.8] text-muted-foreground">{r.body}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
