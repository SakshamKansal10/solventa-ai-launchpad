import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check, Clock, RotateCcw, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";
import mark from "@/assets/solventia-mark.png";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { translateOnboardingText } from "@/lib/i18n/onboarding-dictionary";

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
      <span className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-violet shadow-[0_0_40px_-4px_oklch(0.745_0.132_72_/_0.7)]">
        <Sparkles className="size-6 text-primary" aria-hidden="true" />
      </span>
    </div>
  );
}

export function WelcomeScreen({ editMode = false }: { editMode?: boolean }) {
  const { goNext, hasSavedProgress, resumeSaved, discardSaved } = useOnboarding();
  const { locale } = useLocale();
  const tr = (s: string) => translateOnboardingText(s, locale) ?? s;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.1 }}
      className="mx-auto flex max-w-[560px] flex-col items-center text-center"
    >
      <motion.p variants={fadeUp} className="eyebrow flex items-center gap-2 text-accent">
        <Sparkles className="size-3.5" aria-hidden="true" />
        {tr(editMode ? "Editing Your Founder Profile" : "Solventia Consultation")}
      </motion.p>
      <motion.h1
        variants={fadeUp}
        className="mt-6 font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.15] text-primary"
      >
        {tr(editMode ? "Update What’s Changed." : "Let’s Build Your Entrepreneurial Journey.")}
      </motion.h1>
      <motion.p
        variants={fadeUp}
        className="mt-6 text-[1.02rem] leading-[1.9] text-muted-foreground"
      >
        {tr(
          editMode
            ? "Every answer is already filled in from your last consultation. Skip through anything unchanged, and edit only what’s different."
            : "Over the next few minutes, I’ll understand your ambitions, strengths, resources, and circumstances before recommending a business that genuinely fits you.",
        )}
      </motion.p>
      <motion.p variants={fadeUp} className="mt-3 text-[1.02rem] font-semibold text-primary">
        {tr(
          editMode
            ? "Your current ideas and roadmap stay exactly where they are until you finish and submit."
            : "This isn’t a quiz. It’s a personalized strategy consultation.",
        )}
      </motion.p>

      <motion.div
        variants={fadeUp}
        className="mt-8 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[0.85rem] text-muted-foreground shadow-sm"
      >
        <Clock className="size-4 text-accent" aria-hidden="true" />
        {tr(editMode ? "Estimated time: 2–4 minutes" : "Estimated time: 8–10 minutes")}
      </motion.div>

      <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center gap-3">
        <PremiumButton type="button" tone="solid" shape="rounded" size="lg" onClick={goNext}>
          {tr(editMode ? "Continue to My Answers" : "Begin My Consultation")}
          <ArrowRight className="size-4 text-accent" aria-hidden="true" />
        </PremiumButton>

        {!editMode && hasSavedProgress && (
          <div className="mt-2 flex items-center gap-3 text-[0.85rem]">
            <button
              type="button"
              onClick={resumeSaved}
              className="flex items-center gap-1.5 font-semibold text-accent hover:underline"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {tr("Resume saved progress")}
            </button>
            <span className="text-border">·</span>
            <button
              type="button"
              onClick={discardSaved}
              className="text-muted-foreground hover:text-primary"
            >
              {tr("Start fresh")}
            </button>
          </div>
        )}

        <Link to="/" className="mt-4 text-[0.82rem] text-muted-foreground/70 hover:text-primary">
          {tr("Not now — back to homepage")}
        </Link>
      </motion.div>
    </motion.div>
  );
}

export function AIIntroScreen() {
  const { goNext } = useOnboarding();
  const { locale } = useLocale();
  const tr = (s: string) => translateOnboardingText(s, locale) ?? s;
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
        {locale === "hi" ? "नमस्ते। मैं " : "Hello. I’m "}
        <span className="font-semibold text-accent">Sol</span>
        {locale === "hi" ? " हूं।" : "."}
      </motion.p>
      <motion.p
        variants={fadeUp}
        className="mt-4 text-[1.02rem] leading-[1.9] text-muted-foreground"
      >
        {tr(
          "My role isn’t simply to recommend business ideas. My responsibility is to understand you first, eliminate unsuitable opportunities, and design a realistic roadmap you can actually follow.",
        )}
      </motion.p>
      <motion.p
        variants={fadeUp}
        className="mt-4 text-[1.02rem] leading-[1.9] text-muted-foreground"
      >
        {tr("Every answer helps me understand your entrepreneurial profile.")}
      </motion.p>
      <motion.div variants={fadeUp} className="mt-10">
        <PremiumButton type="button" tone="solid" shape="rounded" size="lg" onClick={goNext}>
          {tr("Let’s Begin")}
          <ArrowRight className="size-4 text-accent" aria-hidden="true" />
        </PremiumButton>
      </motion.div>
    </motion.div>
  );
}

