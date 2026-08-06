import { motion } from "motion/react";
import {
  ArrowRight,
  Banknote,
  Compass,
  Gauge,
  Heart,
  MapPin,
  Sparkles,
  UserRound,
  Wand2,
} from "lucide-react";

const INPUTS = [
  { icon: UserRound, label: "User Profile" },
  { icon: Compass, label: "Skills" },
  { icon: MapPin, label: "Location" },
  { icon: Banknote, label: "Financial Capacity" },
  { icon: Gauge, label: "Risk Appetite" },
  { icon: Heart, label: "Interests" },
];

export function AIDiscoveryFlow() {
  return (
    <section className="w-full px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex items-center gap-6">
          <Wand2 className="size-5 text-accent" aria-hidden="true" />
          <h2 className="shrink-0 text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold tracking-[-0.01em] text-primary">
            What Happens When You Click &ldquo;Find Your Business Idea&rdquo;
          </h2>
          <span className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
        </div>
        <p className="mt-4 max-w-[62ch] text-[0.95rem] leading-[1.9] text-muted-foreground">
          Six real inputs, one AI analysis, two outputs you can act on. No guessing.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "200px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr]"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {INPUTS.map((input, i) => (
              <motion.div
                key={input.label}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "200px" }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card px-3.5 py-3"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent">
                  <input.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-[0.82rem] font-semibold text-primary">{input.label}</span>
              </motion.div>
            ))}
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
            className="relative mx-auto flex aspect-square w-full max-w-[180px] flex-col items-center justify-center rounded-full border border-accent/30 bg-primary text-center shadow-[0_30px_60px_-30px_oklch(0.245_0.055_268_/_0.6)]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-3 rounded-full border border-accent/20"
            />
            <Sparkles className="size-7 text-accent" aria-hidden="true" />
            <p className="mt-2 px-4 text-[0.85rem] font-bold leading-tight text-primary-foreground">
              AI Analysis
            </p>
          </motion.div>

          <ArrowRight
            className="mx-auto hidden size-6 shrink-0 text-accent/50 lg:block"
            aria-hidden="true"
          />

          <div className="flex flex-col gap-3">
            {[
              { icon: Compass, label: "Business Recommendations" },
              { icon: MapPin, label: "Execution Roadmap" },
            ].map((output, i) => (
              <motion.div
                key={output.label}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "200px" }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3.5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent">
                  <output.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-[0.85rem] font-bold text-primary">{output.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
