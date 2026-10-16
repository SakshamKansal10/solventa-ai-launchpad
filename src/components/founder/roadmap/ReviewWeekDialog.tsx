import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { closeWeek, type CloseWeekResult } from "@/lib/actions/roadmap";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { WeekDTO } from "@/lib/roadmap/view";
import { cn } from "@/lib/utils";
import { Button } from "../ui";

const OUTCOMES = ["stronger", "as_expected", "weaker", "mixed"] as const;

/** Blockers that actually apply to THIS kind of week — an interview week and a
 * pricing week fail for different reasons, so the chips differ. */
const BLOCKERS: Record<string, string[]> = {
  problem: ["not_enough_people", "friends_only", "unclear_answers", "hard_to_start", "time"],
  willingness_to_pay: [
    "price_objections",
    "no_budget",
    "no_decision_maker",
    "unclear_value",
    "time",
  ],
  distribution: ["no_replies", "wrong_channel", "no_network", "cost", "time"],
  delivery: ["quality", "took_longer", "missing_skill", "cost", "time"],
  other: ["time", "money", "skills", "motivation", "access", "unclear"],
};

export function blockersFor(week: WeekDTO): string[] {
  const categories = week.missions
    .map((m) => m.assumptionCategory)
    .filter((c): c is string => Boolean(c) && c !== "retention");
  const first = categories.find((c) => BLOCKERS[c]) ?? "other";
  return [...BLOCKERS[first], "nothing"];
}

export function ReviewWeekDialog({
  open,
  onOpenChange,
  week,
  nextWeekNumber,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  week: WeekDTO;
  /** Null when this is the roadmap's last week. */
  nextWeekNumber: number | null;
  onDone: (result: CloseWeekResult) => void;
}) {
  const { t, locale } = useLocale();
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number] | null>(null);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const blockers = useMemo(() => blockersFor(week), [week]);

  const close = useMutation({
    mutationFn: () =>
      closeWeek({
        data: {
          weekId: week.id,
          outcome: outcome ?? undefined,
          blocker: blocker && blocker !== "nothing" ? blocker : undefined,
          note: note.trim() || undefined,
          locale,
        },
      }),
    onSuccess: (result) => {
      if (result.result === "generation_failed") {
        toast.error(t("rm.review.genFailed"));
      }
      onDone(result);
      onOpenChange(false);
    },
    onError: (err) => {
      console.error("[roadmap] closing the week failed:", err);
      toast.error(t("rm.review.error"));
    },
  });

  const cta = nextWeekNumber
    ? t("rm.review.prepare", { n: String(nextWeekNumber).padStart(2, "0") })
    : t("rm.review.finish");

  return (
    <Dialog open={open} onOpenChange={(o) => !close.isPending && onOpenChange(o)}>
      <DialogContent
        data-testid="review-week-dialog"
        className="max-h-[92dvh] overflow-y-auto rounded-3xl border-sol-border bg-sol-surface p-6 sm:max-w-[560px] sm:p-8"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-[1.75rem] font-semibold text-sol-ink">
            {t("rm.review.title")}
          </DialogTitle>
          <DialogDescription className="text-[1rem] text-sol-secondary">
            {t("rm.review.body")}
          </DialogDescription>
        </DialogHeader>

        <form
          className="mt-2 flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (outcome && !close.isPending) close.mutate();
          }}
        >
          <fieldset>
            <legend className="text-[1.0625rem] font-semibold text-sol-ink">
              {t("rm.review.happened")}
            </legend>
            <div role="radiogroup" className="mt-3 grid gap-2 sm:grid-cols-2">
              {OUTCOMES.map((o) => (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={outcome === o}
                  data-testid={`outcome-${o}`}
                  onClick={() => setOutcome(o)}
                  className={cn(
                    "min-h-12 rounded-2xl border px-4 text-left text-[1rem] font-semibold transition-colors",
                    outcome === o
                      ? "border-sol-violet bg-sol-violet-soft text-sol-violet-deep"
                      : "border-sol-border bg-sol-surface text-sol-ink hover:border-sol-violet/45",
                  )}
                >
                  {t(`rm.outcome.${o}` as const)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[1.0625rem] font-semibold text-sol-ink">
              {t("rm.review.blocker")}
            </legend>
            <div role="radiogroup" className="mt-3 flex flex-wrap gap-2">
              {blockers.map((b) => (
                <button
                  key={b}
                  type="button"
                  role="radio"
                  aria-checked={blocker === b}
                  data-testid={`blocker-${b}`}
                  onClick={() => setBlocker(blocker === b ? null : b)}
                  className={cn(
                    "min-h-11 rounded-full border px-4 text-[1rem] font-medium transition-colors",
                    blocker === b
                      ? "border-sol-violet bg-sol-violet-soft text-sol-violet-deep"
                      : "border-sol-border bg-sol-surface text-sol-ink hover:border-sol-violet/45",
                  )}
                >
                  {t(`rm.blocker.${b}` as MessageKey)}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="review-note" className="text-[1.0625rem] font-semibold text-sol-ink">
              {t("rm.review.note")}{" "}
              <span className="text-[0.9375rem] font-medium text-sol-secondary">
                ({t("common.optional")})
              </span>
            </label>
            <textarea
              id="review-note"
              data-testid="review-note"
              rows={3}
              maxLength={600}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-2xl border border-sol-border bg-sol-surface px-4 py-3 text-[1rem] text-sol-ink focus-visible:border-sol-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/30"
            />
          </div>

          {close.isError && (
            <p
              role="alert"
              className="rounded-2xl bg-sol-warning-soft px-4 py-3 text-[1rem] text-sol-ink"
            >
              {t("rm.review.error")}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={close.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              loading={close.isPending}
              disabled={!outcome}
              data-testid="prepare-next-week"
            >
              {cta}
            </Button>
          </div>
          {close.isPending && (
            <p role="status" className="text-center text-[0.9375rem] text-sol-secondary">
              {t("rm.review.working")}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
