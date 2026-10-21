import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2,
  MessageCircle,
  Plus,
  Target,
  TrendingUp,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";

import { retryWeek, setMissionState, type CloseWeekResult } from "@/lib/actions/roadmap";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useInvalidateFounder } from "@/lib/queries";
import type { MissionState } from "@/lib/roadmap/state";
import { applyMissionState, type RoadmapView, type WeekDTO } from "@/lib/roadmap/view";
import { ProgressRing } from "../dashboard/graphics";
import { cn } from "@/lib/utils";
import { Button, Pill } from "../ui";
import { MissionCard } from "./MissionCard";
import { EvidenceDialog } from "../proof/EvidenceDialog";
import { StatusBadge } from "../proof/bits";
import { useEvidenceWorkspace } from "../proof/useEvidence";
import { useAskSol } from "../DashboardShell";
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
        showLabel={false}
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
  isCurrent,
  nextWeekNumber,
  onWeekChanged,
}: {
  view: RoadmapView;
  week: WeekDTO;
  text: RoadmapText;
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
  const askSol = useAskSol();
  const opportunityId = view.roadmap.opportunityId;
  // Evidence can be recorded from the very first mission — the same assumptions
  // (in the reader's language) the Evidence page shows.
  const evidence = useEvidenceWorkspace(opportunityId);
  const assumptionTitles = new Map(evidence.assumptions.map((a) => [a.id, a.title]));
  const [recording, setRecording] = useState<{
    taskId: string | null;
    assumptionId: string | null;
  } | null>(null);
  const weekAssumptions = Array.from(
    new Map(
      week.missions
        .filter((m) => m.assumption)
        .map((m) => [m.assumption!.id, m.assumption!] as const),
    ).values(),
  );
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
      toast.error(t("rm.mission.error"));
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

  const objective = text.weekObjective(week.id, week.objective);
  const threshold = detail.successThreshold(week.successThreshold);
  // Success criteria often arrive as one line of several outcomes; show them
  // as separate lines only when the text really is a list.
  const outcomes = threshold
    ? threshold
        .split(/;\s+|\n+/)
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
  const pct = week.progress.total > 0 ? week.progress.completed / week.progress.total : 0;

  return (
    <div
      className="grid gap-x-10 gap-y-8 @4xl:grid-cols-[minmax(0,1fr)_21rem]"
      data-testid="week-tab"
      data-week-state={week.state}
    >
      <div className="flex min-w-0 flex-col gap-7">
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[0.9375rem] font-semibold text-sol-champagne-deep">
              {t("common.weekN", { n: pad })}
            </span>
            <Pill
              tone={
                week.state === "completed"
                  ? "champagne"
                  : week.state === "locked"
                    ? "neutral"
                    : "cobalt"
              }
            >
              {t(`rm.state.${week.state}` as const)}
            </Pill>
            <span className="ml-auto inline-flex overflow-hidden rounded-full border border-sol-border bg-sol-surface/90">
              <button
                type="button"
                aria-label={t("rm.week.prev")}
                disabled={!prevWeek}
                onClick={() => prevWeek && goWeek(prevWeek.number)}
                className="grid size-10 place-items-center text-sol-ink transition-colors hover:bg-sol-cobalt-soft disabled:opacity-35"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t("rm.week.next")}
                disabled={!nextWeek}
                onClick={() => nextWeek && goWeek(nextWeek.number)}
                className="grid size-10 place-items-center border-l border-sol-border text-sol-ink transition-colors hover:bg-sol-cobalt-soft disabled:opacity-35"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </span>
          </div>
          <h2
            className="mt-2 max-w-[34ch] !text-[1.625rem] font-semibold leading-tight text-sol-ink"
            data-testid="week-title"
          >
            {title}
          </h2>
          {objective && (
            <p className="mt-2 line-clamp-2 max-w-[62ch] text-[0.9375rem] leading-snug text-sol-secondary">
              {objective}
            </p>
          )}
        </header>

        {detail.adaptationNote(week.adaptationNote) && (
          // Shown only when this week was really rewritten from what was recorded last week.
          <div
            role="status"
            className="rounded-2xl border border-sol-cobalt/30 bg-sol-cobalt-ultralight px-5 py-4"
            data-testid="adaptation-note"
          >
            <p className="text-[1rem] font-semibold text-sol-cobalt-deep">{t("rm.adapted")}</p>
            <p className="mt-1 text-[1rem] leading-snug text-sol-ink">
              {detail.adaptationNote(week.adaptationNote)}
            </p>
            <p className="mt-2 text-[0.875rem] text-sol-secondary">{t("rm.adapted.why")}</p>
          </div>
        )}

        {week.state === "generating_next" ? (
          <div
            className="sol-atmosphere flex flex-col items-start gap-3 p-7"
            data-testid="week-generating"
          >
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
                  <Loader2 className="size-5 animate-spin text-sol-cobalt" aria-hidden="true" />
                  {t("rm.gen.preparingTitle", { n: pad })}
                </p>
                <p role="status" className="sol-body sol-prose text-sol-secondary">
                  {t("rm.gen.preparingBody")}
                </p>
              </>
            )}
          </div>
        ) : week.state === "locked" ? (
          <div className="sol-atmosphere p-7">
            <p className="sol-h3">{t("rm.locked.title")}</p>
            <p className="sol-body sol-prose mt-2 text-sol-secondary">{t("rm.locked.body")}</p>
          </div>
        ) : (
          <>
            {week.state === "ready_to_close" && isCurrent && (
              <div
                className="sol-complete-glow flex flex-col items-start gap-3 rounded-3xl border border-sol-champagne/60 bg-[linear-gradient(135deg,#fbf3e2_0%,#fffdfb_100%)] p-6"
                data-testid="ready-to-close"
              >
                <p className="sol-h3">{t("rm.week.readyToClose")}</p>
                <p className="text-[1rem] text-sol-ink">{t("rm.week.readyBody")}</p>
                <Button size="lg" onClick={() => setReview(true)} data-testid="review-week">
                  {t("rm.week.review")}
                </Button>
              </div>
            )}
            <ol className="flex flex-col" aria-label={t("rm.missions.aria")}>
              {week.missions.map((m, i) => (
                <li key={m.id} className="group/li pb-6 last:pb-0">
                  <MissionCard
                    mission={m}
                    index={i}
                    text={detail.mission(m.id)}
                    busy={setState.isPending && setState.variables?.taskId === m.id}
                    locked={missionsLocked}
                    defaultOpen={m.id === activeMissionId && !missionsLocked}
                    onState={(state) => setState.mutate({ taskId: m.id, state })}
                    opportunityId={opportunityId}
                    assumptionTitle={m.assumption ? assumptionTitles.get(m.assumption.id) : null}
                    onRecordEvidence={
                      evidence.assumptions.length > 0 && !missionsLocked
                        ? () =>
                            setRecording({ taskId: m.id, assumptionId: m.assumption?.id ?? null })
                        : undefined
                    }
                  />
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      <aside className="min-w-0 self-start" aria-label={t("rm.rail.aria")} data-testid="week-rail">
        {week.hasDetail && (
          <div className="flex flex-col divide-y divide-sol-border/70 rounded-3xl border border-sol-border bg-[linear-gradient(160deg,#ffffff_0%,#f7f8fa_100%)] shadow-[0_16px_40px_-30px_rgba(16,28,50,0.45)]">
            <section className="flex flex-col gap-4 p-5">
              <h3 className="flex items-center gap-2.5 text-[0.9375rem] font-semibold text-sol-ink">
                <TrendingUp className="size-4 text-sol-cobalt-deep" aria-hidden="true" />
                {t("rm.rail.progress")}
              </h3>
              <ProgressSegments week={week} />
              <ol className="flex items-center gap-1.5" aria-hidden="true">
                {week.missions.map((m) => (
                  <li
                    key={m.id}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors duration-500",
                      m.state === "completed"
                        ? "bg-sol-champagne"
                        : m.state === "in_progress"
                          ? "bg-sol-cobalt"
                          : "bg-sol-cobalt/15",
                    )}
                  />
                ))}
              </ol>
            </section>
            {threshold && (
              <section className="flex flex-col gap-3 p-5" data-testid="success-threshold">
                <h3 className="flex items-center gap-2.5 text-[0.9375rem] font-semibold text-sol-ink">
                  <Target className="size-4 text-sol-champagne-deep" aria-hidden="true" />
                  {t("rm.rail.threshold")}
                </h3>
                {outcomes.length > 1 ? (
                  <ul className="flex flex-col gap-2">
                    {outcomes.map((o) => (
                      <li
                        key={o}
                        className="flex gap-2.5 text-[0.9375rem] leading-snug text-sol-ink"
                      >
                        <span
                          className="mt-[0.5rem] size-1.5 shrink-0 rounded-full bg-sol-champagne"
                          aria-hidden="true"
                        />
                        {o}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[0.9375rem] leading-snug text-sol-ink">{threshold}</p>
                )}
                <div
                  className="h-1 overflow-hidden rounded-full bg-sol-cobalt/10"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sol-cobalt to-sol-champagne transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.round(pct * 100)}%` }}
                  />
                </div>
              </section>
            )}
            <section className="flex flex-col gap-3 p-5" data-testid="week-evidence">
              <h3 className="flex items-center gap-2.5 text-[0.9375rem] font-semibold text-sol-ink">
                <Database className="size-4 text-sol-cobalt-deep" aria-hidden="true" />
                {t("pf.rail.title")}
              </h3>
              <p className="text-[0.9375rem] leading-snug text-sol-secondary">
                {week.evidenceCount > 0
                  ? t("pf.rail.count", { n: week.evidenceCount })
                  : t("pf.rail.empty")}
              </p>
              {weekAssumptions.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {weekAssumptions.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/dashboard/proof"
                        search={{ opportunity: opportunityId, assumption: a.id }}
                        className="min-w-0 text-[0.9375rem] leading-snug text-sol-ink hover:text-sol-cobalt-deep hover:underline"
                      >
                        {assumptionTitles.get(a.id) ?? a.title}
                      </Link>
                      <StatusBadge status={a.status} />
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {evidence.assumptions.length > 0 && !missionsLocked && (
                  <Button
                    size="sm"
                    onClick={() =>
                      setRecording({ taskId: null, assumptionId: weekAssumptions[0]?.id ?? null })
                    }
                    data-testid="rail-record-evidence"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    {t("pf.record")}
                  </Button>
                )}
                <Link
                  to="/dashboard/proof"
                  search={{ opportunity: opportunityId }}
                  className="inline-flex min-h-9 items-center px-2 text-[0.875rem] font-medium text-sol-cobalt-deep hover:underline"
                >
                  {t("pf.rail.open")}
                </Link>
              </div>
            </section>
            {detail.mistakes(week.mistakes).length > 0 && (
              <section className="flex flex-col gap-3 p-5" data-testid="week-avoid">
                <h3 className="sol-eyebrow !text-[0.8125rem]">{t("rm.rail.avoid")}</h3>
                <ul className="flex flex-col gap-2">
                  {detail.mistakes(week.mistakes).map((m) => (
                    <li key={m} className="flex gap-2.5 text-[0.9375rem] leading-snug text-sol-ink">
                      <span
                        className="mt-[0.5rem] size-1.5 shrink-0 rounded-full bg-sol-warning"
                        aria-hidden="true"
                      />
                      {m}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="p-5">
              <Button
                variant="soft"
                size="sm"
                className="w-full"
                onClick={() => askSol.open()}
                data-testid="rail-ask-sol"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                {t("pf.rail.askSol")}
              </Button>
            </section>
          </div>
        )}
      </aside>

      {recording && (
        <EvidenceDialog
          open
          onOpenChange={(o) => !o && setRecording(null)}
          opportunityId={opportunityId}
          assumptions={evidence.assumptions}
          presetAssumptionId={recording.assumptionId}
          taskId={recording.taskId}
          weekId={week.id}
          titleSupported={evidence.overview.data?.titleSupported ?? false}
        />
      )}

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
