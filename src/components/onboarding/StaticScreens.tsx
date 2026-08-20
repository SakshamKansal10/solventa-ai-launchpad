import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check, Clock, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { useOnboarding } from "@/lib/onboarding-store";
import type { SectionIntroStep } from "@/lib/onboarding-steps";
import { getStageTheme } from "@/lib/onboarding-themes";
import { StageIllustration } from "@/components/onboarding/StageIllustration";
import { AccountGate } from "@/components/onboarding/AccountGate";
import { getCurrentUser } from "@/lib/actions/auth";
import { completeConsultation } from "@/lib/actions/profile";
import { STAGE_THEMES } from "@/lib/onboarding-themes";

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
  const theme = getStageTheme(step.section);
  const Icon = theme.icon;
  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.1 }}
      className="mx-auto flex max-w-[520px] flex-col items-center text-center"
    >
      <motion.div variants={fadeUp}>
        <StageIllustration section={step.section} color={theme.color} />
      </motion.div>
      <motion.div variants={fadeUp} className="mt-6 flex items-center gap-2">
        <Icon className="size-4" style={{ color: theme.color }} aria-hidden="true" />
        <p className="eyebrow" style={{ color: theme.color }}>
          {theme.feeling}
        </p>
      </motion.div>
      <motion.h2
        variants={fadeUp}
        className="mt-4 font-display text-[clamp(1.8rem,3.5vw,2.4rem)] font-semibold text-primary"
      >
        {step.title}
      </motion.h2>
      <motion.p variants={fadeUp} className="mt-5 text-[1.05rem] font-semibold text-primary">
        {theme.opener}
      </motion.p>
      <motion.p
        variants={fadeUp}
        className="mt-3 text-[1.02rem] leading-[1.9] text-muted-foreground"
      >
        {step.body}
      </motion.p>
      <motion.div variants={fadeUp} className="mt-9">
        <PremiumButton type="button" tone="solid" shape="rounded" size="lg" onClick={goNext}>
          Continue
          <ArrowRight className="size-4 text-accent" aria-hidden="true" />
        </PremiumButton>
      </motion.div>
      <motion.p variants={fadeUp} className="mt-8 text-[0.72rem] text-muted-foreground/50">
        Section {step.section} of 7
      </motion.p>
    </motion.div>
  );
}

type SubmitPhase =
  "idle" | "converging" | "building" | "matching" | "roadmapping" | "done" | "error";

const STAGE_ORDER = [1, 2, 3, 4, 5, 6, 7];

/** The seven-signal convergence — purely a visual transition, never gates
 * real work: saveOnboarding is already in flight underneath it (see
 * runSubmission), so this doesn't add wall-clock time on top of the real
 * ~20s wait, it just gives the first second of it real meaning instead of
 * a blank screen. */
function SignalConvergence() {
  return (
    <motion.div
      key="converging"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mt-8 flex flex-col items-center gap-6"
    >
      <div className="flex flex-wrap items-center justify-center gap-3">
        {STAGE_ORDER.map((section, i) => {
          const theme = STAGE_THEMES[section];
          const Icon = theme.icon;
          return (
            <motion.span
              key={section}
              initial={{ opacity: 0, scale: 0.4, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.09, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex size-10 items-center justify-center rounded-full border"
              style={{ borderColor: theme.color, backgroundColor: theme.colorSoft }}
            >
              <Icon className="size-4" style={{ color: theme.color }} aria-hidden="true" />
            </motion.span>
          );
        })}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75, duration: 0.4 }}
        className="text-[0.88rem] text-muted-foreground"
      >
        Bringing everything together…
      </motion.p>
    </motion.div>
  );
}

/** Purely cosmetic phase labels cycled while the ONE real request is in
 * flight (see runSubmission) — Solventia makes exactly one Gemini call
 * here, never three. The cycle never blocks or pads completion: it's
 * cancelled and jumps straight to "done" the instant the real request
 * resolves, whether that's in 6 seconds or 40. */
const SYNTHESIS_STEPS: { phase: SubmitPhase; label: string }[] = [
  { phase: "building", label: "Understanding your profile" },
  { phase: "matching", label: "Finding opportunities that fit" },
  { phase: "roadmapping", label: "Building your execution roadmap" },
];
const SYNTHESIS_CYCLE: SubmitPhase[] = ["building", "matching", "roadmapping"];

