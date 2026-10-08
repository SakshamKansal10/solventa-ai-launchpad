import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { retryWeek, setMissionState, type CloseWeekResult } from "@/lib/actions/roadmap";
import type { ProofOverview } from "@/lib/actions/proof";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useInvalidateFounder } from "@/lib/queries";
import type { MissionState } from "@/lib/roadmap/state";
import { applyMissionState, type RoadmapView, type WeekDTO } from "@/lib/roadmap/view";
import { useAskSol } from "../DashboardShell";
import { ProgressRing } from "../dashboard/graphics";
import { Button, Card, Eyebrow, LinkButton, Pill } from "../ui";
import { WeekHeroScene } from "./illustrations";
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
      <p className="text-[1.0625rem] font-semibold text-sol-ink" data-testid="week-progress">
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
  const askSol = useAskSol();
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
  const objective = text.weekObjective(week.id, week.objective);
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
      className="grid gap-8 lg:grid-cols-[minmax(0,64fr)_minmax(0,36fr)]"
      data-testid="week-tab"
      data-week-state={week.state}
    >
      <div className="flex min-w-0 flex-col gap-6">
        <div className="overflow-hidden rounded-[1.5rem] border border-sol-border" data-testid="week-hero">
          <WeekHeroScene className="h-36 w-full sm:h-48" />
        </div>
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <Eyebrow>{t("common.weekN", { n: pad })}</Eyebrow>
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
          </div>
          <h2
            className="mt-3 max-w-[22ch] font-display text-[clamp(2rem,1.5rem+1.8vw,3rem)] font-semibold leading-[1.06] text-sol-ink"
            data-testid="week-title"
          >
            {title}
          </h2>
          <p className="sol-body sol-prose mt-3 text-sol-secondary">{objective}</p>
        </header>

        {detail.adaptationNote(week.adaptationNote) && (
          <div
            className="rounded-2xl border border-sol-violet/25 bg-sol-violet-soft px-5 py-4"
            data-testid="adaptation-note"
          >
            <p className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-sol-violet-deep">
              {t("rm.adapted")}
            </p>
            <p className="mt-1 text-[1.0625rem] leading-snug text-sol-ink">
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
                <p className="text-[1.0625rem] text-sol-ink">{t("rm.week.readyBody")}</p>
                <Button size="lg" onClick={() => setReview(true)} data-testid="review-week">
                  {t("rm.week.review")}
                </Button>
              </Card>
            )}
            <ol className="flex flex-col gap-3" aria-label={t("rm.missions.aria")}>
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
        className="flex min-w-0 flex-col gap-5"
        aria-label={t("rm.rail.aria")}
        data-testid="week-rail"
      >
        {week.hasDetail && (
          <>
            <Card className="flex flex-col gap-3 p-6">
              <h3 className="sol-eyebrow">{t("rm.rail.progress")}</h3>
              <ProgressSegments week={week} />
            </Card>
            {detail.successThreshold(week.successThreshold) && (
              <Card className="flex flex-col gap-2 p-6" data-testid="success-threshold">
                <h3 className="sol-eyebrow">{t("rm.rail.threshold")}</h3>
                <p className="text-[1.0625rem] leading-snug text-sol-ink">
                  {detail.successThreshold(week.successThreshold)}
                </p>
              </Card>
            )}
            <Card className="flex flex-col gap-3 p-6" data-testid="week-evidence">
              <h3 className="sol-eyebrow">{t("rm.rail.evidence")}</h3>
              {week.evidenceTarget && week.evidenceTarget > 0 ? (
                <p className="text-[1.0625rem] leading-snug text-sol-ink">
                  <span className="font-semibold">
                    {t("rm.rail.captured", { n: week.evidenceCount })}
                  </span>
                  <br />
                  <span className="text-sol-secondary">
                    {t("rm.rail.remaining", {
                      n: Math.max(week.evidenceTarget - week.evidenceCount, 0),
                    })}
                  </span>
                </p>
              ) : (
                <p className="text-[1.0625rem] leading-snug text-sol-ink">
                  {t("rm.rail.captured", { n: week.evidenceCount })}
                </p>
              )}
              <LinkButton
                to="/dashboard/proof"
                search={{ opportunity: opportunityId }}
                variant="secondary"
                size="sm"
                className="self-start"
              >
                {t("cc.c.openProof")}
              </LinkButton>
            </Card>
            {detail.mistakes(week.mistakes).length > 0 && (
              <Card className="flex flex-col gap-3 p-6" data-testid="week-avoid">
                <h3 className="sol-eyebrow">{t("rm.rail.avoid")}</h3>
                <ul className="flex flex-col gap-2.5">
                  {detail.mistakes(week.mistakes).map((m) => (
                    <li key={m} className="flex gap-3 text-[1.0625rem] leading-snug text-sol-ink">
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
        <Card className="flex flex-col gap-3 p-6">
          <h3 className="sol-eyebrow">{t("askSol.title")}</h3>
          <Button
            variant="soft"
            size="sm"
            className="self-start"
            onClick={() => askSol.open()}
            data-testid="rail-ask-sol"
          >
            {t("askSol.open")}
          </Button>
        </Card>
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
