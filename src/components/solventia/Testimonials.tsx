import { motion } from "motion/react";
import { PenLine, Quote, UserRound } from "lucide-react";

/**
 * DRAFT CONTENT: these are structural placeholders, not real quotes.
 * Replace with actual testimonials before shipping — see the draft notice.
 */
const TESTIMONIALS = [
  {
    name: "[Draft — Name]",
    role: "[Draft — Founder, venture name]",
    quote: "[Draft — replace with a real quote about the idea-discovery experience.]",
  },
  {
    name: "[Draft — Name]",
    role: "[Draft — Mentor, program name]",
    quote: "[Draft — replace with a real quote about mentoring through Solventia.]",
  },
  {
    name: "[Draft — Name]",
    role: "[Draft — Program Lead, NGO name]",
    quote: "[Draft — replace with a real quote about the NGO partnership experience.]",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-[1320px] px-6 py-16 lg:px-10">
      <div className="flex items-center gap-6">
        <Quote className="size-5 text-accent" aria-hidden="true" />
        <h2 className="shrink-0 text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold tracking-[-0.01em] text-primary">
          What People Are Saying
        </h2>
        <span className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-dashed border-accent/40 bg-accent/[0.06] px-5 py-4">
        <PenLine className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-[0.84rem] leading-[1.7] text-muted-foreground">
          <span className="font-semibold text-primary">Draft placeholder.</span> These cards are
          structural only — swap in real names, roles, and quotes before this section goes live.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <motion.figure
            key={t.name + i}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "200px" }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -5 }}
            className="flex flex-col rounded-2xl border border-border/70 bg-card p-7 shadow-[0_10px_30px_-26px_oklch(0.245_0.055_268_/_0.6)] transition-shadow duration-300 hover:shadow-[0_34px_60px_-38px_oklch(0.245_0.055_268_/_0.55)]"
          >
            <Quote className="size-6 text-accent/50" aria-hidden="true" />
            <blockquote className="mt-4 flex-1 text-[0.92rem] italic leading-[1.9] text-muted-foreground">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-accent/40 bg-secondary/60 text-muted-foreground">
                <UserRound className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[0.88rem] font-semibold text-primary">{t.name}</span>
                <span className="block text-[0.78rem] text-muted-foreground">{t.role}</span>
              </span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
