import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-store";
import {
  getKnownSignals,
  getPersonalizedInsight,
  getProcessingLine,
} from "@/lib/onboarding-insights";
import type { ThinkingStep } from "@/lib/onboarding-steps";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { getStageTheme } from "@/lib/onboarding-themes";

export function ThinkingScreen({ step }: { step: ThinkingStep }) {
  const { answers, goNext } = useOnboarding();
  const [phase, setPhase] = useState<"processing" | "insight">("processing");
  const theme = getStageTheme(step.afterSection);
  const signals = getKnownSignals(step.afterSection);

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

      {phase === "insight" && signals.length > 0 && (
        <motion.ul
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.08, delayChildren: 0.1 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5"
        >
          {signals.map((label) => (
            <motion.li
              key={label}
              variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-1.5 text-[0.82rem] font-medium text-muted-foreground"
            >
              <Check className="size-3.5" style={{ color: theme.color }} aria-hidden="true" />
              {label}
            </motion.li>
          ))}
        </motion.ul>
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
