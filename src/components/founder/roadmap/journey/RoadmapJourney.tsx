import { ArrowRight, CalendarDays, Check, Lock } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type RefObject,
} from "react";

import { Gem3D } from "@/components/founder/three/Gem3D";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { PhaseDTO, RoadmapView } from "@/lib/roadmap/view";
import { cn } from "@/lib/utils";
import type { useRoadmapText } from "../text";

type RoadmapText = ReturnType<typeof useRoadmapText>;

/** The three mountain peaks shown on the journey scene: centre and radii of
 * each island's base (1280×720 units) and its tilt in degrees. Only the
 * first three phases ever get a peak — later phases stay reachable from
 * History, but the scene itself never grows past three. */
const ISLANDS = [
  { cx: 290, cy: 560, rx: 300, ry: 55, rot: -10 },
  { cx: 737, cy: 468, rx: 100, ry: 20, rot: -3 },
  { cx: 1005, cy: 228, rx: 225, ry: 12, rot: 1 },
] as const;
const STAGE_W = 1280;
const STAGE_H = 720;

/** The signature roadmap view: a header, a 3D journey of phase islands with
 * HTML labels pinned underneath, and the details panel of the selected phase.
 * All state shown here comes from the roadmap view; the only local state is
 * which hover is active. */
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
  const visiblePhases = view.phases.slice(0, ISLANDS.length);
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
      <div className="relative overflow-hidden rounded-[1.5rem] border border-sol-border bg-[linear-gradient(180deg,#d6c9ee_0%,#e3cbea_22%,#f0d0dd_55%,#f8e6dc_100%)]">
        <header className="relative z-20 flex flex-wrap items-start justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-7">
          <div className="min-w-0">
            <p className="sol-eyebrow flex items-center gap-2 !text-[0.6875rem] !uppercase !tracking-[0.14em]">
              <span className="h-3 w-0.5 rounded-full bg-sol-violet" aria-hidden="true" />
              {t("rm.journey.eyebrow")}
            </p>
            <h1 id="journey-title" className="sol-page-title mt-1">
              {t("rm.journey.title")}
            </h1>
            <p className="mt-1 text-[0.875rem] text-sol-ink/75">{t("rm.journey.subtitle")}</p>
            {northStar && (
              <p
                className="mt-2 line-clamp-1 max-w-[60ch] text-[0.8125rem] text-sol-ink/80"
                data-testid="north-star"
                title={northStar}
              >
                {northStar}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="roadmap-now">
              <p
                className="flex items-center gap-2 rounded-full border border-sol-border bg-sol-surface/80 px-3 py-1 text-[0.8125rem] font-medium text-sol-ink"
                data-testid="current-week-number"
              >
                <span className="size-2 rounded-full bg-sol-violet" aria-hidden="true" />
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
                    className="flex items-center gap-1.5 rounded-full border border-sol-border bg-sol-surface/80 px-3 py-1 text-[0.8125rem] font-medium text-sol-violet-deep transition-colors hover:border-sol-violet/50"
                  >
                    {t("rm.week.review")}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="overflow-x-auto">
          <div
            className="relative aspect-[16/9] min-w-[780px]"
            role="group"
            aria-label={t("rm.journey.sceneAria", { n: visiblePhases.length })}
          >
            <img
              src="/images/roadmap-floating-islands-reference.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute inset-0 size-full select-none object-cover [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_92%,transparent)]"
            />
            <nav
              aria-label={t("rm.phases.aria")}
              data-testid="phase-strip"
              className="pointer-events-none absolute inset-0"
            >
              <ol>
                {visiblePhases.map((p, i) => {
                  const o = ISLANDS[i];
                  return (
                    <li
                      key={p.id}
                      ref={(el) => {
                        labelRefs.current[i] = el;
                      }}
                      className="absolute -translate-x-1/2 -translate-y-full"
                      style={{
                        left: `${(o.cx / STAGE_W) * 100}%`,
                        top: `${((o.cy - o.ry * 2.4) / STAGE_H) * 100}%`,
                      }}
                    >
                      <PhaseIsland
                        view={view}
                        phase={p}
                        index={i}
                        text={text}
                        active={i === selectedIndex}
                        onClick={() => choose(i)}
                      />
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        </div>

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

/** A phase's peak label, plus a hover card that pops up a small 3D preview of
 * that phase's progress instead of the old ambient glow. */
function PhaseIsland({
  view,
  phase,
  index,
  text,
  active,
  onClick,
}: {
  view: RoadmapView;
  phase: PhaseDTO;
  index: number;
  text: RoadmapText;
  active: boolean;
  onClick: () => void;
}) {
  const { t } = useLocale();
  const weeks = view.weeks.filter((w) => w.phaseId === phase.id);
  const missionTotal = weeks.reduce((n, w) => n + w.progress.total, 0);
  const missionDone = weeks.reduce((n, w) => n + w.progress.completed, 0);
  const weeksDone = weeks.filter((w) => w.state === "completed").length;
  const pct =
    missionTotal > 0 ? missionDone / missionTotal : weeks.length ? weeksDone / weeks.length : 0;

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <PhaseLabel phase={phase} index={index} text={text} active={active} onClick={onClick} />
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="center"
        sideOffset={10}
        className="w-72 origin-(--radix-hover-card-content-transform-origin) overflow-hidden rounded-2xl border border-sol-border bg-[linear-gradient(160deg,#fffdfb_0%,#f3ecfb_100%)] p-0 shadow-[0_28px_60px_-24px_rgba(88,64,185,0.55)] [transform:perspective(900px)_rotateX(4deg)]"
      >
        <div className="flex items-start gap-3 p-4">
          <Gem3D variant="crystal" className="size-12 shrink-0" />
          <div className="min-w-0">
            <p className="sol-eyebrow !text-[0.625rem] !tracking-[0.12em]">
              {t("rm.phase.n", { n: index + 1 })}
            </p>
            <p className="mt-0.5 font-semibold text-[0.9375rem] leading-tight text-sol-ink">
              {text.phaseTitle(phase.id, phase.title)}
            </p>
            {phase.description && (
              <p className="mt-1 line-clamp-2 text-[0.75rem] leading-snug text-sol-secondary">
                {phase.description}
              </p>
            )}
          </div>
        </div>
        <div className="border-t border-sol-border/70 bg-white/60 px-4 py-3">
          {phase.state === "future" ? (
            <p className="flex items-center gap-1.5 text-[0.75rem] font-medium text-sol-secondary">
              <Lock className="size-3.5" aria-hidden="true" />
              {t("rm.state.locked")}
            </p>
          ) : (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-sol-violet-soft">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sol-violet to-sol-champagne"
                  style={{ width: `${Math.round(pct * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[0.75rem] text-sol-secondary">
                {t("rm.phase.progress", { x: weeksDone, y: weeks.length })}
                {missionTotal > 0 && (
                  <> · {t("rm.journey.missionsDone", { x: missionDone, y: missionTotal })}</>
                )}
              </p>
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
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
        "pointer-events-auto flex flex-col items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-center shadow-sm outline-none backdrop-blur-sm transition-all duration-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-sol-violet/50",
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          "flex items-center gap-1 text-[0.75rem] tabular-nums",
          active ? "font-semibold text-sol-violet-deep" : "text-sol-secondary",
        )}
      >
        {phase.state === "future" && <Lock className="size-3" aria-label={t("rm.state.locked")} />}
        {String(index + 1).padStart(2, "0")}
      </span>
      <span
        className={cn(
          "max-w-[9rem] line-clamp-2 text-[0.875rem] font-semibold leading-tight",
          phase.state === "future" && !active ? "text-sol-secondary" : "text-sol-ink",
        )}
        title={title}
      >
        {title}
      </span>
      {phase.range && (
        <span className="text-[0.6875rem] text-sol-secondary">
          {t("common.weeksRange", { from: phase.range.first, to: phase.range.last })}
        </span>
      )}
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
        className="relative rounded-3xl border border-sol-border bg-[linear-gradient(135deg,#fffdfb_0%,#f7f1fb_100%)] p-5 shadow-[0_18px_44px_-28px_rgba(88,64,185,0.45)] sm:p-7"
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
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="sol-eyebrow !text-[0.6875rem] !tracking-[0.14em]">
              {t("rm.phase.n", { n: index + 1 })}
            </p>
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
                className="h-1.5 overflow-hidden rounded-full bg-sol-violet-soft"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct * 100)}
                aria-label={t("rm.phase.progress", { x: weeksDone, y: weeks.length })}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sol-violet to-sol-champagne transition-[width] duration-700 ease-out"
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
                      "flex size-7 items-center justify-center rounded-full border text-[0.6875rem] font-semibold transition-all duration-300 disabled:cursor-default",
                      w.id === view.currentWeekId
                        ? "border-sol-violet bg-sol-violet text-white shadow-[0_0_0_4px_rgba(118,85,245,0.16)]"
                        : w.state === "completed"
                          ? "border-sol-champagne bg-sol-champagne text-sol-ink"
                          : w.state === "locked"
                            ? "border-sol-border-strong bg-sol-surface text-sol-secondary"
                            : "border-sol-violet/50 bg-sol-violet-soft text-sol-violet-deep",
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

          <Gem3D variant="island" className="hidden size-36 self-center md:block" />
        </div>
      </div>
    </div>
  );
}
