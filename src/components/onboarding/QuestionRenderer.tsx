import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionStep } from "@/lib/onboarding-steps";
import { LANGUAGE_LIBRARY, type SkillEntry } from "@/lib/onboarding-types";
import { useOnboarding } from "@/lib/onboarding-store";
import { getStageTheme } from "@/lib/onboarding-themes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { SearchableMultiSelect } from "./SearchableMultiSelect";
import { SearchableSelect } from "./SearchableSelect";
import { CurrencyInput } from "./CurrencyInput";
import { SkillPicker } from "./SkillPicker";
import { LocationPicker } from "./LocationPicker";

/** One short, grounded reflection per spectrum position — helps the user
 * recognize themselves in the choice rather than just picking a label. */
const SPECTRUM_INTERPRETATIONS: Record<string, string> = {
  "Very cautious":
    "You'd rather move slowly and protect what you have than risk it on a long shot. I'll prioritize low-risk, low-capital paths.",
  Balanced:
    "You want meaningful upside, but you're not interested in risking everything to chase it.",
  "Comfortable experimenting":
    "You're willing to take real risks for a real shot at something bigger.",
};

export function QuestionRenderer({ step }: { step: QuestionStep }) {
  const { answers, setAnswer, goNext, skip } = useOnboarding();
  const theme = getStageTheme(step.section);
  const value = answers[step.id];
  const [localText, setLocalText] = useState(typeof value === "string" ? value : "");
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);

  const canContinueDefault =
    step.optional ||
    (Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "");

  function commitAndContinue(next?: unknown) {
    if (next !== undefined) {
      setAnswer(step.id, next as never);
    }
    goNext();
  }

  function selectChoice(option: string) {
    setAnswer(step.id, option as never);
    if (step.autoContinue) {
      setPendingChoice(option);
      window.setTimeout(() => goNext(), 420);
    }
  }

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="text-center">
        <h2 className="font-display text-[clamp(1.7rem,3.6vw,2.5rem)] font-semibold leading-[1.25] text-primary">
          {step.label}
        </h2>
        {step.helper && (
          <p className="mx-auto mt-3 max-w-[46ch] text-[0.98rem] leading-[1.7] text-muted-foreground">
            {step.helper}
          </p>
        )}
      </div>

      {step.input === "choice" && step.options && (
        <div className="grid gap-3 sm:grid-cols-2">
          {step.options.map((option) => {
            const selected = value === option;
            return (
              <motion.button
                key={option}
                type="button"
                disabled={pendingChoice !== null}
                whileHover={pendingChoice ? undefined : { y: -2 }}
                whileTap={pendingChoice ? undefined : { scale: 0.98 }}
                animate={selected ? { y: -1 } : { y: 0 }}
                onClick={() => selectChoice(option)}
                style={
                  selected
                    ? { borderColor: theme.color, backgroundColor: theme.colorSoft }
                    : undefined
                }
                className={cn(
                  "flex items-center justify-between rounded-xl border px-5 py-4 text-left text-[0.95rem] font-medium text-primary shadow-sm transition-colors duration-200",
                  !selected && "border-border bg-card text-foreground hover:border-primary/30",
                  pendingChoice && !selected && "opacity-50",
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
                      <Check className="size-4" style={{ color: theme.color }} aria-hidden="true" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      )}

      {step.input === "multi-choice" && step.options && (
        <div className="grid gap-3 sm:grid-cols-2">
          {step.options.map((option) => {
            const list = Array.isArray(value) ? (value as string[]) : [];
            const active = list.includes(option);
            return (
              <motion.button
                key={option}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                animate={active ? { y: -1 } : { y: 0 }}
                onClick={() =>
                  setAnswer(
                    step.id,
                    (active ? list.filter((o) => o !== option) : [...list, option]) as never,
                  )
                }
                style={
                  active
                    ? { borderColor: theme.color, backgroundColor: theme.colorSoft }
                    : undefined
                }
                className={cn(
                  "flex items-center justify-between rounded-xl border px-5 py-4 text-left text-[0.95rem] font-medium text-primary shadow-sm transition-colors duration-200",
                  !active && "border-border bg-card text-foreground hover:border-primary/30",
                )}
              >
                {option}
                <AnimatePresence>
                  {active && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Check className="size-4" style={{ color: theme.color }} aria-hidden="true" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      )}

      {step.input === "text" && (
        <Input
          autoFocus
          value={localText}
          placeholder={step.placeholder}
          onChange={(e) => setLocalText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (localText.trim() || step.optional))
              commitAndContinue(localText.trim());
          }}
          className="h-14 rounded-xl border-border bg-card px-5 text-lg shadow-sm"
        />
      )}

      {step.input === "number" && (
        <Input
          autoFocus
          type="number"
          inputMode="numeric"
          value={localText}
          placeholder={step.placeholder}
          onChange={(e) => setLocalText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (localText.trim() || step.optional))
              commitAndContinue(localText.trim());
          }}
          className="h-14 rounded-xl border-border bg-card px-5 text-lg shadow-sm"
        />
      )}

      {step.input === "currency" && (
        <CurrencyInput
          value={typeof value === "string" ? value : undefined}
          placeholder={step.placeholder}
          onChange={(raw) => setAnswer(step.id, raw as never)}
        />
      )}

      {step.input === "textarea" && (
        <Textarea
          autoFocus
          value={localText}
          placeholder={step.placeholder ?? "Type your answer…"}
          onChange={(e) => setLocalText(e.target.value)}
          className="min-h-32 rounded-xl border-border bg-card px-5 py-4 text-base shadow-sm"
        />
      )}

      {step.input === "select" && step.options && (
        <Select
          value={typeof value === "string" ? value : undefined}
          onValueChange={(v) => setAnswer(step.id, v as never)}
        >
          <SelectTrigger className="h-14 rounded-xl border-border bg-card px-5 text-base shadow-sm">
            <SelectValue placeholder="Choose one…" />
          </SelectTrigger>
          <SelectContent>
            {step.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {step.input === "searchable-select" && (
        <SearchableSelect
          options={step.options ?? []}
          value={typeof value === "string" ? value : undefined}
          onChange={(next) => setAnswer(step.id, next as never)}
          placeholder="Search…"
        />
      )}

      {step.input === "location" && typeof answers.country === "string" && (
        <LocationPicker country={answers.country} />
      )}

      {step.input === "searchable-multi" && (
        <SearchableMultiSelect
          options={LANGUAGE_LIBRARY}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(next) => setAnswer(step.id, next as never)}
          placeholder="Search languages…"
        />
      )}

      {step.input === "skills" && (
        <SkillPicker
          value={Array.isArray(value) ? (value as SkillEntry[]) : []}
          onChange={(next) => setAnswer(step.id, next as never)}
        />
      )}

      {step.input === "spectrum" && step.options && (
        <div className="flex flex-col gap-6">
          <div className="relative flex items-start justify-between gap-2">
            <div className="absolute inset-x-6 top-[10px] h-px bg-border" aria-hidden="true" />
            {step.options.map((option) => {
              const selected = value === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAnswer(step.id, option as never)}
                  className="relative z-10 flex flex-1 flex-col items-center gap-3 outline-none"
                >
                  <motion.span
                    animate={selected ? { scale: 1.2 } : { scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border-2 bg-card",
                      !selected && "border-border",
                    )}
                    style={
                      selected
                        ? { borderColor: theme.color, backgroundColor: theme.color }
                        : undefined
                    }
                  />
                  <span
                    className={cn(
                      "max-w-[10ch] text-center text-[0.82rem] leading-tight",
                      selected ? "font-semibold text-primary" : "font-medium text-muted-foreground",
                    )}
                  >
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
          <AnimatePresence mode="wait">
            {typeof value === "string" && SPECTRUM_INTERPRETATIONS[value] && (
              <motion.div
                key={value}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl border px-5 py-4"
                style={{ borderColor: theme.colorSoft, backgroundColor: theme.colorSoft }}
              >
                <p
                  className="text-[0.72rem] font-bold uppercase tracking-[0.1em]"
                  style={{ color: theme.color }}
                >
                  {value}
                </p>
                <p className="mt-1.5 text-[0.9rem] leading-[1.7] text-foreground">
                  {SPECTRUM_INTERPRETATIONS[value]}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {(!(step.input === "choice" && step.autoContinue) || step.optional) && (
        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          {!(step.input === "choice" && step.autoContinue) &&
            (step.input === "text" ||
              step.input === "number" ||
              step.input === "currency" ||
              step.input === "textarea" ||
              step.input === "choice" ||
              step.input === "multi-choice" ||
              step.input === "select" ||
              step.input === "searchable-select" ||
              step.input === "searchable-multi" ||
              step.input === "skills" ||
              step.input === "spectrum") && (
              <PremiumButton
                type="button"
                tone="solid"
                shape="rounded"
                size="lg"
                disabled={
                  !canContinueDefault &&
                  !(step.input === "text" ||
                  step.input === "number" ||
                  step.input === "currency" ||
                  step.input === "textarea"
                    ? localText.trim() || (step.input === "currency" && value)
                    : false)
                }
                onClick={() => {
                  if (
                    step.input === "text" ||
                    step.input === "number" ||
                    step.input === "textarea"
                  ) {
                    commitAndContinue(localText.trim() || undefined);
                  } else {
                    goNext();
                  }
                }}
              >
                Continue
                <ArrowRight className="size-4 text-accent" aria-hidden="true" />
              </PremiumButton>
            )}
          {step.optional && (
            <button
              type="button"
              onClick={skip}
              className="text-[0.85rem] font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Skip this one
            </button>
          )}
        </div>
      )}
    </div>
  );
}
