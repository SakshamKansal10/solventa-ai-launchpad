import { motion } from "motion/react";
import { ArrowRight, Clock, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { useOnboarding } from "@/lib/onboarding-store";
import type { SectionIntroStep } from "@/lib/onboarding-steps";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function AIOrb() {
  return (
    <div className="relative flex size-24 items-center justify-center">
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-accent/20 blur-xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        aria-hidden="true"
        className="absolute inset-2 rounded-full border border-accent/40"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[oklch(0.606_0.219_292.7)] shadow-[0_0_40px_-4px_oklch(0.745_0.132_72_/_0.7)]">
        <Sparkles className="size-6 text-primary" aria-hidden="true" />
      </span>
    </div>
  );
}

export function WelcomeScreen() {
  const { goNext, hasSavedProgress, resumeSaved, discardSaved } = useOnboarding();

  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.1 }}
      className="mx-auto flex max-w-[560px] flex-col items-center text-center"
    >
      <motion.p variants={fadeUp} className="eyebrow flex items-center gap-2 text-accent">
        <Sparkles className="size-3.5" aria-hidden="true" />
        Solventia Consultation
      </motion.p>
      <motion.h1
        variants={fadeUp}
        className="mt-6 font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.15] text-primary"
      >
        Let&rsquo;s Build Your Entrepreneurial Journey.
      </motion.h1>
      <motion.p
        variants={fadeUp}
        className="mt-6 text-[1.02rem] leading-[1.9] text-muted-foreground"
      >
        Over the next few minutes, I&rsquo;ll understand your ambitions, strengths, resources, and
        circumstances before recommending a business that genuinely fits you.
      </motion.p>
      <motion.p variants={fadeUp} className="mt-3 text-[1.02rem] font-semibold text-primary">
        This isn&rsquo;t a quiz. It&rsquo;s a personalized strategy consultation.
      </motion.p>

      <motion.div
        variants={fadeUp}
        className="mt-8 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[0.85rem] text-muted-foreground shadow-sm"
      >
        <Clock className="size-4 text-accent" aria-hidden="true" />
        Estimated time: 8–10 minutes
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center gap-3">
        <PremiumButton type="button" tone="solid" shape="rounded" size="lg" onClick={goNext}>
          Begin My Consultation
          <ArrowRight className="size-4 text-accent" aria-hidden="true" />
        </PremiumButton>

        {hasSavedProgress && (
          <div className="mt-2 flex items-center gap-3 text-[0.85rem]">
            <button
              type="button"
              onClick={resumeSaved}
              className="flex items-center gap-1.5 font-semibold text-accent hover:underline"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Resume saved progress
            </button>
            <span className="text-border">·</span>
            <button
              type="button"
              onClick={discardSaved}
              className="text-muted-foreground hover:text-primary"
            >
              Start fresh
            </button>
          </div>
        )}

        <Link to="/" className="mt-4 text-[0.82rem] text-muted-foreground/70 hover:text-primary">
          Not now — back to homepage
        </Link>
      </motion.div>
    </motion.div>
  );
}

export function AIIntroScreen() {
  const { goNext } = useOnboarding();
  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.12 }}
      className="mx-auto flex max-w-[520px] flex-col items-center text-center"
    >
      <motion.div variants={fadeUp}>
        <AIOrb />
      </motion.div>
      <motion.p variants={fadeUp} className="mt-8 text-[1.1rem] leading-[1.9] text-foreground">
        Hello. I&rsquo;m <span className="font-semibold text-accent">Sol</span>.
      </motion.p>
      <motion.p
        variants={fadeUp}
        className="mt-4 text-[1.02rem] leading-[1.9] text-muted-foreground"
      >
        My role isn&rsquo;t simply to recommend business ideas. My responsibility is to understand
        you first, eliminate unsuitable opportunities, and design a realistic roadmap you can
        actually follow.
      </motion.p>
      <motion.p
        variants={fadeUp}
        className="mt-4 text-[1.02rem] leading-[1.9] text-muted-foreground"
      >
        Every answer helps me understand your entrepreneurial profile.
      </motion.p>
      <motion.div variants={fadeUp} className="mt-10">
        <PremiumButton type="button" tone="solid" shape="rounded" size="lg" onClick={goNext}>
          Let&rsquo;s Begin
          <ArrowRight className="size-4 text-accent" aria-hidden="true" />
        </PremiumButton>
      </motion.div>
    </motion.div>
  );
}

export function SectionIntroScreen({ step }: { step: SectionIntroStep }) {
  const { goNext } = useOnboarding();
  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.1 }}
      className="mx-auto flex max-w-[520px] flex-col items-center text-center"
    >
      <motion.p variants={fadeUp} className="eyebrow text-accent">
        Section {step.section} of 7
      </motion.p>
      <motion.h2
        variants={fadeUp}
        className="mt-4 font-display text-[clamp(1.8rem,3.5vw,2.4rem)] font-semibold text-primary"
      >
        {step.title}
      </motion.h2>
      <motion.p
        variants={fadeUp}
        className="mt-5 text-[1.02rem] leading-[1.9] text-muted-foreground"
      >
        {step.body}
      </motion.p>
      <motion.div variants={fadeUp} className="mt-9">
        <PremiumButton type="button" tone="solid" shape="rounded" size="lg" onClick={goNext}>
          Continue
          <ArrowRight className="size-4 text-accent" aria-hidden="true" />
        </PremiumButton>
      </motion.div>
    </motion.div>
  );
}

export function CompletionScreen() {
  const { answers, restart } = useOnboarding();

  const summaryLines = [
    answers.currentStatus && `You're currently a ${answers.currentStatus}.`,
    answers.skills?.length &&
      `You bring ${answers.skills.length} identified skill${answers.skills.length > 1 ? "s" : ""} to the table.`,
    answers.investmentBudget && `Starting point: ${answers.investmentBudget}.`,
    answers.timeline && `Target timeline: ${answers.timeline}.`,
  ].filter(Boolean) as string[];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.1 }}
      className="mx-auto flex max-w-[560px] flex-col items-center text-center"
    >
      <motion.div variants={fadeUp}>
        <AIOrb />
      </motion.div>
      <motion.h2
        variants={fadeUp}
        className="mt-8 font-display text-[clamp(1.8rem,3.5vw,2.4rem)] font-semibold text-primary"
      >
        Your Founder Profile is complete.
      </motion.h2>

      {summaryLines.length > 0 && (
        <motion.ul variants={fadeUp} className="mt-6 flex flex-col gap-2 text-left">
          {summaryLines.map((line) => (
            <li key={line} className="text-[0.95rem] text-foreground">
              {line}
            </li>
          ))}
        </motion.ul>
      )}

      <motion.p variants={fadeUp} className="mt-6 text-[1rem] leading-[1.9] text-muted-foreground">
        Solventia&rsquo;s recommendation engine is the next piece being built — your personalized
        business ideas and roadmap will land here once it&rsquo;s ready. Nothing fabricated in the
        meantime.
      </motion.p>

      <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <PremiumButton tone="solid" shape="rounded" size="lg" href="/">
          Back to Homepage
        </PremiumButton>
        <button
          type="button"
          onClick={restart}
          className="text-[0.85rem] font-medium text-muted-foreground hover:text-primary"
        >
          Start over
        </button>
      </motion.div>
    </motion.div>
  );
}
