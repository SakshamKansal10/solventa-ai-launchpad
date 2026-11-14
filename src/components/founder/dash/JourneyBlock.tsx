import { Link } from "@tanstack/react-router";

import type { useRoadmapText } from "@/components/founder/roadmap/text";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { RoadmapView } from "@/lib/roadmap/view";
import { cn } from "@/lib/utils";
import { JourneyArc } from "./JourneyArc";
import { Arrow, NavyBlock } from "./ui";

type RoadmapText = ReturnType<typeof useRoadmapText>;

/** The arc's week numbers and phase ranges from the real roadmap. */
export function arcProps(view: RoadmapView) {
  const current = view.weeks.find((w) => w.id === view.currentWeekId) ?? null;
  return {
    totalWeeks: view.totals.weeks,
    phases: view.phases.flatMap((p) =>
      p.range ? [{ first: p.range.first, last: p.range.last }] : [],
    ),
    currentWeek: current?.number ?? null,
    completedWeeks: view.totals.completedWeeks,
  };
}

/** "An arc of 13 weeks in four phases. You are at week 1." */
export function useArcLabel() {
  const { t } = useLocale();
  return (view: RoadmapView) => {
    const a = arcProps(view);
    return a.currentWeek
      ? t("v2.journey.aria", { n: a.totalWeeks, p: view.phases.length, w: a.currentWeek })
      : t("v2.journey.ariaDone", { n: a.totalWeeks });
  };
}

/** The page's navy block: the journey arc and one card per phase (the current one white).
 * Later phases keep "Depends on what you learn". */
export function JourneyBlock({
  view,
  text,
  heading,
  showOpenLink = false,
  variant = "today",
}: {
  view: RoadmapView;
  text: RoadmapText;
  heading?: boolean;
  showOpenLink?: boolean;
  /** Today: "Phase 1 · You are here" over the weeks. Roadmap: "Phase 1 · Weeks 1–3" over
   * "You are here" / "Depends on what you learn". */
  variant?: "today" | "roadmap";
}) {
  const { t } = useLocale();
  const arcLabel = useArcLabel();
  const northStar = text.northStar(view.roadmap.northStar);
  return (
    <NavyBlock aria-labelledby={heading ? "journey-title" : undefined} data-testid="journey-block">
      {heading && (
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <h2
              id="journey-title"
              className="font-display text-[clamp(28px,2.8vw,40px)] font-medium leading-tight tracking-[-0.02em]"
            >
              {t("v2.journey.title", { n: view.totals.weeks })}
            </h2>
            {northStar && <p className="text-[18px] leading-snug text-white/75">{northStar}</p>}
          </div>
          {showOpenLink && (
            <Link
              to="/dashboard/roadmap"
              className="inline-flex min-h-[46px] items-center gap-2.5 rounded-full text-[18px] font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              {t("v2.journey.open")}
              <Arrow />
            </Link>
          )}
        </div>
      )}
      <JourneyArc {...arcProps(view)} label={arcLabel(view)} />
      <ol
        className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]"
        data-testid="phase-cards"
      >
        {view.phases.map((p, i) => {
          const current = p.id === view.currentPhaseId;
          const done = p.state === "completed";
          const weeks = p.range
            ? p.range.first === p.range.last
              ? t("v2.journey.week", { n: p.range.first })
              : t("v2.journey.weeks", { from: p.range.first, to: p.range.last })
            : null;
          const top =
            variant === "roadmap"
              ? [t("v2.journey.phase", { n: i + 1 }), weeks].filter(Boolean).join(" · ")
              : current
                ? t("v2.journey.phaseHere", { n: i + 1 })
                : done
                  ? t("v2.journey.phaseDone", { n: i + 1 })
                  : t("v2.journey.phase", { n: i + 1 });
          const bottom =
            variant === "roadmap"
              ? current
                ? t("v2.journey.here")
                : done
                  ? t("v2.journey.done")
                  : t("v2.journey.depends")
              : (weeks ?? t("v2.journey.depends"));
          return (
            <li
              key={p.id}
              data-testid={`phase-${i + 1}`}
              data-state={p.state}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex flex-col gap-2 rounded-[26px] px-6 py-[22px]",
                current ? "bg-white text-sol-ink" : "border border-white/20",
              )}
            >
              <p
                className={cn(
                  "text-[15px] font-semibold uppercase tracking-[0.04em]",
                  current ? "text-sol-cobalt-deep" : done ? "text-sol-champagne" : "text-white/75",
                )}
              >
                {top}
              </p>
              <p className="font-display text-[22px] font-medium leading-[1.15] tracking-[-0.01em]">
                {text.phaseTitle(p.id, p.title)}
              </p>
              <p className={cn("text-[17px]", current ? "text-sol-secondary" : "text-white/75")}>
                {bottom}
              </p>
            </li>
          );
        })}
      </ol>
    </NavyBlock>
  );
}
