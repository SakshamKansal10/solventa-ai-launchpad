import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MissionState } from "@/lib/roadmap/state";
import type { MissionDTO } from "@/lib/roadmap/view";
import { cn } from "@/lib/utils";
import { Button, LinkButton, Pill } from "../ui";

interface MissionText {
  title?: string;
  why?: string;
  doneWhen?: string;
  timeEstimate?: string;
  steps?: string[];
}

const dateOf = (iso: string | null, locale: string) =>
  iso
    ? new Date(iso).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
        day: "numeric",
        month: "short",
      })
    : null;

/** One mission, as a small operating card: the title and time, then — only for
 * the mission that is active — WHY, what to DO, and what to CAPTURE. The other
 * missions stay as compact rows. Starting is one action; finishing is another,
 * and a mission that asks for evidence cannot be finished without it. */
export function MissionCard({
  mission,
  index,
  text,
  opportunityId,
  weekId,
  assumptionId,
  busy,
  locked,
  defaultOpen,
  onState,
}: {
  mission: MissionDTO;
  index: number;
  text?: MissionText;
  opportunityId: string;
  weekId: string;
  /** The assumption this mission's evidence speaks to (preselects the dialog). */
  assumptionId?: string;
  busy: boolean;
  /** A completed week's missions are read-only history. */
  locked: boolean;
  /** The one active mission opens by default; the rest start compact. */
  defaultOpen: boolean;
  onState: (state: MissionState) => void;
}) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const title = text?.title ?? mission.title;
  const steps = (text?.steps && text.steps.length > 0 ? text.steps : mission.steps).slice(0, 4);
  const time = text?.timeEstimate ?? mission.timeEstimate;
  const done = mission.state === "completed";
  const inProgress = mission.state === "in_progress";
  const needsEvidence = mission.evidenceRequired && mission.evidenceCount === 0;
  const completedOn = dateOf(mission.completedAt, locale);
  const pad = String(index + 1).padStart(2, "0");

  const addProof = (
    <LinkButton
      to="/dashboard/proof"
      search={{
        opportunity: opportunityId,
        add: true,
        mission: mission.id,
        week: weekId,
        assumption: assumptionId,
        category: mission.assumptionCategory ?? undefined,
      }}
      variant="secondary"
      size="sm"
      data-testid="mission-add-proof"
    >
      {t("rm.mission.addProof")}
    </LinkButton>
  );

  // The primary action depends on where the mission is and whether it is open.
  const primary = (() => {
    if (locked || done) return null;
    if (mission.state === "not_started")
      return (
        <Button
          size="sm"
          disabled={busy}
          data-testid="mission-primary"
          onClick={() => {
            onState("in_progress");
            setOpen(true);
          }}
        >
          {t("rm.mission.start")}
        </Button>
      );
    if (!open)
      return (
        <Button size="sm" data-testid="mission-primary" onClick={() => setOpen(true)}>
          {t("rm.mission.continue")}
        </Button>
      );
    return (
      <Button
        size="sm"
        disabled={busy || needsEvidence}
        data-testid="mission-complete"
        title={needsEvidence ? t("rm.mission.needEvidenceHint") : undefined}
        onClick={() => onState("completed")}
      >
        {t("rm.mission.markComplete")}
      </Button>
    );
  })();

  return (
    <article
      data-testid="mission-card"
      data-state={mission.state}
      data-evidence={mission.evidenceCount}
      data-open={open}
      aria-label={title}
      className={cn(
        "relative overflow-hidden rounded-[1.25rem] border transition-all duration-[240ms]",
        open && !done
          ? "border-sol-violet/45 bg-sol-surface p-6 shadow-[0_14px_36px_rgba(114,87,216,0.1)]"
          : "border-sol-border bg-sol-surface/70 px-5 py-4",
        done && "border-sol-champagne/50 bg-sol-champagne-soft/30",
      )}
    >
      {open && !done && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sol-violet to-sol-champagne"
        />
      )}

      <div className="relative flex items-center gap-4">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-[0.9375rem] font-bold transition-colors",
            done
              ? "border-sol-champagne bg-sol-champagne text-sol-ink"
              : inProgress
                ? "border-sol-violet bg-sol-violet text-white"
                : "border-sol-border-strong bg-sol-surface text-sol-secondary",
          )}
        >
          {done ? <Check className="size-4" strokeWidth={3} /> : index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="sol-eyebrow flex flex-wrap items-center gap-x-2">
            <span>{t("rm.mission.n", { n: pad })}</span>
            {time && (
              <span className="font-medium normal-case tracking-normal text-sol-secondary">
                · {time}
              </span>
            )}
            {inProgress && !open && (
              <span className="font-semibold normal-case tracking-normal text-sol-violet-deep">
                · {t("rm.mission.in_progress")}
              </span>
            )}
            {done && (
              <span className="font-semibold normal-case tracking-normal text-sol-champagne-deep">
                ·{" "}
                {completedOn
                  ? t("rm.mission.completedOn", { date: completedOn })
                  : t("rm.mission.completed")}
              </span>
            )}
          </p>
          <h3
            className={cn(
              "mt-1 font-display font-semibold leading-[1.2] text-sol-ink",
              open && !done ? "text-[1.625rem]" : "text-[1.25rem]",
            )}
          >
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              data-testid="mission-toggle"
              aria-label={`${title} — ${open ? t("rm.mission.collapse") : t("rm.mission.expand")}`}
              className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-sol-violet/50 focus-visible:after:rounded-[1.25rem]"
            >
              {title}
            </button>
          </h3>
        </div>

        <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-end gap-2">
          {mission.evidenceRequired && !done && (
            <Pill tone="champagne">
              {t("rm.evidenceRequired")}
              {mission.evidenceCount > 0 ? ` · ${mission.evidenceCount}` : ""}
            </Pill>
          )}
          {!mission.required && <Pill tone="neutral">{t("common.optional")}</Pill>}
          {!open && primary}
          <ChevronDown
            className={cn("size-5 text-sol-secondary transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </div>
      </div>

      {open && (
        <div className="relative mt-5 pl-0 sm:pl-[3.25rem]">
          <dl className="grid gap-5" data-testid="mission-details">
            <div>
              <dt className="text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                {t("rm.mission.whyShort")}
              </dt>
              <dd className="mt-1 max-w-[62ch] text-[1.0625rem] leading-relaxed text-sol-ink">
                {text?.why ?? mission.why}
              </dd>
            </div>
            {steps.length > 0 && (
              <div>
                <dt className="text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                  {t("rm.mission.do")}
                </dt>
                <dd>
                  <ul className="mt-1.5 flex flex-col gap-2">
                    {steps.map((s) => (
                      <li key={s} className="flex gap-3 text-[1.0625rem] leading-snug text-sol-ink">
                        <span
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-sol-violet"
                          aria-hidden="true"
                        />
                        {s}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                {t("rm.mission.capture")}
              </dt>
              <dd className="mt-1 max-w-[62ch] text-[1.0625rem] leading-relaxed text-sol-ink">
                {text?.doneWhen ?? mission.doneWhen}
              </dd>
            </div>
          </dl>

          {!locked && (
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {primary}
                {mission.evidenceRequired && !done && addProof}
                {done && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    data-testid="mission-reopen"
                    onClick={() => onState("in_progress")}
                  >
                    {t("rm.mission.reopen")}
                  </Button>
                )}
              </div>
              {needsEvidence && inProgress && (
                <p
                  className="text-[0.9375rem] font-medium text-sol-secondary"
                  data-testid="mission-evidence-hint"
                >
                  {t("rm.mission.needEvidenceHint")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
