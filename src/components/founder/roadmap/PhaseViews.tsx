import { Check } from "lucide-react";

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

const NODE_STYLE: Record<PhaseDTO["state"], string> = {
  current: "border-sol-violet bg-sol-violet text-white shadow-[0_0_0_5px_rgba(114,87,216,0.18)]",
  completed: "border-sol-champagne bg-sol-champagne text-sol-ink",
  future: "border-sol-border-strong bg-sol-surface text-sol-secondary",
};

const weekTone = (w: WeekDTO) =>
  w.state === "completed" ? "champagne" : w.state === "locked" ? "neutral" : "violet";

/** The phase navigator: one card per phase, in order. Violet = where you are,
 * champagne = finished, ivory = still ahead. Selecting a phase only ever SHOWS
 * its skeleton — it never generates anything. */
export function PhaseStrip({
  view,
  text,
  selectedId,
  onSelect,
}: {
  view: RoadmapView;
  text: RoadmapText;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useLocale();
  return (
    <nav aria-label={t("rm.phases.aria")} data-testid="phase-strip">
      <ol className="flex snap-x snap-mandatory overflow-x-auto pb-2">
        {view.phases.map((p, i) => {
          const selected = selectedId === p.id;
          const last = i === view.phases.length - 1;
          return (
            <li key={p.id} className="relative min-w-[10.5rem] flex-1 snap-start">
              {!last && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] top-[1.2rem] h-[3px] rounded-full",
                    p.state === "completed"
                      ? "bg-sol-champagne"
                      : p.state === "current"
                        ? "bg-gradient-to-r from-sol-violet to-sol-border"
                        : "bg-sol-border",
                  )}
                />
              )}
              <button
                type="button"
                data-testid={`phase-${i + 1}`}
                data-state={p.state}
                aria-current={p.state === "current" ? "step" : undefined}
                aria-pressed={selected}
                onClick={() => onSelect(selected || p.state === "current" ? null : p.id)}
                className={cn(
                  "group relative flex h-full w-full flex-col items-center gap-2 rounded-2xl px-3 pb-3 pt-0 text-center outline-none transition-colors duration-[180ms] focus-visible:ring-2 focus-visible:ring-sol-violet/50",
                  selected && "bg-sol-violet-soft/60",
                )}
              >
                <span
                  className={cn(
                    "relative z-10 flex size-10 items-center justify-center rounded-full border-2 font-display text-[1.125rem] font-semibold transition-transform duration-200 group-hover:scale-105",
                    NODE_STYLE[p.state],
                  )}
                >
                  {p.state === "completed" ? (
                    <Check className="size-5" strokeWidth={3} aria-hidden="true" />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <span
                  className={cn(
                    "line-clamp-2 text-[0.9375rem] font-semibold leading-snug",
                    p.state === "future" ? "text-sol-secondary" : "text-sol-ink",
                  )}
                >
                  {text.phaseTitle(p.id, p.title)}
                </span>
                {p.range && (
                  <span className="text-[0.8125rem] text-sol-secondary">
                    {t("common.weeksRange", { from: p.range.first, to: p.range.last })}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

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
      <span className="w-20 shrink-0 text-[0.9375rem] font-semibold text-sol-secondary">
        {t("common.weekN", { n: String(week.number).padStart(2, "0") })}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.0625rem] font-semibold leading-snug text-sol-ink">
          {text.weekTitle(week.id, week.title)}
        </span>
        <span className="mt-0.5 block text-[0.9375rem] leading-snug text-sol-secondary">
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
      className={cn(cls, "transition-colors hover:bg-sol-violet-soft/60")}
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

/** A future (or any non-current) phase's skeleton — titles and one-line
 * objectives only. Explicitly read-only: no week generation is ever triggered. */
export function PhasePreview({
  view,
  phase,
  text,
  onClose,
  onOpenWeek,
}: {
  view: RoadmapView;
  phase: PhaseDTO;
  text: RoadmapText;
  onClose: () => void;
  onOpenWeek: (n: number) => void;
}) {
  const { t } = useLocale();
  const weeks = view.weeks.filter((w) => w.phaseId === phase.id);
  return (
    <Card feature className="flex flex-col gap-4 p-6" data-testid="phase-preview">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="sol-eyebrow">
            {t("rm.phase.n", { n: view.phases.findIndex((p) => p.id === phase.id) + 1 })}
          </p>
          <h3 className="sol-h2 mt-1">{text.phaseTitle(phase.id, phase.title)}</h3>
          {phase.description && (
            <p className="mt-2 text-[1.0625rem] leading-snug text-sol-secondary">
              {phase.description}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={onClose}>
          {t("rm.phase.back")}
        </Button>
      </div>
      <p className="text-[0.9375rem] text-sol-secondary">{t("rm.phase.previewNote")}</p>
      <ul className="flex flex-col divide-y divide-sol-border">
        {weeks.map((w) => (
          <li key={w.id}>
            <WeekRow week={w} text={text} onOpen={onOpenWeek} />
          </li>
        ))}
      </ul>
    </Card>
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
          return (
            <AccordionItem
              key={p.id}
              value={p.id}
              data-testid={`plan-phase-${i + 1}`}
              className="sol-card overflow-hidden border-b-0 px-2"
            >
              <AccordionTrigger className="px-4 py-5 text-left hover:no-underline">
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 font-sans">
                  <span className="sol-eyebrow">{t("rm.phase.n", { n: i + 1 })}</span>
                  <span className="min-w-0 font-display text-[1.375rem] font-semibold leading-snug text-sol-ink">
                    {text.phaseTitle(p.id, p.title)}
                  </span>
                  {p.range && (
                    <span className="text-[0.9375rem] text-sol-secondary">
                      {t("common.weeksRange", { from: p.range.first, to: p.range.last })}
                    </span>
                  )}
                  <Pill
                    tone={
                      p.state === "completed"
                        ? "champagne"
                        : p.state === "current"
                          ? "violet"
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
