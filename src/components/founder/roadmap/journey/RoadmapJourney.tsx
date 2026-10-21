import { ArrowRight, CalendarDays, Check, Lock } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type RefObject,
} from "react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useTranslatedTitle } from "@/lib/use-translation";
import type { PhaseDTO, RoadmapView } from "@/lib/roadmap/view";
import { cn } from "@/lib/utils";
import type { useRoadmapText } from "../text";

type RoadmapText = ReturnType<typeof useRoadmapText>;

/** Where each phase sits on the founder's path: test demand, build what the evidence
 * supports, then grow it. Phase keys come from the generated roadmap. */
export type Stage = "validate" | "build" | "elevate";
export function stageOf(key: string): Stage {
  if (key === "build" || key === "launch") return "build";
  if (key === "improve") return "elevate";
  return "validate";
}

/** The roadmap at a glance: a header naming the direction, every phase on one
 * VALIDATE → BUILD → ELEVATE path (all phases, full titles, real states), and the
 * details panel of the selected phase. Plain HTML — no 3D, nothing hidden. */
/** The direction's name in the reader's language (the same cached translation as elsewhere). */
function DirectionTitle({ id, title }: { id: string; title: string }) {
  return <>{useTranslatedTitle(id, title) ?? title}</>;
}

export function RoadmapJourney({
  view,
  text,
  selectedPhaseId,
  northStar,
  onSelectPhase,
  onOpenWeek,
}: {
  view: RoadmapView;
  text: RoadmapText;
  /** Phase picked via the URL, or null to follow the current phase. */
  selectedPhaseId: string | null;
  northStar: string | null;
  /** `week` is the global week number to show for the chosen phase. */
  onSelectPhase: (id: string | null, week?: number) => void;
  onOpenWeek: (n: number) => void;
}) {
  const { t } = useLocale();
  const visiblePhases = view.phases;
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const notchRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const currentWeek = view.weeks.find((w) => w.id === view.currentWeekId) ?? null;
  const currentPhaseNumber = view.currentPhaseId
    ? view.phases.findIndex((p) => p.id === view.currentPhaseId) + 1
    : null;
  const selectedIndex = Math.max(
    0,
    view.phases.findIndex((p) => p.id === (selectedPhaseId ?? view.currentPhaseId)),
  );
  const selected = view.phases[selectedIndex];

  // Keep the panel's notch under the selected island while the camera settles.
  useEffect(() => {
    let raf = 0;
    const place = () => {
      const label = labelRefs.current[selectedIndex];
      const panel = panelRef.current;
      const notch = notchRef.current;
      if (!label || !panel || !notch) return;
      const l = label.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      const x = Math.min(p.width - 32, Math.max(32, l.left + l.width / 2 - p.left));
      notch.style.left = `${x}px`;
    };
    const start = performance.now();
    const loop = () => {
      place();
      if (performance.now() - start < 1600) raf = requestAnimationFrame(loop);
    };
    loop();
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
    };
  }, [selectedIndex]);

  const choose = (i: number) => {
    const p = view.phases[i];
    if (p.state === "current") return onSelectPhase(null);
    const weeks = view.weeks.filter((w) => w.phaseId === p.id);
    // A completed phase opens on its first week; a locked one has no week to open.
    onSelectPhase(p.id, p.state === "completed" ? weeks[0]?.number : undefined);
  };

  return (
    <section
      className="flex flex-col gap-5"
      data-testid="roadmap-header"
      aria-labelledby="journey-title"
    >
      <div className="relative overflow-hidden rounded-[1.5rem] border border-sol-border bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fa_100%)]">
        <header className="relative z-20 flex flex-wrap items-start justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-7">
          <div className="min-w-0">
            <h1 id="journey-title" className="sol-page-title">
              {t("rm.journey.title")}
            </h1>
            <p
              className="mt-1 text-[1rem] font-medium text-sol-ink"
              data-testid="roadmap-direction"
            >
              <DirectionTitle
                id={view.roadmap.opportunityId}
                title={view.roadmap.opportunityTitle}
              />
            </p>
            <p className="mt-1 text-[0.9375rem] text-sol-secondary">{t("rm.journey.subtitle")}</p>
            {northStar && (
              <p
                className="mt-2 max-w-[70ch] text-[0.9375rem] text-sol-ink/80"
                data-testid="north-star"
              >
                {northStar}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="roadmap-now">
              <p
                className="flex items-center gap-2 rounded-full border border-sol-border bg-sol-surface/80 px-3 py-1 text-[0.8125rem] font-medium text-sol-ink"
                data-testid="current-week-number"
              >
                <span className="size-2 rounded-full bg-sol-cobalt" aria-hidden="true" />
                {currentWeek && currentPhaseNumber
                  ? t("rm.header.currentValue", {
                      phase: currentPhaseNumber,
                      week: String(currentWeek.number).padStart(2, "0"),
                    })
                  : "—"}
              </p>
              {currentWeek && (
                <>
                  <span className="flex items-center gap-2 rounded-full border border-sol-border bg-sol-surface/80 px-3 py-1 text-[0.8125rem] font-medium text-sol-ink">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {t("rm.header.weekOf", {
                      n: String(currentWeek.number).padStart(2, "0"),
                      total: view.weeks.length,
                    })}
                  </span>
                  <button
                    type="button"
                    data-testid="next-checkpoint"
                    onClick={() => onOpenWeek(currentWeek.number)}
                    className="flex items-center gap-1.5 rounded-full border border-sol-border bg-sol-surface/80 px-3 py-1 text-[0.8125rem] font-medium text-sol-cobalt-deep transition-colors hover:border-sol-cobalt/50"
                  >
                    {t("rm.week.review")}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <nav
          aria-label={t("rm.phases.aria")}
          data-testid="phase-strip"
          className="relative z-10 px-6 pb-2 pt-6 sm:px-8"
        >
          <ol className="relative grid gap-3 @4xl:auto-cols-fr @4xl:grid-flow-col">
            {/* The path itself: one line joining every phase, in order. */}
            <span
              aria-hidden="true"
              className="absolute left-5 top-4 bottom-4 w-px bg-sol-border-strong @4xl:left-4 @4xl:right-4 @4xl:top-5 @4xl:bottom-auto @4xl:h-px @4xl:w-auto"
            />
            {visiblePhases.map((p, i) => (
              <li
                key={p.id}
                ref={(el) => {
                  labelRefs.current[i] = el;
                }}
                className="relative min-w-0"
              >
                <PhaseLabel
                  phase={p}
                  index={i}
                  text={text}
                  active={i === selectedIndex}
                  onClick={() => choose(i)}
                />
              </li>
            ))}
          </ol>
        </nav>

        {selected && (
          <PhaseDetailsPanel
            notchRef={notchRef}
            panelRef={panelRef}
            view={view}
            phase={selected}
            index={selectedIndex}
            text={text}
            locked={selected.state === "future"}
            lockedBy={selectedIndex > 0 ? selectedIndex : null}
            onOpenWeek={onOpenWeek}
          />
        )}
      </div>
    </section>
  );
}

/** Forwards its ref and any extra props (hover/focus listeners, from
 * HoverCardTrigger's asChild) straight onto the button, so the hover card
 * in PhaseIsland actually receives pointer/focus events. */
const PhaseLabel = forwardRef<
  HTMLButtonElement,
  {
    phase: PhaseDTO;
    index: number;
    text: RoadmapText;
    active: boolean;
    onClick: () => void;
  } & ComponentPropsWithoutRef<"button">
>(function PhaseLabel({ phase, index, text, active, onClick, className, ...rest }, ref) {
  const { t } = useLocale();
  const title = text.phaseTitle(phase.id, phase.title);
  return (
    <button
      ref={ref}
      type="button"
      data-testid={`phase-${index + 1}`}
      data-state={phase.state}
      aria-current={phase.state === "current" ? "step" : undefined}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative flex w-full items-start gap-3 rounded-2xl border bg-sol-surface p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sol-cobalt/50 @4xl:flex-col @4xl:gap-2",
        active
          ? "border-sol-cobalt shadow-[0_8px_24px_-12px_rgba(49,94,219,0.45)]"
          : "border-sol-border hover:border-sol-cobalt/40",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border-2 bg-sol-surface",
          phase.state === "completed"
            ? "border-sol-champagne bg-sol-champagne text-white"
            : phase.state === "current"
              ? "border-sol-cobalt"
              : "border-dashed border-sol-border-strong",
        )}
      >
        {phase.state === "completed" && <Check className="size-3" strokeWidth={3} />}
        {phase.state === "current" && <span className="size-2 rounded-full bg-sol-cobalt" />}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-sol-secondary">
          {t(`rm.stage.${stageOf(phase.key)}` as const)}
          <span className="font-medium normal-case tracking-normal tabular-nums">
            {t("rm.phase.n", { n: index + 1 })}
          </span>
        </span>
        <span
          className={cn(
            "mt-0.5 block text-[0.9375rem] font-semibold leading-snug",
            phase.state === "future" && !active ? "text-sol-secondary" : "text-sol-ink",
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-sol-secondary">
          {t(
            phase.state === "completed"
              ? "rm.state.completed"
              : phase.state === "current"
                ? "rm.journey.here"
                : "rm.stage.provisional",
          )}
          {phase.range && (
            <span>
              · {t("common.weeksRange", { from: phase.range.first, to: phase.range.last })}
            </span>
          )}
        </span>
      </span>
    </button>
  );
});

/** Details for the selected phase: one surface, joined to the scene by a notch
 * that tracks the selected island, with real week states and mission counts. */
function PhaseDetailsPanel({
  view,
  phase,
  index,
  text,
  locked,
  lockedBy,
  onOpenWeek,
  notchRef,
  panelRef,
}: {
  view: RoadmapView;
  phase: PhaseDTO;
  index: number;
  text: RoadmapText;
  locked: boolean;
  /** Number of the phase that must be finished first. */
  lockedBy: number | null;
  onOpenWeek: (n: number) => void;
  notchRef: RefObject<HTMLSpanElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useLocale();
  const weeks = view.weeks.filter((w) => w.phaseId === phase.id);
  const missionTotal = weeks.reduce((n, w) => n + w.progress.total, 0);
  const missionDone = weeks.reduce((n, w) => n + w.progress.completed, 0);
  const weeksDone = weeks.filter((w) => w.state === "completed").length;
  const pct =
    missionTotal > 0 ? missionDone / missionTotal : weeks.length ? weeksDone / weeks.length : 0;
  return (
    <div className="relative z-10 mx-4 mb-4 mt-1 sm:mx-6 sm:mb-6">
      <div
        ref={panelRef}
        className="relative rounded-3xl border border-sol-border bg-sol-surface p-5 shadow-[0_18px_44px_-28px_rgba(16,28,50,0.2)] sm:p-7"
        data-testid={locked ? "phase-preview" : "phase-details"}
        data-locked={locked || undefined}
        aria-live="polite"
      >
        <span
          ref={notchRef}
          aria-hidden="true"
          className="absolute -top-[8px] size-4 -translate-x-1/2 rotate-45 border-l border-t border-sol-border bg-[#fffdfb] transition-[left] duration-700 ease-out"
          style={{ left: "50%" }}
        />
        <div className="grid gap-x-10 gap-y-6 @2xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="sol-eyebrow !text-[0.8125rem]">{t("rm.phase.n", { n: index + 1 })}</p>
            <h2 className="mt-1 font-semibold !text-[1.5rem] leading-tight text-sol-ink">
              {text.phaseTitle(phase.id, phase.title)}
            </h2>
            {phase.description && (
              <p className="mt-2 line-clamp-2 text-[0.875rem] leading-snug text-sol-secondary">
                {phase.description}
              </p>
            )}
            <div className="mt-5">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-sol-cobalt-soft"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct * 100)}
                aria-label={t("rm.phase.progress", { x: weeksDone, y: weeks.length })}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sol-cobalt to-sol-champagne transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.round(pct * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[0.8125rem] text-sol-secondary">
                {t("rm.phase.progress", { x: weeksDone, y: weeks.length })}
                {missionTotal > 0 && (
                  <> · {t("rm.journey.missionsDone", { x: missionDone, y: missionTotal })}</>
                )}
              </p>
            </div>
            <ol className="mt-4 flex flex-wrap items-center gap-y-2">
              {weeks.map((w, i) => (
                <li key={w.id} className="flex items-center">
                  {i > 0 && (
                    <span
                      className={cn(
                        "h-px w-5 sm:w-8",
                        w.state === "locked" ? "bg-sol-border" : "bg-sol-champagne",
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <button
                    type="button"
                    data-testid={`phase-week-${w.number}`}
                    disabled={locked || w.state === "locked"}
                    onClick={() => onOpenWeek(w.number)}
                    aria-label={t("common.weekN", { n: String(w.number).padStart(2, "0") })}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full border text-[0.8125rem] font-semibold transition-all duration-300 disabled:cursor-default",
                      w.id === view.currentWeekId
                        ? "border-sol-cobalt bg-sol-cobalt text-white shadow-[0_0_0_4px_rgba(49,94,219,0.16)]"
                        : w.state === "completed"
                          ? "border-sol-champagne bg-sol-champagne text-sol-ink"
                          : w.state === "locked"
                            ? "border-sol-border-strong bg-sol-surface text-sol-secondary"
                            : "border-sol-cobalt/50 bg-sol-cobalt-soft text-sol-cobalt-deep",
                    )}
                  >
                    {w.state === "completed" ? (
                      <Check className="size-3.5" strokeWidth={3} />
                    ) : (
                      w.number
                    )}
                  </button>
                </li>
              ))}
            </ol>
            {locked && (
              <p
                className="mt-5 flex items-center gap-2 text-[0.875rem] font-medium text-sol-secondary"
                data-testid="phase-locked-note"
              >
                <Lock className="size-4 shrink-0" aria-hidden="true" />
                {lockedBy ? t("rm.phase.lockedBody", { n: lockedBy }) : t("rm.state.locked")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
