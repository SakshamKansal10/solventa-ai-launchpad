import { motion } from "motion/react";
import { User } from "lucide-react";

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

      <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "200px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex shrink-0 flex-col items-center text-center lg:w-56"
        >
          <span className="flex size-28 items-center justify-center rounded-full border-2 border-accent/30 bg-secondary/60 text-muted-foreground">
            <User className="size-10 stroke-[1.4]" aria-hidden="true" />
          </span>
          <p className="mt-4 text-[0.9rem] font-semibold text-primary">Saksham Kansal</p>
          <p className="mt-1 text-[0.8rem] text-muted-foreground">Founder, Solventia</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "200px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[56ch] text-[0.98rem] leading-[1.9] text-muted-foreground"
        >
          Most business advice assumes you already have money, connections, or experience. Solventia
          started from a simpler premise: a young person with real curiosity and no starting capital
          deserves a serious, structured path forward — not a generic list of ideas. That&rsquo;s
          the standard every part of this product is built against.
        </motion.p>
      </div>
    </section>
  );
}
