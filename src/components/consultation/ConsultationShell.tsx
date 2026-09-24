import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, UserRound, X } from "lucide-react";

import mark from "@/assets/solventia-mark.png";
import { LanguageSwitcher } from "@/components/solventia/LanguageSwitcher";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { STAGE_COUNT, STAGE_IDS } from "@/lib/consultation/model";
import { useConsultation } from "@/lib/consultation/store";
import { cn } from "@/lib/utils";
import { ProfileSignals } from "./ProfileSignals";
import { ScreenView } from "./ScreenView";
import { SubmitStep } from "./SubmitStep";

/** Seven segments — champagne once a stage is behind you, violet for the one
 * you're in, ivory for what's ahead. A plain progress line, never a percentage. */
function StageProgress({ stage }: { stage: number }) {
  const { t } = useLocale();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-md">
      <p className="text-[0.9375rem] font-semibold text-sol-ink" data-testid="stage-label">
        {t("consult.stageOf", { n: stage, total: STAGE_COUNT })}
        <span className="ml-2 hidden font-medium text-sol-secondary sm:inline">
          · {t(`consult.stage.${STAGE_IDS[stage - 1]}` as const)}
        </span>
      </p>
      <div
        role="progressbar"
        aria-label={t("consult.progressAria")}
        aria-valuemin={1}
        aria-valuemax={STAGE_COUNT}
        aria-valuenow={stage}
        aria-valuetext={t("consult.stageOf", { n: stage, total: STAGE_COUNT })}
        className="flex gap-1.5"
      >
        {STAGE_IDS.map((id, i) => (
          <span
            key={id}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-[240ms]",
              i + 1 < stage && "bg-sol-champagne",
              i + 1 === stage && "bg-sol-violet",
              i + 1 > stage && "bg-sol-ivory-depth",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function ConsultationShell({
  editMode,
  autoSubmit,
}: {
  editMode: boolean;
  autoSubmit: boolean;
}) {
  const { t } = useLocale();
  const c = useConsultation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const stage = c.stage;
  const isFirst = c.index === 0 && !c.isSubmitStep;
  const isLast = c.index === c.screens.length - 1;

  return (
    <div className="min-h-dvh w-full bg-sol-pearl text-sol-ink">
      <a
        href="#consultation-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-sol-navy focus:px-4 focus:py-2 focus:text-white"
      >
        {t("common.skipToContent")}
      </a>

      <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-sol-border bg-sol-pearl/95 px-4 backdrop-blur sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label={t("nav.homeAria")}>
          <img src={mark} alt="" width={298} height={436} className="h-9 w-auto" />
          <span className="hidden font-display text-[1.25rem] font-semibold tracking-[0.2em] text-sol-ink md:block">
            SOLVENTIA
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-center">
          <StageProgress stage={stage} />
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-sol-border px-3 text-[0.9375rem] font-medium text-sol-ink hover:border-sol-violet/45 xl:hidden"
              >
                <UserRound className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("consult.panel.open")}</span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(92vw,22rem)] border-sol-border bg-sol-pearl p-5"
            >
              <SheetTitle className="sr-only">{t("consult.panel.title")}</SheetTitle>
              <SheetDescription className="sr-only">{t("consult.panel.empty")}</SheetDescription>
              <ProfileSignals className="mt-6 border-0 bg-transparent p-0" />
            </SheetContent>
          </Sheet>
          <Link
            to={editMode ? "/dashboard/settings" : "/"}
            aria-label={t("consult.exit")}
            className="flex size-10 items-center justify-center rounded-full border border-sol-border text-sol-secondary hover:border-sol-violet/45 hover:text-sol-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-8 sm:px-8 sm:py-12 xl:grid-cols-[minmax(0,1fr)_300px]">
        <main id="consultation-main" className="mx-auto w-full max-w-[680px] xl:mx-0 xl:max-w-none">
          <div className="mx-auto w-full max-w-[680px] xl:mx-auto">
            {c.resumed && (
              <div
                role="status"
                data-testid="resumed-note"
                className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sol-violet/25 bg-sol-violet-soft px-4 py-3 text-[1rem] text-sol-ink"
              >
                <span>{t("consult.resumed")}</span>
                <button
                  type="button"
                  className="font-semibold text-sol-violet-deep underline-offset-4 hover:underline"
                  onClick={() => setConfirmRestart(true)}
                >
                  {t("consult.startOver")}
                </button>
              </div>
            )}

            {!c.ready ? (
              <div
                className="sol-card-feature h-[26rem] animate-pulse p-10"
                aria-busy="true"
                aria-label={t("common.loading")}
                data-testid="consultation-loading"
              />
            ) : (
              <>
                <div
                  key={c.isSubmitStep ? "submit" : (c.current?.key ?? "none")}
                  className="sol-card-feature sol-reveal p-6 sm:p-10"
                  data-testid={`screen-${c.isSubmitStep ? "submit" : c.current?.key}`}
                >
                  {c.isSubmitStep ? (
                    <SubmitStep autoStart={autoSubmit} />
                  ) : c.current ? (
                    <ScreenView screenKey={c.current.key} />
                  ) : null}
                </div>

                {!c.isSubmitStep && (
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={c.goBack}
                      disabled={isFirst}
                      data-testid="btn-back"
                      className="inline-flex min-h-12 items-center gap-2 rounded-2xl px-4 text-[1rem] font-semibold text-sol-ink transition-colors hover:bg-sol-ivory disabled:pointer-events-none disabled:opacity-40"
                    >
                      <ArrowLeft className="size-4" aria-hidden="true" />
                      {t("consult.back")}
                    </button>
                    <button
                      type="button"
                      onClick={c.goNext}
                      disabled={!c.canContinue}
                      data-testid="btn-continue"
                      className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-sol-navy px-7 text-[1rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isLast ? t("consult.findDirections") : t("consult.continue")}
                      <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
                    </button>
                  </div>
                )}
                {c.isSubmitStep && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={c.goBack}
                      data-testid="btn-back"
                      className="inline-flex min-h-12 items-center gap-2 rounded-2xl px-4 text-[1rem] font-semibold text-sol-ink hover:bg-sol-ivory"
                    >
                      <ArrowLeft className="size-4" aria-hidden="true" />
                      {t("consult.back")}
                    </button>
                  </div>
                )}

                <p
                  className="mt-4 min-h-6 text-center text-[0.875rem] text-sol-secondary"
                  aria-live="polite"
                  data-testid="autosave-status"
                >
                  {c.saveState === "saving" && t("consult.autosave.saving")}
                  {c.saveState === "saved" && t("consult.autosave.saved")}
                  {c.saveState === "local" && t("consult.autosave.local")}
                  {c.saveState === "failed" && t("consult.autosave.failed")}
                </p>
              </>
            )}
          </div>
        </main>

        <div className="hidden xl:block">
          <div className="sticky top-24">
            <ProfileSignals />
          </div>
        </div>
      </div>

      <AlertDialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("consult.startOver")}</AlertDialogTitle>
            <AlertDialogDescription>{t("consult.startOverConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                c.restart();
                setConfirmRestart(false);
              }}
            >
              {t("consult.startOver")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
