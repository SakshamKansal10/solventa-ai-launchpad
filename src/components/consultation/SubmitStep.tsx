import { useEffect, useRef, useState } from "react";
import { findContradictions } from "@/lib/fit/gaps";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2 } from "lucide-react";

import { getCurrentUser } from "@/lib/actions/auth";
import { completeConsultation } from "@/lib/actions/profile";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { parseDailyLimit } from "@/lib/limits";
import { cn } from "@/lib/utils";
import { clearLocalDraft, useConsultation } from "@/lib/consultation/store";
import { AccountGate } from "./AccountGate";
import { GenerationVisual } from "./GenerationVisual";
import { ScreenBody } from "./ui";

const GEN_STEPS = ["save", "write", "open"] as const;
/** "A minute or two": the calm line shows once two minutes have passed. */
const LONG_AFTER_S = 120;

/** Honest waiting screen (go-live step 4). Every step is real: "Saving your answers" ticks when
 * the save has returned, "Writing your three directions" is the one model request, "Opening your
 * dashboard" is its answer arriving. The time quoted is an upper limit, not the typical time
 * (owner, 2026-11-17: "a minute or two"), and the seconds count up — nothing here claims progress
 * it cannot see. Past two minutes a calm line says it is taking a little longer and the answers
 * are safe; an error shows only when the request has actually failed. */
function GeneratingPanel({ step }: { step: number }) {
  const { t } = useLocale();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);
  // Normal document flow inside the consultation card: the panel reserves its
  // own height, so nothing here can ever cover the banner, header or copy around it.
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="generating"
      className="flex flex-col items-center gap-8 py-2 text-center"
    >
      <div className="flex max-w-md flex-col items-center gap-3">
        <h1 className="sol-h2">{t("consult.generating.title")}</h1>
        <p className="text-[1.0625rem] text-sol-secondary">{t("v2.gen.time")}</p>
        <ol className="flex flex-col items-start gap-2 text-left" data-testid="generating-steps">
          {GEN_STEPS.map((k, i) => (
            <li
              key={k}
              data-state={i < step ? "done" : i === step ? "current" : "next"}
              className={cn(
                "flex min-h-8 items-center gap-2.5 text-[1.0625rem]",
                i <= step ? "text-sol-ink" : "text-sol-muted",
                i === step && "font-semibold",
              )}
            >
              {i < step ? (
                <Check className="size-4 text-sol-navy" aria-hidden="true" />
              ) : i === step ? (
                <Loader2 className="size-4 animate-spin text-sol-cobalt" aria-hidden="true" />
              ) : (
                <span className="size-4" aria-hidden="true" />
              )}
              {t(`v2.gen.step.${k}` as const)}
            </li>
          ))}
        </ol>
        <p
          className="text-[0.9375rem] tabular-nums text-sol-secondary"
          data-testid="generating-elapsed"
        >
          {t("v2.gen.elapsed", { s: elapsed })}
        </p>
        {elapsed >= LONG_AFTER_S && (
          <p className="text-[0.9375rem] text-sol-secondary" data-testid="generating-long">
            {t("consult.generating.long")}
          </p>
        )}
      </div>
      <GenerationVisual />
      <p className="max-w-sm text-[0.9375rem] leading-relaxed text-sol-secondary">
        {t("consult.generating.saved")}
      </p>
    </div>
  );
}

