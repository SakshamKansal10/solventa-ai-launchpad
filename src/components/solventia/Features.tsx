import { motion } from "motion/react";
import { ArrowRight, Lightbulb, BarChart3, Map, Users, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: Lightbulb,
    title: ["AI-Powered", "Idea Discovery"],
    body: "Discover high-potential ideas tailored to your goals and strengths.",
  },
  {
    icon: BarChart3,
    title: ["Data-Backed", "Validation"],
    body: "Validate ideas with real data, trends, and market insights.",
  },
  {
    icon: Map,
    title: ["Step-by-Step", "Roadmaps"],
    body: "Get clear, actionable roadmaps to build and grow with confidence.",
  },
  {
    icon: Users,
    title: ["Mentor & NGO", "Connections"],
    body: "Connect with mentors and NGOs to accelerate your impact.",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-[1320px] px-6 py-16 lg:px-10">
      <div className="flex items-center gap-6">
        <Sparkles className="size-5 text-accent" aria-hidden="true" />
        <h2 className="shrink-0 text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold tracking-[-0.01em] text-primary">
          What You Get with Solventia
        </h2>
        <span className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
        <Sparkles className="hidden size-4 text-accent md:block" aria-hidden="true" />
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <motion.article
            key={f.title.join(" ")}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "200px" }}
            transition={{ duration: 0.6, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -5, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
            className="group flex flex-col rounded-2xl border border-border/70 bg-card p-7 shadow-[0_10px_30px_-26px_oklch(0.245_0.055_268_/_0.6)] transition-shadow duration-300 hover:shadow-[0_34px_60px_-38px_oklch(0.245_0.055_268_/_0.55)]"
          >
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 transition-transform duration-300 group-hover:scale-110">
                <f.icon className="size-5 stroke-[1.6] text-accent" aria-hidden="true" />
              </span>
              <h3 className="font-sans text-[0.98rem] font-bold leading-[1.5] text-primary">
                {f.title[0]}
                <br />
                {f.title[1]}
              </h3>
            </div>

            <p className="mt-6 text-[0.88rem] leading-[1.9] text-muted-foreground">{f.body}</p>

            <div className="mt-8 flex items-end justify-between">
              <svg
                viewBox="0 0 140 60"
                className="h-14 w-28 text-primary/20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 52C30 52 40 20 70 22s40 20 66 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="34" cy="38" r="3.5" fill="currentColor" />
                <circle cx="70" cy="22" r="3.5" className="fill-accent" />
                <circle cx="112" cy="30" r="3.5" fill="currentColor" />
              </svg>
              <span className="flex size-9 items-center justify-center rounded-full border border-border text-primary transition-colors duration-300 group-hover:border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground">
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
