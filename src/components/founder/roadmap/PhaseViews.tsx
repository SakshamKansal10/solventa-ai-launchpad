import {
  Check,
  Code2,
  Compass,
  Rocket,
  TelescopeIcon,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { PhaseDTO, RoadmapView, WeekDTO } from "@/lib/roadmap/view";
import { cn } from "@/lib/utils";
import { Button, Card, Pill } from "../ui";
import type { useRoadmapText } from "./text";

type RoadmapText = ReturnType<typeof useRoadmapText>;

/** One small icon per phase key — the same visual anchor MissionCard gives
 * each mission category. Never a generated illustration. */
const PHASE_ICON: Record<string, LucideIcon> = {
  understand: TelescopeIcon,
  explore: Compass,
  validate: Users,
  build: Code2,
  launch: Rocket,
  improve: TrendingUp,
};
const phaseIcon = (key: string): LucideIcon => PHASE_ICON[key] ?? Compass;

const weekTone = (w: WeekDTO) =>
  w.state === "completed" ? "champagne" : w.state === "locked" ? "neutral" : "cobalt";

export function WeekRow({
  week,
  text,
  onOpen,
}: {
  week: WeekDTO;
  text: RoadmapText;
  onOpen: (number: number) => void;
}) {
  const { t } = useLocale();
  const openable = week.state !== "locked";
  const body = (
    <>
      <span className="w-20 shrink-0 text-[0.875rem] font-semibold text-sol-secondary">
        {t("common.weekN", { n: String(week.number).padStart(2, "0") })}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1rem] font-semibold leading-snug text-sol-ink">
          {text.weekTitle(week.id, week.title)}
        </span>
        <span className="mt-0.5 block text-[0.875rem] leading-snug text-sol-secondary">
          {text.weekObjective(week.id, week.objective)}
        </span>
      </span>
      <Pill tone={weekTone(week)} className="shrink-0">
        {week.state === "locked" ? t("common.locked") : t(`rm.state.${week.state}` as const)}
      </Pill>
    </>
  );
  const cls = "flex w-full items-start gap-4 rounded-2xl px-4 py-3.5 text-left";
  return openable ? (
    <button
      type="button"
      onClick={() => onOpen(week.number)}
      data-testid={`week-row-${week.number}`}
      className={cn(cls, "transition-colors hover:bg-sol-cobalt-soft/60")}
    >
      {body}
    </button>
  ) : (
    <div
      data-testid={`week-row-${week.number}`}
      aria-disabled="true"
      className={cn(cls, "opacity-80")}
    >
      {body}
    </div>
  );
}

export function PlanTab({
  view,
  text,
  openPhaseId,
  onOpenWeek,
}: {
  view: RoadmapView;
  text: RoadmapText;
  openPhaseId: string | null;
  onOpenWeek: (n: number) => void;
}) {
  const { t } = useLocale();
  const defaultOpen = openPhaseId ?? view.currentPhaseId ?? view.phases[0]?.id;
  return (
    <div className="flex flex-col gap-6" data-testid="plan-tab">
      {/* The North star is already in the roadmap header on every tab. */}
      <Accordion
        type="multiple"
        defaultValue={defaultOpen ? [defaultOpen] : []}
        className="flex flex-col gap-3"
      >
        {view.phases.map((p, i) => {
          const weeks = view.weeks.filter((w) => w.phaseId === p.id);
          const done = weeks.filter((w) => w.state === "completed").length;
          const Icon = phaseIcon(p.key);
          return (
            <AccordionItem
              key={p.id}
              value={p.id}
              data-testid={`plan-phase-${i + 1}`}
              className="sol-card overflow-hidden border-b-0 px-2"
            >
              <AccordionTrigger className="px-4 py-5 text-left hover:no-underline">
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 font-sans">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg border-2",
                      p.state === "completed"
                        ? "border-sol-champagne bg-sol-champagne-soft text-sol-champagne-deep"
                        : p.state === "current"
                          ? "border-sol-cobalt bg-sol-cobalt-soft text-sol-cobalt-deep"
                          : "border-sol-border-strong bg-sol-surface text-sol-secondary",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="sol-eyebrow">{t("rm.phase.n", { n: i + 1 })}</span>
                  <span className="min-w-0 font-display text-[1.3125rem] font-semibold leading-snug text-sol-ink">
                    {text.phaseTitle(p.id, p.title)}
                  </span>
                  {p.range && (
                    <span className="text-[0.875rem] text-sol-secondary">
                      {t("common.weeksRange", { from: p.range.first, to: p.range.last })}
                    </span>
                  )}
                  <Pill
                    tone={
                      p.state === "completed"
                        ? "champagne"
                        : p.state === "current"
                          ? "cobalt"
                          : "neutral"
                    }
                  >
                    {t("rm.phase.progress", { x: done, y: weeks.length })}
                  </Pill>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-3">
                <ul className="flex flex-col divide-y divide-sol-border">
                  {weeks.map((w) => (
                    <li key={w.id}>
                      <WeekRow week={w} text={text} onOpen={onOpenWeek} />
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
