import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { QuestionRenderer } from "@/components/onboarding/QuestionRenderer";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding-store";
import type { OnboardingAnswers } from "@/lib/onboarding-types";

export interface FounderProfileRow {
  key: string;
  label: string;
  /** Ordered — some rows are genuinely more than one onboarding question
   * (Location = country then city; Starting capital = investmentBudget,
   * then conditionally preciseCapital). The sheet walks this exact
   * subsequence using the SAME QuestionRenderer/OnboardingProvider
   * machinery the real consultation uses — never a bespoke free-text
   * regression. */
  stepIds: string[];
}

/** Drives ONE onboarding step at a time inside a full OnboardingProvider
 * instance (seeded with the founder's real current answers), stopping
 * the moment the resolved step sequence moves past `row.stepIds` — that
 * transition IS "save," triggered by the founder's own normal Continue
 * click inside QuestionRenderer, never a separate mechanism. */
function SheetFlow({
  row,
  onDone,
}: {
  row: FounderProfileRow;
  onDone: (patch: Partial<OnboardingAnswers>) => void;
}) {
  const { steps, stepIndex, currentStep, answers, goToStep } = useOnboarding();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const startIndex = steps.findIndex((s) => s.kind === "question" && s.id === row.stepIds[0]);
    if (startIndex >= 0) goToStep(startIndex);
    // Runs once, when the sheet first mounts this row — `steps` is a
    // stable resolved list for the seeded answers at that point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentStep.kind !== "question") return;
    const inRow = row.stepIds.includes(currentStep.id);
    if (inRow) {
      setEntered(true);
      return;
    }
    if (!entered) return; // hasn't reached the row's first step yet — ignore
    // Stepped past the last id in this row's subsequence -> the founder
    // just completed it. Extract only the fields this row owns.
    const patch: Partial<OnboardingAnswers> = {};
    for (const id of row.stepIds) {
      if (id in answers) {
        (patch as Record<string, unknown>)[id] = answers[id as keyof OnboardingAnswers];
      }
    }
    onDone(patch);
    // Deliberately fires only when stepIndex actually changes past the row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  if (currentStep.kind !== "question" || !row.stepIds.includes(currentStep.id)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-sol-muted" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <QuestionRenderer step={currentStep} />
    </div>
  );
}

export function FounderProfileEditSheet({
  open,
  onOpenChange,
  row,
  currentAnswers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: FounderProfileRow | null;
  currentAnswers: OnboardingAnswers;
  onSaved: (patch: Partial<OnboardingAnswers>) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-sol-border bg-sol-surface p-[28px] sm:max-w-[440px]"
      >
        <SheetTitle className="font-display text-[1.15rem] font-semibold text-sol-ink">
          Edit {row?.label ?? ""}
        </SheetTitle>
        {open && row && (
          <OnboardingProvider key={row.key} initialAnswers={currentAnswers}>
            <SheetFlow
              row={row}
              onDone={(patch) => {
                onSaved(patch);
                onOpenChange(false);
              }}
            />
          </OnboardingProvider>
        )}
      </SheetContent>
    </Sheet>
  );
}
