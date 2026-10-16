import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";

import { getCurrentUser } from "@/lib/actions/auth";
import { completeConsultation } from "@/lib/actions/profile";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { clearLocalDraft, useConsultation } from "@/lib/consultation/store";
import { AccountGate } from "./AccountGate";
import { GenerationVisual } from "./GenerationVisual";
import { ScreenBody } from "./ui";

const STATUS_KEYS = [
  "consult.generating.s1",
  "consult.generating.s2",
  "consult.generating.s3",
  "consult.generating.s4",
  "consult.generating.s5",
] as const;

/** Honest waiting screen. The one real request can take up to a minute; the
 * lines below just narrate what Solventia is doing while it runs and rotate on
 * a timer — nothing here ever claims completion, and there is no progress
 * bar or percentage to fake. The screen leaves only when the request actually
 * resolves (see SubmitStep). */
function GeneratingPanel() {
  const { t } = useLocale();
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => Math.min(n + 1, STATUS_KEYS.length - 1)), 4500);
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
        <p
          className="flex min-h-[1.75rem] items-center gap-2 text-[1.0625rem] text-sol-ink"
          key={i}
        >
          <Loader2 className="size-4 animate-spin text-sol-violet" aria-hidden="true" />
          {t(STATUS_KEYS[i])}
        </p>
        {i === STATUS_KEYS.length - 1 && (
          <p className="text-[0.9375rem] text-sol-secondary">{t("consult.generating.long")}</p>
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
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const { answers, flush, dismissResumed } = useConsultation();
  const currentUser = useQuery({
    queryKey: ["current-user"],
    queryFn: () => getCurrentUser(),
    staleTime: 5 * 60_000,
  });
  const [phase, setPhase] = useState<"idle" | "generating" | "error">("idle");
  // A ref, not state: two rapid triggers (a double click, or AccountGate's
  // onAuthenticated racing an auto-start) must see each other's guard synchronously.
  const submitting = useRef(false);
  const autoStarted = useRef(false);

  async function run() {
    if (submitting.current) return;
    submitting.current = true;
    dismissResumed();
    setPhase("generating");
    try {
      await flush();
      await completeConsultation({ data: { answers: answers as Record<string, unknown>, locale } });
      clearLocalDraft();
      await navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("[consultation] submission failed:", err);
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

  if (phase === "generating") return <GeneratingPanel />;

  return (
    <ScreenBody title={t("consult.submit.title")}>
      {phase === "error" && (
        <div
          role="alert"
          className="rounded-2xl border border-sol-warning/40 bg-sol-warning-soft p-5"
          data-testid="generate-error"
        >
          <p className="text-[1.0625rem] font-semibold text-sol-ink">{t("consult.error.title")}</p>
          <p className="mt-1 text-[1rem] text-sol-ink">{t("consult.error.body")}</p>
          <button
            type="button"
            onClick={run}
            className="mt-4 inline-flex h-12 items-center gap-2 rounded-2xl bg-sol-navy px-6 text-[1rem] font-semibold text-white hover:bg-sol-navy-soft"
          >
            {t("consult.error.retry")}
          </button>
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