export function SectionIntroScreen({ step }: { step: SectionIntroStep }) {
  const { goNext } = useOnboarding();
  const { locale } = useLocale();
  const tr = (s: string) => translateOnboardingText(s, locale) ?? s;
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
          {tr(theme.feeling)}
        </p>
      </motion.div>
      <motion.h2
        variants={fadeUp}
        className="mt-4 font-display text-[clamp(1.8rem,3.5vw,2.4rem)] font-semibold text-primary"
      >
        {tr(step.title)}
      </motion.h2>
      <motion.p variants={fadeUp} className="mt-5 text-[1.05rem] font-semibold text-primary">
        {tr(theme.opener)}
      </motion.p>
      <motion.p
        variants={fadeUp}
        className="mt-3 text-[1.02rem] leading-[1.9] text-muted-foreground"
      >
        {tr(step.body)}
      </motion.p>
      <motion.div variants={fadeUp} className="mt-9">
        <PremiumButton type="button" tone="solid" shape="rounded" size="lg" onClick={goNext}>
          {tr("Continue")}
          <ArrowRight className="size-4 text-accent" aria-hidden="true" />
        </PremiumButton>
      </motion.div>
      <motion.p variants={fadeUp} className="mt-8 text-[0.72rem] text-muted-foreground/50">
        {locale === "hi" ? `खंड ${step.section} / 7` : `Section ${step.section} of 7`}
      </motion.p>
    </motion.div>
  );
}

type SubmitPhase = "idle" | "generating" | "done" | "error";

/** The five scenes of the Solventia Intelligence Sequence — replaces the
 * old five-item checklist, which visibly finished four items in ~10s and
 * then sat "in progress" on the fifth for the remaining ~20-60s of the
 * real Gemini call. That read as broken, not busy. Scenes 0-3 advance on
 * a timer because they're genuinely quick, real setup narration; scene 4
 * ("Choosing Your Best Three") is the actual long-running call and never
 * fake-completes — it just holds, honestly, with a rotating (but always
 * true) status line once it runs long, until the real response lands. */
const SCENES = [
  {
    title: "Understanding Your Profile",
    copy: "Reading through your skills, resources, and goals.",
  },
  {
    title: "Setting Your Scale",
    copy: "Calibrating the right size of opportunity for where you are right now.",
  },
  {
    title: "Exploring Directions",
    copy: "Considering multiple business directions worth testing.",
  },
  {
    title: "Pressure-Testing",
    copy: "Checking each direction against your real time, capital, and constraints.",
  },
  {
    title: "Choosing Your Best Three",
    copy: "Narrowing everything down to the three strongest opportunities for you.",
  },
];

const FINAL_SCENE_INDEX = SCENES.length - 1;

const MICRO_STATUS = [
  "Still working — this part takes a little longer…",
  "Weighing tradeoffs across each direction…",
  "Double-checking fit against your real constraints…",
  "Finalizing your strongest three…",
];

