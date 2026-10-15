import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, Target, TrendingUp } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { retryWeek, setMissionState, type CloseWeekResult } from "@/lib/actions/roadmap";
import type { ProofOverview } from "@/lib/actions/proof";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useInvalidateFounder } from "@/lib/queries";
import type { MissionState } from "@/lib/roadmap/state";
import { applyMissionState, type RoadmapView, type WeekDTO } from "@/lib/roadmap/view";
import { ProgressRing } from "../dashboard/graphics";
import { Button, Card, Eyebrow, Pill } from "../ui";
import { MissionCard } from "./MissionCard";
import { ReviewWeekDialog } from "./ReviewWeekDialog";
import type { useRoadmapText } from "./text";

type RoadmapText = ReturnType<typeof useRoadmapText>;

/** This week's missions as a donut: champagne fills in as each one completes. */
function ProgressSegments({ week }: { week: WeekDTO }) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-4">
      <ProgressRing
        value={week.progress.completed}
        total={week.progress.total}
        label={t("rm.rail.progress")}
        tone="champagne"
        testId="week-progress-ring"
      />
      <p className="text-[1rem] font-semibold text-sol-ink" data-testid="week-progress">
        {t("rm.rail.missions", { x: week.progress.completed, y: week.progress.total })}
      </p>
    </div>
  );
}

