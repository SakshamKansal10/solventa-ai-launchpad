import { motion } from "motion/react";
import { ArrowRight, Lightbulb, Play, Sparkles, Heart } from "lucide-react";
import doorway from "@/assets/doorway.png";
import avatars from "@/assets/avatars.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

function Avatar({ index, alt }: { index: number; alt: string }) {
  return (
    <span className="relative -ml-4 size-14 overflow-hidden rounded-full border-[3px] border-background bg-secondary first:ml-0">
      <img
        src={avatars}
        alt={alt}
        width={1536}
        height={512}
        loading="lazy"
        className="absolute left-0 top-0 h-full max-w-none"
        style={{ width: "300%", transform: `translateX(-${index * 33.333}%)` }}
      />
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-40 pb-16 lg:pt-48">
      <div className="ambient-purple" aria-hidden="true" />

      <div className="mx-auto grid max-w-[1320px] items-center gap-16 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:px-10">
        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.12, delayChildren: 0.05 }}
          className="relative z-10"
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="eyebrow flex items-center gap-2 text-accent"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            AI-Powered Entrepreneur Companion
          </motion.p>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 text-[clamp(2.9rem,6vw,4.6rem)] font-semibold leading-[1.06] tracking-[-0.02em] text-primary"
          >
            Your Dream.
            <br />
            Our Intelligence.
            <br />
            <span className="relative inline-block">
              <span className="font-script text-[1.12em] font-bold italic text-accent">
                Real Impact.
              </span>
              <svg
                viewBox="0 0 320 16"
                className="absolute -bottom-1 left-0 h-3 w-full text-accent"
                fill="none"
                aria-hidden="true"
              >
                <motion.path
                  d="M4 11C70 3 200 2 316 8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, delay: 0.8, ease: "easeInOut" }}
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 max-w-[34ch] text-[1.02rem] leading-[2] text-muted-foreground"
          >
            Solventia helps young dreamers discover real opportunities, validate them with data,
            and build step-by-step roadmaps to create meaningful impact.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-11 flex flex-wrap items-center gap-4"
          >
            <motion.a
              href="#"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="group flex items-center gap-3 rounded-xl bg-primary px-8 py-5 text-[0.95rem] font-semibold text-primary-foreground shadow-[0_18px_40px_-18px_oklch(0.245_0.055_268_/_0.75)]"
            >
              <Lightbulb className="size-5 text-accent" aria-hidden="true" />
              Find Your Business Idea
              <ArrowRight className="size-4 text-accent transition-transform duration-300 group-hover:translate-x-1.5" />
            </motion.a>

            <motion.a
              href="#how-it-works"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-8 py-5 text-[0.95rem] font-semibold text-primary transition-colors hover:border-primary/25"
            >
              See How It Works
              <span className="flex size-7 items-center justify-center rounded-full bg-primary">
                <Play className="size-3 fill-current text-primary-foreground" aria-hidden="true" />
              </span>
            </motion.a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-14 flex items-center gap-6"
          >
            <div className="flex">
              <Avatar index={0} alt="Solventia community member" />
              <Avatar index={1} alt="Solventia community member" />
              <Avatar index={2} alt="Solventia community member" />
            </div>
            <p className="max-w-[30ch] text-[0.92rem] leading-[1.8] text-muted-foreground">
              Trusted by 10,000+ young dreamers, mentors &amp; NGOs across India{" "}
              <Heart className="inline size-4 -translate-y-px fill-accent text-accent" aria-hidden="true" />
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative lg:translate-x-8"
        >
          <img
            src={doorway}
            alt="A young dreamer standing before an open archway looking out at a sunrise over mountains"
            width={1104}
            height={1104}
            fetchPriority="high"
            className="mx-auto w-full max-w-[560px] mix-blend-multiply"
          />
        </motion.div>
      </div>
    </section>
  );
}
