import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionStep } from "@/lib/onboarding-steps";
import { LANGUAGE_LIBRARY, type SkillEntry } from "@/lib/onboarding-types";
import { useOnboarding } from "@/lib/onboarding-store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { SearchableMultiSelect } from "./SearchableMultiSelect";
import { SkillPicker } from "./SkillPicker";

export function QuestionRenderer({ step }: { step: QuestionStep }) {
  const { answers, setAnswer, goNext, skip } = useOnboarding();
  const value = answers[step.id];
  const [localText, setLocalText] = useState(typeof value === "string" ? value : "");

  const canContinueDefault =
    step.optional ||
    (Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "");

  function commitAndContinue(next?: unknown) {
    if (next !== undefined) {
      setAnswer(step.id, next as never);
    }
    goNext();
  }

  return (
    <div className="flex w-full flex-col gap-9">
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
          {step.options.map((option) => (
            <motion.button
              key={option}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => commitAndContinue(option)}
              className={cn(
                "flex items-center justify-between rounded-xl border px-5 py-4 text-left text-[0.95rem] font-medium shadow-sm transition-colors",
                value === option
                  ? "border-accent bg-accent/15 text-primary"
                  : "border-border bg-card text-foreground hover:border-accent/40",
              )}
            >
              {option}
              {value === option && <Check className="size-4 text-accent" aria-hidden="true" />}
            </motion.button>
          ))}
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
                onClick={() =>
                  setAnswer(
                    step.id,
                    (active ? list.filter((o) => o !== option) : [...list, option]) as never,
                  )
                }
                className={cn(
                  "flex items-center justify-between rounded-xl border px-5 py-4 text-left text-[0.95rem] font-medium shadow-sm transition-colors",
                  active
                    ? "border-accent bg-accent/15 text-primary"
                    : "border-border bg-card text-foreground hover:border-accent/40",
                )}
              >
                {option}
                {active && <Check className="size-4 text-accent" aria-hidden="true" />}
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

      {step.input === "slider" && (
        <div className="pt-2">
          <Slider
            value={[typeof value === "string" && value ? Number(value) : 50]}
            max={100}
            step={5}
            onValueChange={([v]) => setAnswer(step.id, String(v) as never)}
          />
          <div className="mt-3 flex justify-between text-[0.78rem] text-muted-foreground">
            <span>Play it safe</span>
            <span className="font-semibold text-accent">
              {typeof value === "string" && value ? value : 50}
            </span>
            <span>Go all in</span>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        {(step.input === "text" ||
          step.input === "number" ||
          step.input === "textarea" ||
          step.input === "multi-choice" ||
          step.input === "select" ||
          step.input === "searchable-multi" ||
          step.input === "skills" ||
          step.input === "slider") && (
          <PremiumButton
            type="button"
            tone="solid"
            shape="rounded"
            size="lg"
            disabled={
              !canContinueDefault &&
              !(step.input === "text" || step.input === "number" || step.input === "textarea"
                ? localText.trim()
                : false)
            }
            onClick={() => {
              if (step.input === "text" || step.input === "number" || step.input === "textarea") {
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
    </div>
  );
}
