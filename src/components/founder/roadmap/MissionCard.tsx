import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

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

/** One mission: a short title, the time it takes, whether it must leave
 * evidence behind, at most four bullets, and real controls — a three-state
 * status, Start/Continue, and (when evidence is required) Add Proof. */
export function MissionCard({
  mission,
  index,
  text,
  opportunityId,
  weekId,
  assumptionId,
  busy,
  locked,
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
  onState: (state: MissionState) => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(mission.state === "in_progress");
  const title = text?.title ?? mission.title;
  const steps = text?.steps && text.steps.length > 0 ? text.steps : mission.steps;
  const done = mission.state === "completed";
  const inProgress = mission.state === "in_progress";

  const states: { id: MissionState; label: string }[] = [
    { id: "not_started", label: t("common.notStarted") },
    { id: "in_progress", label: t("common.inProgress") },
    { id: "completed", label: t("common.completed") },
  ];

  return (
    <article
      data-testid="mission-card"
      data-state={mission.state}
      aria-label={title}
      className={cn(
        "sol-card p-6 transition-colors duration-[240ms]",
        inProgress && "border-sol-violet/60 bg-sol-violet-soft/25",
        done && "border-sol-champagne/50 bg-sol-champagne-soft/30",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="sol-eyebrow">
          {t("rm.mission.n", { n: String(index + 1).padStart(2, "0") })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!mission.required && <Pill tone="neutral">{t("common.optional")}</Pill>}
          {mission.evidenceRequired && (
            <Pill tone="champagne">
              {t("rm.evidenceRequired")}
              {mission.evidenceCount > 0 ? ` · ${mission.evidenceCount}` : ""}
            </Pill>
          )}
        </div>
      </div>

      <h3 className="mt-2 flex items-start gap-3 font-display text-[1.5rem] font-semibold leading-[1.2] text-sol-ink">
        {done && (
          <span
            className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-sol-champagne text-white"
            aria-hidden="true"
          >
            <Check className="size-4" strokeWidth={3} />
          </span>
        )}
        {title}
      </h3>
      {(text?.timeEstimate ?? mission.timeEstimate) && (
        <p className="mt-1.5 text-[1rem] text-sol-secondary">
          {text?.timeEstimate ?? mission.timeEstimate}
        </p>
      )}

      {steps.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
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
      )}

      {open && (
        <dl
          className="mt-4 grid gap-3 rounded-2xl bg-sol-ivory-light p-4"
          data-testid="mission-details"
        >
          <div>
            <dt className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
              {t("rm.mission.why")}
            </dt>
            <dd className="mt-1 text-[1rem] leading-relaxed text-sol-ink">
              {text?.why ?? mission.why}
            </dd>
          </div>
          <div>
            <dt className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
              {t("rm.mission.doneWhen")}
            </dt>
            <dd className="mt-1 text-[1rem] leading-relaxed text-sol-ink">
              {text?.doneWhen ?? mission.doneWhen}
            </dd>
          </div>
        </dl>
      )}

      {!locked && (
        <div className="mt-5 flex flex-col gap-4">
          <div
            role="radiogroup"
            aria-label={t("rm.mission.statusAria", { title })}
            className="inline-flex flex-wrap gap-1.5 rounded-2xl bg-sol-ivory p-1"
          >
            {states.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={mission.state === s.id}
                disabled={busy}
                data-testid={`mission-state-${s.id}`}
                onClick={() => mission.state !== s.id && onState(s.id)}
                className={cn(
                  "min-h-10 rounded-xl px-3.5 text-[0.9375rem] font-semibold transition-colors duration-[180ms] disabled:opacity-60",
                  mission.state === s.id
                    ? s.id === "completed"
                      ? "bg-sol-champagne text-sol-ink"
                      : s.id === "in_progress"
                        ? "bg-sol-violet text-white"
                        : "bg-sol-surface text-sol-ink shadow-sm"
                    : "text-sol-ink hover:bg-sol-surface",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {!done && (
              <Button
                variant="primary"
                onClick={() => {
                  if (mission.state === "not_started") onState("in_progress");
                  setOpen(true);
                }}
                disabled={busy}
                data-testid="mission-primary"
              >
                {inProgress ? t("rm.mission.continue") : t("rm.mission.start")}
              </Button>
            )}
            {mission.evidenceRequired && (
              <LinkButton
                to="/dashboard/proof"
                search={{
                  opportunity: opportunityId,
                  add: true,
                  mission: mission.id,
                  week: weekId,
                  assumption: assumptionId,
                }}
                variant="secondary"
                data-testid="mission-add-proof"
              >
                {t("rm.mission.addProof")}
              </LinkButton>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl px-3 text-[1rem] font-semibold text-sol-violet-deep hover:bg-sol-violet-soft"
            >
              {open ? t("rm.mission.hideDetails") : t("rm.mission.details")}
              <ChevronDown
                className={cn("size-4 transition-transform", open && "rotate-180")}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
