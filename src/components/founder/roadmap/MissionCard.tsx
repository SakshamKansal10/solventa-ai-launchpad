import { useState } from "react";
import {
  ChevronDown,
  Check,
  Clock,
  Compass,
  Search,
  Tag,
  Users,
  Wallet,
  Route,
  Repeat,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MissionState } from "@/lib/roadmap/state";
import type { MissionDTO } from "@/lib/roadmap/view";
import { cn } from "@/lib/utils";
import { Button, LinkButton, Pill } from "../ui";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  problem: Search,
  willingness_to_pay: Wallet,
  distribution: Route,
  delivery: Route,
  retention: Repeat,
  pricing: Tag,
  competition: ShieldCheck,
  customer: Users,
};

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
  const steps = (text?.steps && text.steps.length > 0 ? text.steps : mission.steps).slice(0, 3);
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

  const Icon = CATEGORY_ICON[mission.assumptionCategory ?? ""] ?? Compass;

  return (
    <article
      data-testid="mission-card"
      data-state={mission.state}
      data-evidence={mission.evidenceCount}
      data-open={open}
      aria-label={title}
      className="relative pl-[3.75rem] sm:pl-[4.25rem]"
    >
      {/* the expedition line: gold once this stop is reached, lavender ahead */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-[1.3125rem] top-12 -bottom-6 w-px group-last/li:hidden",
          done ? "bg-sol-champagne" : "bg-sol-violet/20",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-0 flex size-[2.625rem] items-center justify-center rounded-full border transition-all duration-500",
          done
            ? "sol-complete-glow border-sol-champagne bg-gradient-to-br from-[#f3e2bd] to-sol-champagne text-sol-ink"
            : inProgress
              ? "border-sol-violet bg-sol-violet text-white shadow-[0_0_0_5px_rgba(118,85,245,0.14)]"
              : "border-sol-violet/30 bg-sol-surface text-sol-violet-deep",
        )}
      >
        {done ? (
          <Check className="size-5" strokeWidth={3} aria-hidden="true" />
        ) : (
          <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
        )}
      </span>

      <div
        className={cn(
          "relative rounded-2xl transition-colors duration-300",
          open && !done
            ? "bg-[linear-gradient(135deg,#faf7ff_0%,#fffdfb_100%)] p-4 shadow-[0_0_0_1px_rgba(118,85,245,0.2),0_14px_34px_-24px_rgba(88,64,185,0.5)] sm:p-5"
            : "px-1 py-1.5 hover:bg-sol-violet-ultralight/60 sm:px-3",
        )}
      >
        <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1 basis-56">
            <p className="sol-eyebrow flex flex-wrap items-center gap-x-2 !text-[0.6875rem]">
              <span>{t("rm.mission.n", { n: pad })}</span>
              {inProgress && (
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
            <h3 className="mt-0.5 text-[1.0625rem] font-semibold leading-snug text-sol-ink sm:text-[1.125rem]">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                data-testid="mission-toggle"
                aria-label={`${title} — ${open ? t("rm.mission.collapse") : t("rm.mission.expand")}`}
                className={cn(
                  "text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-sol-violet/50",
                  done && "text-sol-ink/70",
                )}
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
            {time && (
              <span className="mr-1 inline-flex items-center gap-1.5 text-[0.8125rem] text-sol-secondary">
                <Clock className="size-3.5" aria-hidden="true" />
                {time}
              </span>
            )}
            {!open && primary}
            <ChevronDown
              className={cn(
                "size-5 text-sol-secondary transition-transform duration-300",
                open && "rotate-180",
              )}
              aria-hidden="true"
            />
          </div>
        </div>

        {open && (
          <div className="sol-reveal relative mt-4">
            <dl className="grid gap-4" data-testid="mission-details">
              <div className="min-w-0">
                <dt className="sr-only">{t("rm.mission.whyShort")}</dt>
                <dd className="max-w-[62ch] text-[0.9375rem] leading-snug text-sol-ink/90">
                  {text?.why ?? mission.why}
                </dd>
              </div>
              {steps.length > 0 && (
                <div className="min-w-0">
                  <dt className="sr-only">{t("rm.mission.do")}</dt>
                  <dd>
                    <ol className="flex flex-col gap-2">
                      {steps.map((s, i) => (
                        <li
                          key={s}
                          className="flex items-start gap-3 text-[0.9375rem] leading-snug text-sol-ink"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-[1px] flex size-5 shrink-0 items-center justify-center rounded-full bg-sol-violet-soft text-[0.6875rem] font-semibold text-sol-violet-deep"
                          >
                            {i + 1}
                          </span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </dd>
                </div>
              )}
              <div className="flex min-w-0 items-start gap-2.5 border-t border-sol-border/70 pt-3">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-sol-champagne-deep"
                  aria-hidden="true"
                />
                <dt className="sr-only">{t("rm.mission.capture")}</dt>
                <dd className="min-w-0 max-w-[62ch] text-[0.875rem] leading-snug text-sol-secondary">
                  {text?.doneWhen ?? mission.doneWhen}
                </dd>
              </div>
            </dl>

            {!locked && (
              <div className="mt-5 flex flex-col gap-3">
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
                    className="text-[0.875rem] font-medium text-sol-secondary"
                    data-testid="mission-evidence-hint"
                  >
                    {t("rm.mission.needEvidenceHint")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
