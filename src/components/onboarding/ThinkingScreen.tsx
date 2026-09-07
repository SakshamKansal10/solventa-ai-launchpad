import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-store";
import { getPersonalizedInsight, getProcessingLine } from "@/lib/onboarding-insights";
import type { ThinkingStep } from "@/lib/onboarding-steps";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { getStageTheme } from "@/lib/onboarding-themes";
import { FounderGenomeForming } from "@/components/dashboard/FounderGenome";
import { normalizeProfile } from "@/lib/profile/normalize";
import { computeFounderGenome } from "@/lib/profile/founder-genome";

export function ThinkingScreen({ step }: { step: ThinkingStep }) {
  const { answers, goNext, progress } = useOnboarding();
  const [phase, setPhase] = useState<"processing" | "insight">("processing");
  const theme = getStageTheme(step.afterSection);
  // A REAL, live genome from whatever's been answered so far — not a
  // placeholder. normalizeProfile already tolerates a fully-empty answer
  // set, so this is safe on the very first thinking pause too.
  const genome = computeFounderGenome(normalizeProfile(answers));

  useEffect(() => {
    setPhase("processing");
    const timer = window.setTimeout(() => setPhase("insight"), 1800);
    return () => window.clearTimeout(timer);
  }, [step.afterSection]);

  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        style={{ borderColor: theme.color, transition: "border-color 700ms" }}
        className="flex size-16 items-center justify-center rounded-full border-2 border-dashed"
      >
        <Sparkles className="size-6" style={{ color: theme.color }} aria-hidden="true" />
      </motion.div>

      <div className="mt-8 min-h-[6rem]">
        {phase === "processing" ? (
          <motion.p
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[1.05rem] font-medium text-muted-foreground"
          >
            {getProcessingLine(step.afterSection)}
          </motion.p>
        ) : (
          <motion.p
            key="insight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[1.05rem] leading-[1.8] text-foreground"
          >
            {getPersonalizedInsight(step.afterSection, answers)}
          </motion.p>
        )}
      </div>

      {phase === "insight" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-8"
        >
          <FounderGenomeForming genome={genome} progress={progress} color={theme.color} />
        </motion.div>
      )}

      {phase === "insight" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
          <PremiumButton type="button" tone="solid" shape="rounded" size="lg" onClick={goNext}>
            Continue
          </PremiumButton>
        </motion.div>
      )}
    </div>
  );
}