export function WeekTab({
  view,
  week,
  text,
  opportunityId,
  proof,
  isCurrent,
  nextWeekNumber,
  onWeekChanged,
}: {
  view: RoadmapView;
  week: WeekDTO;
  text: RoadmapText;
  opportunityId: string;
  proof: ProofOverview | undefined;
  /** Whether this is the founder's active week (vs a completed/locked one being read). */
  isCurrent: boolean;
  nextWeekNumber: number | null;
  /** After the week closes, navigate to the returned week (if any). */
  onWeekChanged: (result: CloseWeekResult) => void;
}) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFounder();
  const navigate = useNavigate();
  const goWeek = (n: number) =>
    navigate({ to: "/dashboard/roadmap", search: { tab: "week", week: n } });
  const prevWeek = view.weeks.find((w) => w.number === week.number - 1 && w.state !== "locked");
  const nextWeek = view.weeks.find((w) => w.number === week.number + 1 && w.state !== "locked");
  const [review, setReview] = useState(false);
  const roadmapKey = qk.roadmap(view.roadmap.id);

  const setState = useMutation({
    mutationFn: (v: { taskId: string; state: MissionState }) =>
      setMissionState({ data: { taskId: v.taskId, state: v.state } }),
    // Optimistic: the card responds instantly; the server confirms or we roll back.
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: roadmapKey });
      const previous = queryClient.getQueryData<RoadmapView | null>(roadmapKey);
      if (previous)
        queryClient.setQueryData(roadmapKey, applyMissionState(previous, v.taskId, v.state));
      return { previous };
    },
    onError: (err, _v, ctx) => {
      console.error("[roadmap] mission update failed:", err);
      if (ctx?.previous) queryClient.setQueryData(roadmapKey, ctx.previous);
      toast.error(
        err instanceof Error && err.message.includes("EVIDENCE_REQUIRED")
          ? t("rm.mission.needEvidenceError")
          : t("rm.mission.error"),
      );
    },
    onSettled: () => {
      void invalidate();
    },
  });

  const retry = useMutation({
    mutationFn: () => retryWeek({ data: { weekId: week.id, locale } }),
    onSuccess: async (res) => {
      await invalidate();
      if (res.result === "in_progress") toast.message(t("rm.gen.inProgress"));
    },
    onError: (err) => {
      console.error("[roadmap] week retry failed:", err);
      toast.error(t("rm.gen.retryError"));
    },
  });

  const title = text.weekTitle(week.id, week.title);
  const pad = String(week.number).padStart(2, "0");
  const detail = text.detail;
  const missionsLocked = week.state === "completed" || !isCurrent;

  // The one mission that starts open: whatever is in progress, otherwise the
  // first required mission still waiting, otherwise the first one left.
  const activeMissionId =
    week.missions.find((m) => m.state === "in_progress")?.id ??
    week.missions.find((m) => m.state === "not_started" && m.required)?.id ??
    week.missions.find((m) => m.state !== "completed")?.id ??
    null;

  const assumptionFor = (category: string | null) =>
    proof?.assumptions.find((a) => a.category === category)?.id ?? proof?.assumptions[0]?.id;

  return (
    <div
      className="grid gap-10 lg:grid-cols-[minmax(0,64fr)_minmax(0,36fr)]"
      data-testid="week-tab"
      data-week-state={week.state}
    >
      <div className="flex min-w-0 flex-col gap-8">
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[1rem] font-semibold text-sol-champagne-deep">
              {t("common.weekN", { n: pad })}
            </span>
            <Pill
              tone={
                week.state === "completed"
                  ? "champagne"
                  : week.state === "locked"
                    ? "neutral"
                    : "violet"
              }
            >
              {t(`rm.state.${week.state}` as const)}
            </Pill>
            <span className="ml-auto inline-flex overflow-hidden rounded-xl border border-sol-border bg-sol-surface">
              <button
                type="button"
                aria-label={t("rm.week.prev")}
                disabled={!prevWeek}
                onClick={() => prevWeek && goWeek(prevWeek.number)}
                className="grid size-10 place-items-center text-sol-ink transition-colors hover:bg-sol-ivory disabled:opacity-35"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t("rm.week.next")}
                disabled={!nextWeek}
                onClick={() => nextWeek && goWeek(nextWeek.number)}
                className="grid size-10 place-items-center border-l border-sol-border text-sol-ink transition-colors hover:bg-sol-ivory disabled:opacity-35"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </span>
          </div>
          <h2 className="mt-3 max-w-[30ch] font-semibold text-sol-ink" data-testid="week-title">
            {title}
          </h2>
        </header>

        {detail.adaptationNote(week.adaptationNote) && (
          <div
            className="rounded-2xl border border-sol-violet/25 bg-sol-violet-soft px-5 py-4"
            data-testid="adaptation-note"
          >
            <p className="text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-sol-violet-deep">
              {t("rm.adapted")}
            </p>
            <p className="mt-1 text-[1rem] leading-snug text-sol-ink">
              {detail.adaptationNote(week.adaptationNote)}
            </p>
          </div>
        )}

        {week.state === "generating_next" ? (
          <Card className="flex flex-col items-start gap-4 p-7" data-testid="week-generating">
            {week.generationStatus === "failed" ? (
              <>
                <p className="sol-h3">{t("rm.gen.failedTitle", { n: pad })}</p>
                <p className="sol-body sol-prose text-sol-secondary">{t("rm.gen.failedBody")}</p>
                <Button
                  onClick={() => retry.mutate()}
                  loading={retry.isPending}
                  data-testid="retry-week"
                >
                  {t("rm.gen.retry")}
                </Button>
              </>
            ) : (
              <>
                <p className="sol-h3 flex items-center gap-3">
                  <Loader2 className="size-5 animate-spin text-sol-violet" aria-hidden="true" />
                  {t("rm.gen.preparingTitle", { n: pad })}
                </p>
                <p role="status" className="sol-body sol-prose text-sol-secondary">
                  {t("rm.gen.preparingBody")}
                </p>
              </>
            )}
          </Card>
        ) : week.state === "locked" ? (
          <Card className="p-7">
            <p className="sol-h3">{t("rm.locked.title")}</p>
            <p className="sol-body sol-prose mt-2 text-sol-secondary">{t("rm.locked.body")}</p>
          </Card>
        ) : (
          <>
            {week.state === "ready_to_close" && isCurrent && (
              <Card
                className="flex flex-col items-start gap-3 border-sol-champagne/60 bg-sol-champagne-soft/50 p-6"
                data-testid="ready-to-close"
              >
                <p className="sol-h3">{t("rm.week.readyToClose")}</p>
                <p className="text-[1rem] text-sol-ink">{t("rm.week.readyBody")}</p>
                <Button size="lg" onClick={() => setReview(true)} data-testid="review-week">
                  {t("rm.week.review")}
                </Button>
              </Card>
            )}
            <ol className="flex flex-col gap-4" aria-label={t("rm.missions.aria")}>
              {week.missions.map((m, i) => (
                <li key={m.id}>
                  <MissionCard
                    mission={m}
                    index={i}
                    text={detail.mission(m.id)}
                    opportunityId={opportunityId}
                    weekId={week.id}
                    assumptionId={assumptionFor(m.assumptionCategory)}
                    busy={setState.isPending && setState.variables?.taskId === m.id}
                    locked={missionsLocked}
                    defaultOpen={m.id === activeMissionId && !missionsLocked}
                    onState={(state) => setState.mutate({ taskId: m.id, state })}
                  />
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      <aside
        className="flex min-w-0 flex-col gap-6"
        aria-label={t("rm.rail.aria")}
        data-testid="week-rail"
      >
        {week.hasDetail && (
          <>
            <Card className="flex flex-col gap-4 p-6">
              <h3 className="flex items-center gap-3 text-[1rem] font-semibold text-sol-ink">
                <span className="flex size-9 items-center justify-center rounded-xl bg-sol-violet-soft text-sol-violet-deep">
                  <TrendingUp className="size-[18px]" aria-hidden="true" />
                </span>
                {t("rm.rail.progress")}
              </h3>
              <ProgressSegments week={week} />
            </Card>
            {detail.successThreshold(week.successThreshold) && (
              <Card className="flex flex-col gap-2 p-6" data-testid="success-threshold">
                <h3 className="flex items-center gap-3 text-[1rem] font-semibold text-sol-ink">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-sol-warning-soft text-sol-warning">
                    <Target className="size-[18px]" aria-hidden="true" />
                  </span>
                  {t("rm.rail.threshold")}
                </h3>
                <p className="text-[1rem] leading-snug text-sol-ink">
                  {detail.successThreshold(week.successThreshold)}
                </p>
              </Card>
            )}
            {detail.mistakes(week.mistakes).length > 0 && (
              <Card className="flex flex-col gap-3 p-6" data-testid="week-avoid">
                <h3 className="sol-eyebrow">{t("rm.rail.avoid")}</h3>
                <ul className="flex flex-col gap-2.5">
                  {detail.mistakes(week.mistakes).map((m) => (
                    <li key={m} className="flex gap-3 text-[1rem] leading-snug text-sol-ink">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-sol-warning"
                        aria-hidden="true"
                      />
                      {m}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </aside>

      {isCurrent && week.state === "ready_to_close" && (
        <ReviewWeekDialog
          open={review}
          onOpenChange={setReview}
          week={week}
          nextWeekNumber={nextWeekNumber}
          onDone={(result) => {
            void invalidate();
            onWeekChanged(result);
          }}
        />
      )}
    </div>
  );
}
