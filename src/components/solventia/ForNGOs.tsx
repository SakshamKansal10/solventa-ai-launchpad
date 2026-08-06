import { motion } from "motion/react";
import { toast } from "sonner";
import { Check, HandHeart, LineChart, Puzzle, Users2 } from "lucide-react";
import { PremiumButton } from "./PremiumButton";

const BENEFITS = [
  {
    icon: Users2,
    text: "Refer the youth you work with into a structured, validated pathway",
  },
  {
    icon: LineChart,
    text: "Track collective outcomes and impact across your community",
  },
  {
    icon: Puzzle,
    text: "Co-brand roadmaps tailored to your region, sector, or program",
  },
  {
    icon: HandHeart,
    text: "Tap into Solventia's mentor network for your participants",
  },
];

export function ForNGOs() {
  return (
    <section id="for-ngos" className="mx-auto max-w-[1320px] scroll-mt-24 px-6 py-16 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "200px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 shadow-[0_30px_80px_-50px_oklch(0.245_0.055_268_/_0.7)] lg:px-16 lg:py-16"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 font-display text-[11rem] font-bold leading-none text-primary-foreground/[0.05]"
        >
          S
        </span>

        <div className="relative grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <p className="eyebrow text-accent">For NGOs &amp; Mentor Organizations</p>
            <h2 className="mt-4 text-[clamp(1.6rem,3vw,2.2rem)] font-semibold leading-[1.2] tracking-[-0.01em] text-primary-foreground">
              Multiply your impact through the young dreamers you already serve.
            </h2>
            <p className="mt-5 max-w-[52ch] text-[0.95rem] leading-[1.9] text-primary-foreground/75">
              Solventia works alongside NGOs and mentor networks, not around them — giving the
              people you support a structured path from idea to validated venture, backed by data
              you can both see.
            </p>
            <PremiumButton
              type="button"
              tone="solid"
              shape="rounded"
              size="lg"
              className="mt-9 bg-accent text-primary shadow-[0_18px_40px_-18px_oklch(0.245_0.055_268_/_0.6)] hover:bg-accent"
              onClick={() =>
                toast("Partnership inquiries aren't connected yet", {
                  description:
                    "This will route to our partnerships team soon — check back shortly.",
                })
              }
            >
              Partner With Us
            </PremiumButton>
          </div>

          <ul className="flex flex-col gap-5">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit.text}
                className="flex items-start gap-4 rounded-2xl border border-primary-foreground/10 bg-primary-foreground/[0.04] px-5 py-4"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15">
                  <benefit.icon className="size-4 text-accent" aria-hidden="true" />
                </span>
                <span className="pt-1 text-[0.88rem] leading-[1.7] text-primary-foreground/85">
                  {benefit.text}
                </span>
                <Check
                  className="ml-auto mt-1.5 size-4 shrink-0 text-accent/70"
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </section>
  );
}
