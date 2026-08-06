import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ArrowLeft, Sparkles, X } from "lucide-react";
import mark from "@/assets/solventia-mark.png";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding-store";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  WelcomeScreen,
  AIIntroScreen,
  SectionIntroScreen,
  CompletionScreen,
} from "@/components/onboarding/StaticScreens";
import { ThinkingScreen } from "@/components/onboarding/ThinkingScreen";
import { QuestionRenderer } from "@/components/onboarding/QuestionRenderer";
import { FounderProfilePanel } from "@/components/onboarding/FounderProfilePanel";

export const Route = createFileRoute("/consultation")({
  component: ConsultationPage,
  head: () => ({
    meta: [{ title: "Your Consultation — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

/** Fixed, hand-placed positions — never Math.random(), which would desync
 * between server and client render and break hydration. Spread across a
 * single viewport since the wrapper is fixed (stays put behind the whole
 * scrollable flow, not just the landing screen). */
const BACKDROP_PARTICLES = [
  { top: "14%", left: "38%", size: 2, delay: 0 },
  { top: "24%", left: "82%", size: 2.5, delay: 1.6 },
  { top: "42%", left: "16%", size: 2, delay: 0.8 },
  { top: "58%", left: "68%", size: 3, delay: 2.4 },
  { top: "72%", left: "30%", size: 2, delay: 1.2 },
  { top: "85%", left: "88%", size: 2.5, delay: 3.1 },
  { top: "12%", left: "62%", size: 2, delay: 2 },
  { top: "66%", left: "6%", size: 2.5, delay: 0.4 },
];

function ConsultationPage() {
  return (
    <OnboardingProvider>
      <ConsultationShell />
    </OnboardingProvider>
  );
}

function ConsultationShell() {
  const { currentStep, stepIndex, goBack, progress } = useOnboarding();
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);

  const isIntroLike =
    currentStep.kind === "welcome" ||
    currentStep.kind === "ai-intro" ||
    currentStep.kind === "complete";
  const showProfile = !isIntroLike;
  const showBack = !isIntroLike && stepIndex > 0;

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground">
      {/* Fixed ambient backdrop — anchored to the viewport, not the page, so
          the glow, texture, and particles stay present behind every question,
          not just the landing screen. Same light, pearl-white treatment as
          the homepage. */}
      <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="surface-grid absolute inset-0 text-primary opacity-[0.05]" />
        <div className="ambient-purple" />
        <div className="ambient-gold opacity-70" />
        {BACKDROP_PARTICLES.map((p, i) => (
          <span
            key={i}
            className="particle-drift absolute rounded-full bg-accent"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/60 bg-background/80 px-6 py-6 backdrop-blur-xl lg:px-10">
        <Link to="/" className="flex items-center gap-3" aria-label="Solventia home">
          <img src={mark} alt="" width={298} height={436} className="h-11 w-auto" />
          <span className="hidden leading-none sm:block">
            <span className="block font-display text-[1.35rem] font-semibold tracking-[0.2em] text-primary">
              SOLVENTIA
            </span>
            <span className="mt-1 block text-[0.56rem] font-semibold tracking-[0.32em] text-accent">
              VALIDATE • BUILD • ELEVATE
            </span>
          </span>
        </Link>

        {!isIntroLike && (
          <div className="mx-6 hidden max-w-md flex-1 items-center gap-3 sm:flex">
            <Progress value={progress} className="h-1.5 bg-secondary" />
            <span className="shrink-0 text-[0.78rem] font-semibold text-muted-foreground">
              {progress}%
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {showProfile && (
            <Sheet open={mobileProfileOpen} onOpenChange={setMobileProfileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-[0.78rem] font-semibold text-foreground/80 2xl:hidden"
                >
                  <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
                  Profile
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[88vw] max-w-sm border-border bg-background p-6"
              >
                <SheetTitle className="text-primary">Your Founder Profile</SheetTitle>
                <div className="mt-6">
                  <FounderProfilePanel />
                </div>
              </SheetContent>
            </Sheet>
          )}
          <Link
            to="/"
            aria-label="Exit consultation"
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {showBack && (
        <button
          type="button"
          onClick={goBack}
          className="relative z-20 ml-6 mt-6 flex items-center gap-1.5 text-[0.82rem] font-medium text-muted-foreground hover:text-primary lg:ml-10"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back
        </button>
      )}

      <main className="relative z-10 mx-auto w-full max-w-[1200px] px-6 py-12 lg:px-10 lg:py-16">
        <div className="mx-auto flex min-h-[60vh] max-w-[680px] items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              {currentStep.kind === "welcome" && <WelcomeScreen />}
              {currentStep.kind === "ai-intro" && <AIIntroScreen />}
              {currentStep.kind === "section-intro" && <SectionIntroScreen step={currentStep} />}
              {currentStep.kind === "thinking" && <ThinkingScreen step={currentStep} />}
              {currentStep.kind === "question" && (
                <div className="card-breathe w-full rounded-[2rem] border border-border/70 bg-card/90 px-6 py-10 shadow-[0_30px_80px_-45px_oklch(0.245_0.055_268_/_0.22)] backdrop-blur-xl sm:px-12 sm:py-14">
                  <QuestionRenderer step={currentStep} />
                </div>
              )}
              {currentStep.kind === "complete" && <CompletionScreen />}
            </motion.div>
          </AnimatePresence>
        </div>

        {showProfile && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="hidden 2xl:fixed 2xl:right-10 2xl:top-32 2xl:block 2xl:w-[300px]"
          >
            <FounderProfilePanel className="max-h-[75vh] overflow-y-auto" />
          </motion.div>
        )}
      </main>
    </div>
  );
}
