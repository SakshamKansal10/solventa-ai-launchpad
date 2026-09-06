import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionGroupStep } from "@/lib/onboarding-steps";
import { useOnboarding } from "@/lib/onboarding-store";
import { getStageTheme } from "@/lib/onboarding-themes";
import { PremiumButton } from "@/components/solventia/PremiumButton";

/** Several short, related chip questions on one screen — the actual
 * mechanism behind "group similar MCQs together." Each sub-question is
 * its own compact chip row under its own short label; one shared
 * Continue button, gated on every item having an answer. */
export function QuestionGroupRenderer({ step }: { step: QuestionGroupStep }) {
  const { answers, setAnswer, goNext } = useOnboarding();
  const theme = getStageTheme(step.section);

  const allAnswered = step.items.every((item) => answers[item.id] !== undefined);

  return (
    <div className="flex w-full flex-col gap-9">
      <div className="text-center">
        <h2 className="font-display text-[clamp(1.7rem,3.6vw,2.5rem)] font-semibold leading-[1.25] text-primary">
          {step.title}
        </h2>
        {step.helper && (
          <p className="mx-auto mt-3 max-w-[46ch] text-[0.98rem] leading-[1.7] text-muted-foreground">
            {step.helper}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-7">
        {step.items.map((item) => {
          const value = answers[item.id];
          return (
            <div key={item.id} className="flex flex-col gap-3">
              <p className="text-[0.9rem] font-semibold text-foreground">{item.label}</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {item.options.map((option) => {
                  const selected = value === option;
                  return (
                    <motion.button
                      key={option}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      animate={selected ? { y: -1 } : { y: 0 }}
                      onClick={() => setAnswer(item.id, option as never)}
                      style={
                        selected
                          ? { borderColor: theme.color, backgroundColor: theme.colorSoft }
                          : undefined
                      }
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-[0.88rem] font-medium text-primary shadow-sm transition-colors duration-200",
                        !selected &&
                          "border-border bg-card text-foreground hover:border-primary/30",
                      )}
                    >
                      {option}
                      <AnimatePresence>
                        {selected && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <Check
                              className="size-3.5"
                              style={{ color: theme.color }}
                              aria-hidden="true"
                            />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex justify-center">
        <PremiumButton
          type="button"
          tone="solid"
          shape="rounded"
          size="lg"
          disabled={!allAnswered}
          onClick={goNext}
        >
          Continue
          <ArrowRight className="size-4 text-accent" aria-hidden="true" />
        </PremiumButton>
      </div>
    </div>
  );
}