export function SubmitStep({
  autoStart,
  onGeneratingChange,
}: {
  autoStart: boolean;
  onGeneratingChange?: (generating: boolean) => void;
}) {
  const { t, td, locale } = useLocale();
  const navigate = useNavigate();
  const { answers, flush, dismissResumed, goTo } = useConsultation();
  const contradictions = findContradictions(answers);
  const currentUser = useQuery({
    queryKey: ["current-user"],
    queryFn: () => getCurrentUser(),
    staleTime: 5 * 60_000,
  });
  const [phase, setPhase] = useState<"idle" | "generating" | "error">("idle");
  const [limit, setLimit] = useState<number | null>(null);
  const [genStep, setGenStep] = useState(0);
  // A ref, not state: two rapid triggers (a double click, or AccountGate's
  // onAuthenticated racing an auto-start) must see each other's guard synchronously.
  const submitting = useRef(false);
  const autoStarted = useRef(false);

  async function run() {
    if (submitting.current) return;
    submitting.current = true;
    dismissResumed();
    setPhase("generating");
    setGenStep(0);
    try {
      await flush();
      setGenStep(1);
      await completeConsultation({ data: { answers: answers as Record<string, unknown>, locale } });
      setGenStep(2);
      clearLocalDraft();
      await navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("[consultation] submission failed:", err);
      setLimit(parseDailyLimit(err)?.limit ?? null);
      setPhase("error");
    } finally {
      submitting.current = false;
    }
  }

  useEffect(() => {
    onGeneratingChange?.(phase === "generating");
  }, [phase, onGeneratingChange]);

  const signedIn = Boolean(currentUser.data);
  useEffect(() => {
    if (autoStart && signedIn && !autoStarted.current) {
      autoStarted.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, signedIn]);

  if (phase === "generating") return <GeneratingPanel step={genStep} />;

  return (
    <ScreenBody title={t("consult.submit.title")}>
      {/* Answers that do not fit together are asked about, never silently accepted. */}
      {contradictions.length > 0 && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-2xl border border-sol-warning/40 bg-sol-warning-soft p-5"
          data-testid="consult-contradiction"
        >
          <p className="text-[1.0625rem] font-semibold text-sol-ink">{t("v2.contra.title")}</p>
          {contradictions.map((c) => {
            const age = "age" in c ? t("v2.contra.age", { n: c.age }) : null;
            const status = "status" in c ? td(`opt.status.${c.status}`) : null;
            const education = "education" in c ? td(`opt.education.${c.education}`) : null;
            const [a, b] = [age, status, education].filter((x): x is string => Boolean(x));
            return (
              <p key={c.code} className="text-[1rem] text-sol-ink">
                {t("v2.contra.line", { a, b })}
              </p>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => goTo("basics")}
              className="inline-flex h-11 items-center rounded-2xl border border-sol-ink/25 bg-white px-4 text-[1rem] font-semibold text-sol-ink hover:border-sol-ink/50"
              data-testid="contra-fix-basics"
            >
              {t("consult.contra.fixBasics")}
            </button>
            {contradictions.some((c) => "education" in c) && (
              <button
                type="button"
                onClick={() => goTo("education")}
                className="inline-flex h-11 items-center rounded-2xl border border-sol-ink/25 bg-white px-4 text-[1rem] font-semibold text-sol-ink hover:border-sol-ink/50"
              >
                {t("consult.contra.fixEducation")}
              </button>
            )}
          </div>
        </div>
      )}
      {phase === "error" && (
        <div
          role="alert"
          className="rounded-2xl border border-sol-warning/40 bg-sol-warning-soft p-5"
          data-testid="generate-error"
        >
          <p className="text-[1.0625rem] font-semibold text-sol-ink">
            {limit !== null ? t("v2.limit.title") : t("consult.error.title")}
          </p>
          <p
            className="mt-1 text-[1rem] text-sol-ink"
            data-testid={limit !== null ? "daily-limit" : undefined}
          >
            {limit !== null ? t("v2.limit.consultation", { n: limit }) : t("consult.error.body")}
          </p>
          {limit === null && (
            <button
              type="button"
              onClick={run}
              className="mt-4 inline-flex h-12 items-center gap-2 rounded-2xl bg-sol-navy px-6 text-[1rem] font-semibold text-white hover:bg-sol-navy-soft"
            >
              {t("consult.error.retry")}
            </button>
          )}
        </div>
      )}
      {currentUser.isLoading ? (
        <Loader2
          className="size-5 animate-spin text-sol-secondary"
          aria-label={t("common.loading")}
        />
      ) : signedIn ? (
        <>
          <p className="max-w-[60ch] text-[1.0625rem] leading-relaxed text-sol-ink">
            {t("consult.submit.signedInBody")}
          </p>
          <button
            type="button"
            data-testid="find-directions"
            onClick={run}
            className="inline-flex h-14 items-center justify-center gap-2 self-start rounded-2xl bg-sol-navy px-8 text-[1.0625rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft"
          >
            {t("consult.submit.cta")}
            <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <p className="max-w-[60ch] text-[1.0625rem] leading-relaxed text-sol-ink">
            {t("consult.submit.body")}
          </p>
          <AccountGate onAuthenticated={() => void run()} />
        </>
      )}
    </ScreenBody>
  );
}
