import { motion } from "motion/react";
import { PenLine, User } from "lucide-react";

/**
 * DRAFT CONTENT: every milestone body below is a fill-in-the-blank placeholder,
 * not a real biography. Replace with the actual founder's name, photo, and
 * story before shipping — see the on-page draft notice.
 */
const MILESTONES = [
  {
    year: "[Year]",
    title: "The Spark",
    body: "[Draft — describe the problem or moment that led to starting Solventia.]",
  },
  {
    year: "[Year]",
    title: "First Prototype",
    body: "[Draft — describe the earliest version and what it validated.]",
  },
  {
    year: "[Year]",
    title: "First Believers",
    body: "[Draft — name the early users, mentors, or partners who backed the idea.]",
  },
  {
    year: "[Year]",
    title: "Solventia Launches",
    body: "[Draft — describe the decision to build this for young dreamers, at scale.]",
  },
];

export function FoundersStory() {
  return (
    <section className="mx-auto max-w-[1320px] px-6 py-16 lg:px-10">
      <div className="flex items-center gap-6">
        <User className="size-5 text-accent" aria-hidden="true" />
        <h2 className="shrink-0 text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold tracking-[-0.01em] text-primary">
          Founder&rsquo;s Story
        </h2>
        <span className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-dashed border-accent/40 bg-accent/[0.06] px-5 py-4">
        <PenLine className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-[0.84rem] leading-[1.7] text-muted-foreground">
          <span className="font-semibold text-primary">Draft placeholder.</span> The timeline below
          is structural only — every milestone needs the real founder&rsquo;s name, photo, and story
          before this section goes live.
        </p>
      </div>

      <div className="mt-12 flex flex-col gap-10 lg:flex-row lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "200px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex shrink-0 flex-col items-center text-center lg:w-56"
        >
          <span className="flex size-28 items-center justify-center rounded-full border-2 border-dashed border-accent/40 bg-secondary/60 text-muted-foreground">
            <User className="size-10 stroke-[1.4]" aria-hidden="true" />
          </span>
          <p className="mt-4 text-[0.9rem] font-semibold text-primary">[Draft — Founder Name]</p>
          <p className="mt-1 text-[0.8rem] text-muted-foreground">[Draft — Title, Solventia]</p>
        </motion.div>

        <ol className="relative flex-1 border-l border-border/70 pl-8">
          {MILESTONES.map((milestone, i) => (
            <motion.li
              key={milestone.title}
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "200px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative pb-10 last:pb-0"
            >
              <span className="absolute -left-[2.35rem] top-1 flex size-4 items-center justify-center rounded-full border-2 border-accent bg-card" />
              <p className="eyebrow text-accent">{milestone.year}</p>
              <h3 className="mt-2 font-sans text-[1rem] font-bold text-primary">
                {milestone.title}
              </h3>
              <p className="mt-2 max-w-[56ch] text-[0.88rem] leading-[1.8] text-muted-foreground">
                {milestone.body}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
