import { motion } from "motion/react";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  HeartPulse,
  Landmark,
  Leaf,
  Map,
  Sprout,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ROADMAPS = [
  {
    icon: Landmark,
    title: "FinTech",
    summary: "Payments, lending & financial access ventures.",
    stages: [
      "Market & regulation scan",
      "Define your core financial product",
      "Compliance & licensing roadmap",
      "Build an MVP with a payments partner",
      "Pilot with a closed user group",
      "Scale & apply for funding",
    ],
  },
  {
    icon: GraduationCap,
    title: "EdTech",
    summary: "Learning tools for students, teachers & schools.",
    stages: [
      "Identify the learning gap you're solving",
      "Validate with students, parents & educators",
      "Design your curriculum or platform MVP",
      "Pilot in one school or community",
      "Gather outcome data",
      "Scale to new regions or age groups",
    ],
  },
  {
    icon: HeartPulse,
    title: "HealthTech",
    summary: "Clinical, wellness & care-access ventures.",
    stages: [
      "Define the clinical or wellness problem",
      "Validate with healthcare professionals",
      "Navigate data privacy & compliance",
      "Build & test your MVP",
      "Run a supervised pilot",
      "Scale with provider partnerships",
    ],
  },
  {
    icon: Leaf,
    title: "Clean Energy",
    summary: "Renewable, efficiency & climate ventures.",
    stages: [
      "Assess local energy & resource needs",
      "Validate the economics of your solution",
      "Secure early pilot partners",
      "Build your first deployment",
      "Measure real-world impact",
      "Scale with impact investors",
    ],
  },
  {
    icon: Sprout,
    title: "AgriTech",
    summary: "Tools for farmers, supply chains & food systems.",
    stages: [
      "Understand the farmer's real workflow",
      "Validate willingness to pay",
      "Build a field-tested MVP",
      "Pilot with a farmer cohort",
      "Refine based on harvest data",
      "Scale through cooperatives & NGOs",
    ],
  },
  {
    icon: Building2,
    title: "Smart Cities",
    summary: "Civic, mobility & infrastructure ventures.",
    stages: [
      "Map the civic problem & stakeholders",
      "Validate with local government & community",
      "Design a pilot-ready MVP",
      "Run a neighborhood pilot",
      "Measure adoption & impact",
      "Scale to city-wide deployment",
    ],
  },
];

export function RoadmapsPreview() {
  return (
    <section id="roadmaps" className="mx-auto max-w-[1320px] scroll-mt-24 px-6 py-16 lg:px-10">
      <div className="flex items-center gap-6">
        <Map className="size-5 text-accent" aria-hidden="true" />
        <h2 className="shrink-0 text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold tracking-[-0.01em] text-primary">
          Roadmaps for Every Domain
        </h2>
        <span className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
      </div>
      <p className="mt-4 max-w-[62ch] text-[0.95rem] leading-[1.9] text-muted-foreground">
        Every roadmap is a structured, stage-by-stage plan — not generic advice. Preview a sample
        below.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ROADMAPS.map((roadmap, i) => (
          <RoadmapCard key={roadmap.title} roadmap={roadmap} index={i} />
        ))}
      </div>
    </section>
  );
}

function RoadmapCard({ roadmap, index }: { roadmap: (typeof ROADMAPS)[number]; index: number }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "200px" }}
          transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -5 }}
          className="group flex flex-col rounded-2xl border border-border/70 bg-card p-7 text-left shadow-[0_10px_30px_-26px_oklch(0.245_0.055_268_/_0.6)] transition-shadow duration-300 hover:shadow-[0_34px_60px_-38px_oklch(0.245_0.055_268_/_0.55)]"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 transition-transform duration-300 group-hover:scale-110">
            <roadmap.icon className="size-5 stroke-[1.6] text-accent" aria-hidden="true" />
          </span>
          <h3 className="mt-6 font-sans text-[0.98rem] font-bold text-primary">
            {roadmap.title} Roadmap
          </h3>
          <p className="mt-3 text-[0.88rem] leading-[1.8] text-muted-foreground">
            {roadmap.summary}
          </p>
          <div className="mt-7 flex items-center justify-between">
            <span className="text-[0.8rem] font-semibold text-accent">
              {roadmap.stages.length} stages
            </span>
            <span className="flex size-9 items-center justify-center rounded-full border border-border text-primary transition-colors duration-300 group-hover:border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground">
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          </div>
        </motion.button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl border-border/70 bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-display text-2xl text-primary">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/12">
              <roadmap.icon className="size-5 text-accent" aria-hidden="true" />
            </span>
            {roadmap.title} Roadmap
          </DialogTitle>
          <DialogDescription>{roadmap.summary}</DialogDescription>
        </DialogHeader>
        <ol className="mt-2 flex flex-col gap-4">
          {roadmap.stages.map((stage, i) => (
            <li key={stage} className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[0.7rem] font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5 text-[0.9rem] leading-[1.6] text-foreground">{stage}</span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