function SolventiaIntelligenceSequence() {
  const { locale } = useLocale();
  const tr = (s: string) => translateOnboardingText(s, locale) ?? s;
  const [sceneIndex, setSceneIndex] = useState(0);
  const [microIndex, setMicroIndex] = useState(0);

  // Scenes 0-3 advance every ~4.2s regardless of the real call's actual
  // progress (there's no partial progress to report mid-call) — this is
  // honest narration of what Sol is conceptually doing, not a claim about
  // backend state. Scene 4 never auto-advances; only the real response
  // resolving moves the founder past it (see CompletionScreen).
  useEffect(() => {
    if (sceneIndex >= FINAL_SCENE_INDEX) return;
    const timer = window.setTimeout(
      () => setSceneIndex((i) => Math.min(i + 1, FINAL_SCENE_INDEX)),
      4200,
    );
    return () => window.clearTimeout(timer);
  }, [sceneIndex]);

  useEffect(() => {
    if (sceneIndex !== FINAL_SCENE_INDEX) return;
    const interval = window.setInterval(() => {
      setMicroIndex((i) => (i + 1) % MICRO_STATUS.length);
    }, 3400);
    return () => window.clearInterval(interval);
  }, [sceneIndex]);

  const scene = SCENES[sceneIndex];
  const isFinal = sceneIndex === FINAL_SCENE_INDEX;

  return (
    <motion.div
      key="generating"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-8"
    >
      <AIOrb />
      <div className="flex min-h-[7.5rem] flex-col items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={sceneIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-2.5"
          >
            <p className="eyebrow text-center text-accent">{tr(scene.title)}</p>
            <p className="max-w-sm text-center text-[0.98rem] leading-relaxed text-foreground">
              {tr(scene.copy)}
            </p>
          </motion.div>
        </AnimatePresence>
        {isFinal && (
          <AnimatePresence mode="wait">
            <motion.p
              key={microIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="mt-3 text-[0.8rem] text-muted-foreground"
            >
              {tr(MICRO_STATUS[microIndex])}
            </motion.p>
          </AnimatePresence>
        )}
      </div>
      <p className="max-w-xs text-center text-[0.78rem] leading-relaxed text-muted-foreground/70">
        {tr("Your answers are already saved — safe even if you leave this page.")}
      </p>
    </motion.div>
  );
}

export function CompletionScreen() {
  const { answers, restart } = useOnboarding();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const tr = (s: string) => translateOnboardingText(s, locale) ?? s;
  const currentUser = useQuery({ queryKey: ["current-user"], queryFn: () => getCurrentUser() });

  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // A ref, not state — state updates aren't visible until the next render,
  // which leaves a real window for two rapid clicks (or AccountGate's
  // onAuthenticated firing alongside a manual retry) to both pass the
  // "not already submitting" check before either commits. A ref is read
  // and written synchronously, so the second call sees the first call's
  // guard immediately, with no such window.
  const submittingRef = useRef(false);

  const summaryLines = [
    answers.currentStatus && `You're currently a ${answers.currentStatus}.`,
    answers.skills?.length &&
      `You bring ${answers.skills.length} identified skill${answers.skills.length > 1 ? "s" : ""} to the table.`,
    answers.investmentBudget && `Starting point: ${answers.investmentBudget}.`,
    answers.timeline && `Target timeline: ${answers.timeline}.`,
  ].filter(Boolean) as string[];

  async function runSubmission() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setErrorMessage(null);
    setPhase("generating");
    try {
      await completeConsultation({
        data: { answers: answers as Record<string, unknown>, locale },
      });

      setPhase("done");
      // Let the checkmarks register before leaving — the work is genuinely
      // finished at this point, this is just giving the user a beat to see it.
      setTimeout(() => navigate({ to: "/dashboard" }), 900);
    } catch (err) {
      console.error("[consultation] submission failed:", err);
      setErrorMessage(
        "Sol couldn't complete the analysis. Your answers are safely saved — try again.",
      );
      setPhase("error");
    } finally {
      submittingRef.current = false;
    }
  }

  const isSubmitting = phase === "generating" || phase === "done";
  const isGenerating = phase === "generating";

  // The real-work wait takes over the entire viewport — no header, no
  // exit button, no progress-bar chrome from ConsultationShell competing
  // for attention. This is deliberately the one moment in the whole flow
  // that isn't boxed into the small content column: a founder waiting
  // ~10-70s for their actual business ideas should feel like Solventia is
  // seriously working, not stuck inside a form. `phase === "done"`
  // intentionally falls through to the normal boxed layout below — the
  // checkmark summary is a quick beat, not a wait.
  if (isGenerating) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-10 bg-background px-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            background:
              "radial-gradient(circle at 50% 35%, var(--gold-soft) 0%, var(--violet-soft) 45%, transparent 75%)",
          }}
          aria-hidden="true"
        />
        <img
          src={mark}
          alt=""
          width={298}
          height={436}
          className="relative h-9 w-auto opacity-90 drop-shadow-[0_1px_2px_rgba(10,25,47,0.18)]"
        />
        <SolventiaIntelligenceSequence />
      </div>
    );
  }

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
        {tr(isSubmitting ? "Your Business DNA is complete." : "Your Founder Profile is complete.")}
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
        {phase === "done" ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex w-full flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 px-6 py-6 text-left"
          >
            {/* Only ever shown once the response has actually resolved —
             * these are true statements about what just happened, not a
             * progress list ticked ahead of the real event. */}
            {["3 opportunities identified", "Execution paths prepared"].map((label) => (
              <div key={label} className="flex items-center gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                <span className="text-[0.92rem] text-foreground">{tr(label)}</span>
              </div>
            ))}
          </motion.div>
        ) : phase === "error" ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex w-full flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-card/80 px-6 py-6"
          >
            <p className="text-[0.92rem] text-destructive">
              {errorMessage ? tr(errorMessage) : errorMessage}
            </p>
            <PremiumButton
              type="button"
              tone="solid"
              shape="rounded"
              size="sm"
              onClick={runSubmission}
            >
              {tr("Try Again")}
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
              {tr("Save & See My Results")}
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
            {tr("Back to Homepage")}
          </Link>
          <span className="hidden text-border sm:inline">·</span>
          <button
            type="button"
            onClick={restart}
            className="text-[0.85rem] font-medium text-muted-foreground hover:text-primary"
          >
            {tr("Start over")}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