export function CompletionScreen() {
  const { answers, restart } = useOnboarding();
  const navigate = useNavigate();
  const currentUser = useQuery({ queryKey: ["current-user"], queryFn: () => getCurrentUser() });

  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const summaryLines = [
    answers.currentStatus && `You're currently a ${answers.currentStatus}.`,
    answers.skills?.length &&
      `You bring ${answers.skills.length} identified skill${answers.skills.length > 1 ? "s" : ""} to the table.`,
    answers.investmentBudget && `Starting point: ${answers.investmentBudget}.`,
    answers.timeline && `Target timeline: ${answers.timeline}.`,
  ].filter(Boolean) as string[];

  async function runSubmission() {
    setErrorMessage(null);
    setPhase("converging");
    try {
      // The ONE real Gemini request, kicked off immediately underneath the
      // convergence animation — the decorative intro overlaps real work
      // instead of adding to it.
      const resultPromise = completeConsultation({
        data: { answers: answers as Record<string, unknown> },
      });
      await new Promise((resolve) => setTimeout(resolve, 1300));

      setPhase("building");
      let cycleIndex = 0;
      const interval = setInterval(() => {
        cycleIndex = (cycleIndex + 1) % SYNTHESIS_CYCLE.length;
        setPhase(SYNTHESIS_CYCLE[cycleIndex]);
      }, 4000);

      try {
        await resultPromise;
      } finally {
        clearInterval(interval);
      }

      setPhase("done");
      // Let the checkmarks register before leaving — the work is genuinely
      // finished at this point, this is just giving the user a beat to see it.
      setTimeout(() => navigate({ to: "/dashboard" }), 700);
    } catch (err) {
      console.error("[consultation] submission failed:", err);
      setErrorMessage(
        "Sol couldn't complete the analysis. Your answers are safely saved — try again.",
      );
      setPhase("error");
    }
  }

  const isSubmitting =
    phase === "converging" ||
    phase === "building" ||
    phase === "matching" ||
    phase === "roadmapping" ||
    phase === "done";
  const isConverging = phase === "converging";

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
        {isSubmitting ? "Your Business DNA is complete." : "Your Founder Profile is complete."}
      </motion.h2>

      {summaryLines.length > 0 && !isSubmitting && (
        <motion.ul variants={fadeUp} className="mt-6 flex flex-col gap-2 text-left">
          {summaryLines.map((line) => (
            <li key={line} className="text-[0.95rem] text-foreground">
              {line}
            </li>
          ))}
        </motion.ul>
      )}

      <AnimatePresence mode="wait">
        {isConverging ? (
          <SignalConvergence />
        ) : isSubmitting ? (
          <motion.div
            key="submitting"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-8 flex w-full flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 px-6 py-6 text-left"
          >
            {SYNTHESIS_STEPS.map((step) => {
              const currentIndex = SYNTHESIS_CYCLE.indexOf(phase as SubmitPhase);
              const thisIndex = SYNTHESIS_CYCLE.indexOf(step.phase);
              const state =
                phase === "done" || thisIndex < currentIndex
                  ? "done"
                  : thisIndex === currentIndex
                    ? "active"
                    : "pending";
              return (
                <div key={step.phase} className="flex items-center gap-3">
                  {state === "done" ? (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                  ) : state === "active" ? (
                    <Loader2
                      className="size-5 shrink-0 animate-spin text-accent"
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="size-5 shrink-0 rounded-full border border-border" />
                  )}
                  <span
                    className={
                      state === "pending"
                        ? "text-[0.92rem] text-muted-foreground/60"
                        : "text-[0.92rem] text-foreground"
                    }
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </motion.div>
        ) : phase === "error" ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex w-full flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-card/80 px-6 py-6"
          >
            <p className="text-[0.92rem] text-destructive">{errorMessage}</p>
            <PremiumButton
              type="button"
              tone="solid"
              shape="rounded"
              size="sm"
              onClick={runSubmission}
            >
              Try Again
            </PremiumButton>
          </motion.div>
        ) : currentUser.data === null ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 w-full"
          >
            <AccountGate onAuthenticated={runSubmission} />
          </motion.div>
        ) : (
          <motion.div key="ready" variants={fadeUp} className="mt-8">
            <PremiumButton
              type="button"
              tone="solid"
              shape="rounded"
              size="lg"
              onClick={runSubmission}
            >
              Save & See My Results
              <ArrowRight className="size-4 text-accent" aria-hidden="true" />
            </PremiumButton>
          </motion.div>
        )}
      </AnimatePresence>

      {!isSubmitting && (
        <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="text-[0.85rem] font-medium text-muted-foreground hover:text-primary"
          >
            Back to Homepage
          </Link>
          <span className="hidden text-border sm:inline">·</span>
          <button
            type="button"
            onClick={restart}
            className="text-[0.85rem] font-medium text-muted-foreground hover:text-primary"
          >
            Start over
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
