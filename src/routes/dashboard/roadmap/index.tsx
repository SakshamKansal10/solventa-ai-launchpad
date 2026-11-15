import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { JourneyBlock } from "@/components/founder/dash/JourneyBlock";
import { nextMissionId } from "@/components/founder/dash/missions";
import {
  ActionButton,
  ActionLink,
  Arrow,
  DashError,
  DashPage,
  DashSkeleton,
  Label,
  LinkRow,
  MistCard,
  QuietRow,
  Tag,
} from "@/components/founder/dash/ui";
import { isStepNeeded, OFFICIAL_STEPS, type PhaseKey } from "@/content/make-official";
import { ReviewWeekDialog } from "@/components/founder/roadmap/ReviewWeekDialog";
import { useRoadmapText } from "@/components/founder/roadmap/text";
import { getRoadmapView, retryWeek, type CloseWeekResult } from "@/lib/actions/roadmap";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useFounderState, useInvalidateFounder } from "@/lib/queries";
import { estimateHours } from "@/lib/roadmap/hours";
import type { RoadmapView, WeekDTO } from "@/lib/roadmap/view";
import { useTranslatedTitle } from "@/lib/use-translation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/roadmap/")({
  validateSearch: z.object({
    /** Global week number (1-based) to show. Defaults to the active week. */
    week: z.number().int().min(1).optional(),
    // Older links carried these; they are accepted and ignored.
    tab: z.string().optional(),
    mission: z.string().uuid().optional(),
    phase: z.string().uuid().optional(),
  }),
  component: RoadmapPage,
  head: () => ({
    meta: [
      { title: "Roadmap | Solventia" },
      { name: "description", content: "Where you are on your roadmap, and this week's missions." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function RoadmapPage() {
  const { t } = useLocale();
  const founder = useFounderState();

  if (founder.isPending) return <DashSkeleton label={t("shell.skeleton.loading")} />;
  if (founder.isError || !founder.data) {
    return <DashError onRetry={() => void founder.refetch()} retrying={founder.isFetching} />;
  }
  const { direction } = founder.data;
  const roadmapId = direction.roadmap?.id ?? null;
  const stage = direction.stage;
  if (
    !roadmapId ||
    !direction.selectedId ||
    stage === "roadmap_building" ||
    stage === "roadmap_failed"
  ) {
    return <NoRoadmapYet stage={stage} opportunityId={direction.selectedId} />;
  }
  return <RoadmapWorkspace roadmapId={roadmapId} />;
}

function NoRoadmapYet({ stage, opportunityId }: { stage: string; opportunityId: string | null }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const building = stage === "roadmap_building";
  const failed = stage === "roadmap_failed";
  return (
    <DashPage>
      <h1 className="dash-headline max-w-[15em]">
        {stage === "no_consultation"
          ? t("cc.none.cardTitle")
          : !opportunityId
            ? t("rm.empty.chooseTitle")
            : building
              ? t("rm.empty.buildingTitle")
              : failed
                ? t("rm.empty.failedTitle")
                : t("cc.b.buildTitle")}
      </h1>
      <p className="dash-lead max-w-[32em]">
        {stage === "no_consultation"
          ? t("cc.none.cardBody")
          : !opportunityId
            ? t("rm.empty.chooseBody")
            : building
              ? t("cc.b.building")
              : failed
                ? t("cc.b.failed")
                : t("cc.b.buildBody")}
      </p>
      {stage === "no_consultation" ? (
        <ActionLink to="/consultation" className="self-start">
          {t("v2.today.none.cta")}
        </ActionLink>
      ) : !opportunityId ? (
        <ActionLink to="/dashboard/opportunities" className="self-start">
          {t("v2.dir.open")}
        </ActionLink>
      ) : (
        <ActionButton
          className="self-start"
          data-testid="build-roadmap"
          onClick={() => navigate({ to: "/dashboard/roadmap/building", search: { opportunityId } })}
        >
          {building
            ? t("v2.today.chosen.progress")
            : failed
              ? t("v2.today.chosen.retry")
              : t("v2.today.chosen.build")}
        </ActionButton>
      )}
    </DashPage>
  );
}

/** Roadmap — "Where am I, and what's this week?" (screen 5). */
function RoadmapWorkspace({ roadmapId }: { roadmapId: string }) {
  const { t } = useLocale();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const founder = useFounderState();
  const invalidate = useInvalidateFounder();
  const [review, setReview] = useState(false);

  const query = useQuery({
    queryKey: qk.roadmap(roadmapId),
    queryFn: () => getRoadmapView({ data: { roadmapId } }),
    staleTime: 10_000,
    // While the next week's detail is being written, watch for it to land.
    refetchInterval: (q) =>
      q.state.data?.weeks.some(
        (w) => w.state === "generating_next" && w.generationStatus === "generating",
      )
        ? 3000
        : false,
  });
  const view = query.data ?? null;
  const currentWeek = view?.weeks.find((w) => w.id === view.currentWeekId) ?? null;
  const phaseKey = (view?.phases.find((p) => p.id === view.currentPhaseId)?.key ??
    null) as PhaseKey | null;
  const officialNeeded = OFFICIAL_STEPS.some((s) => isStepNeeded(s, phaseKey));
  const shownWeek =
    (search.week ? view?.weeks.find((w) => w.number === search.week) : null) ??
    currentWeek ??
    view?.weeks.filter((w) => w.state === "completed").at(-1) ??
    null;
  const text = useRoadmapText(view, shownWeek);
  // The direction's name in the reader's language (Hindi readers saw the stored English title).
  const directionTitle = useTranslatedTitle(
    view?.roadmap.opportunityId,
    (view ? founder.data?.briefs[view.roadmap.opportunityId]?.title : null) ??
      view?.roadmap.opportunityTitle,
  );

  if (query.isPending) return <DashSkeleton label={t("shell.skeleton.loading")} />;
  if (query.isError || !view) {
    return <DashError onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  }

  const isCurrent = shownWeek?.id === view.currentWeekId;
  const nextWeekNumber = shownWeek
    ? (view.weeks.find((w) => w.number === shownWeek.number + 1)?.number ?? null)
    : null;
  const earlier = view.weeks.filter((w) => w.state === "completed" && w.id !== shownWeek?.id);
  const northStar = text.northStar(view.roadmap.northStar);

  const onWeekChanged = (result: CloseWeekResult) => {
    if (result.result === "roadmap_completed") {
      toast.success(t("rm.completed.toast"));
      return;
    }
    navigate({ to: "/dashboard/roadmap", search: { week: result.nextWeekNumber } });
  };

  return (
    <DashPage data-testid="roadmap-page" data-roadmap-status={view.roadmap.status}>
      <div className="flex flex-col gap-[18px]">
        <p className="dash-meta" data-testid="roadmap-direction">
          {directionTitle ?? view.roadmap.opportunityTitle}
        </p>
        <h1 className="dash-headline">{t("v2.rm.title", { n: view.totals.weeks })}</h1>
        {northStar && (
          <p className="dash-lead max-w-[34em]" data-testid="north-star">
            {northStar}
          </p>
        )}
      </div>

      {view.roadmap.status === "completed" && (
        <p
          role="status"
          className="rounded-[32px] border border-sol-champagne bg-sol-champagne-soft px-[clamp(20px,2.6vw,32px)] py-5 text-[19px] text-sol-ink"
        >
          <span className="font-semibold">{t("rm.state.completed")}.</span> {t("rm.completed.body")}
        </p>
      )}

      <JourneyBlock view={view} text={text} variant="roadmap" />

      {shownWeek ? (
        <WeekSection
          view={view}
          week={shownWeek}
          text={text}
          isCurrent={isCurrent}
          onReview={() => setReview(true)}
        />
      ) : (
        <p className="dash-lead">{t("rm.empty.noWeek")}</p>
      )}

      {(earlier.length > 0 || !isCurrent) && (
        <nav aria-label={t("v2.rm.earlier")} className="flex flex-wrap items-center gap-3">
          <span className="dash-label mr-1">{t("v2.rm.earlier")}</span>
          {!isCurrent && currentWeek && (
            <Link
              to="/dashboard/roadmap"
              search={{}}
              className="inline-flex min-h-11 items-center rounded-full border border-sol-ink/30 px-5 text-[17px] font-medium text-sol-ink hover:border-sol-ink/60"
            >
              {t("rm.phase.back")}
            </Link>
          )}
          {earlier.map((w) => (
            <Link
              key={w.id}
              to="/dashboard/roadmap"
              search={{ week: w.number }}
              data-testid={`week-row-${w.number}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-sol-ink/20 px-5 text-[17px] text-sol-secondary hover:border-sol-ink/50 hover:text-sol-ink"
            >
              <Check
                className="size-4 text-sol-champagne-deep"
                strokeWidth={3}
                aria-hidden="true"
              />
              {t("v2.journey.week", { n: w.number })}
            </Link>
          ))}
        </nav>
      )}

      {/* Make it official (part 4, feature 7): the setup guide, open from the start; its tag
          follows the roadmap's phase. */}
      <LinkRow
        to="/dashboard/roadmap/official"
        title={t("v2.rm.official")}
        note={t("v2.rm.officialNote")}
        tag={
          <Tag tone={officialNeeded ? "ink" : "outline"}>
            {officialNeeded ? t("v2.official.needed") : t("v2.official.notYet")}
          </Tag>
        }
        data-testid="make-official"
      />

      {isCurrent && shownWeek?.state === "ready_to_close" && (
        <ReviewWeekDialog
          open={review}
          onOpenChange={setReview}
          week={shownWeek}
          nextWeekNumber={nextWeekNumber}
          onDone={(result) => {
            void invalidate();
            onWeekChanged(result);
          }}
        />
      )}
    </DashPage>
  );
}

function WeekSection({
  view,
  week,
  text,
  isCurrent,
  onReview,
}: {
  view: RoadmapView;
  week: WeekDTO;
  text: ReturnType<typeof useRoadmapText>;
  isCurrent: boolean;
  onReview: () => void;
}) {
  const { t, locale } = useLocale();
  const invalidate = useInvalidateFounder();
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
  const pad = String(week.number).padStart(2, "0");
  const objective = text.weekObjective(week.id, week.objective);
  const adaptation = text.detail.adaptationNote(week.adaptationNote);
  const locked = week.state === "completed" || !isCurrent;
  const next = isCurrent && week.state !== "ready_to_close" ? nextMissionId(week) : null;
  const hours = week.missions.reduce(
    (sum, m) => sum + (m.timeEstimate ? (estimateHours(m.timeEstimate) ?? 0) : 0),
    0,
  );
  const dateOf = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
          day: "numeric",
          month: "short",
        })
      : null;

  return (
    <section
      aria-labelledby="week-title"
      className="flex flex-col gap-6 pt-4"
      data-testid="week-tab"
      data-week-state={week.state}
    >
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex min-w-0 flex-col gap-3.5">
          <Label as="p">
            {t("v2.journey.week", { n: pad })} · {t(`rm.state.${week.state}` as const)}
          </Label>
          <h2 id="week-title" className="dash-section" data-testid="week-title">
            {text.weekTitle(week.id, week.title)}
          </h2>
          {objective && (
            <p className="max-w-[34em] text-[20px] leading-[1.45] text-sol-secondary">
              {objective}
            </p>
          )}
        </div>
        {week.missions.length > 0 && (
          <p className="text-[18px] text-sol-secondary" data-testid="week-progress">
            {hours > 0
              ? t("v2.rm.weekLoad", { n: week.missions.length, h: Math.round(hours * 2) / 2 })
              : t("v2.rm.weekCount", { n: week.missions.length })}
            {" · "}
            {t("rm.rail.missions", { x: week.progress.completed, y: week.progress.total })}
          </p>
        )}
      </div>

      {adaptation && (
        <MistCard role="status" data-testid="adaptation-note" className="gap-2">
          <p className="text-[19px] font-semibold text-sol-ink">{t("rm.adapted")}</p>
          <p className="dash-body text-sol-ink">{adaptation}</p>
          <p className="dash-meta">{t("rm.adapted.why")}</p>
        </MistCard>
      )}

      {week.state === "generating_next" ? (
        <MistCard data-testid="week-generating" className="items-start">
          {week.generationStatus === "failed" ? (
            <>
              <p className="dash-statement">{t("rm.gen.failedTitle", { n: pad })}</p>
              <p className="dash-body">{t("rm.gen.failedBody")}</p>
              <ActionButton
                onClick={() => retry.mutate()}
                loading={retry.isPending}
                data-testid="retry-week"
              >
                {t("rm.gen.retry")}
              </ActionButton>
            </>
          ) : (
            <>
              <p className="dash-statement flex items-center gap-3">
                <Loader2 className="size-6 animate-spin text-sol-cobalt" aria-hidden="true" />
                {t("rm.gen.preparingTitle", { n: pad })}
              </p>
              <p role="status" className="dash-body">
                {t("rm.gen.preparingBody")}
              </p>
            </>
          )}
        </MistCard>
      ) : week.state === "locked" ? (
        <MistCard>
          <p className="dash-statement">{t("rm.locked.title")}</p>
          <p className="dash-body">{t("rm.locked.body")}</p>
        </MistCard>
      ) : (
        <>
          {week.state === "ready_to_close" && isCurrent && (
            <section
              className="flex flex-wrap items-center justify-between gap-6 rounded-[32px] border border-sol-champagne bg-sol-champagne-soft p-[clamp(24px,2.8vw,40px)]"
              data-testid="ready-to-close"
            >
              <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2">
                <p className="dash-statement">{t("rm.week.readyToClose")}</p>
                <p className="dash-body text-sol-ink">{t("rm.week.readyBody")}</p>
              </div>
              <ActionButton onClick={onReview} data-testid="review-week">
                {t("rm.week.review")}
              </ActionButton>
            </section>
          )}
          <ol className="flex flex-col gap-3" aria-label={t("rm.missions.aria")}>
            {week.missions.map((m, i) => {
              const tx = text.detail.mission(m.id);
              const title = tx?.title ?? m.title;
              const time = tx?.timeEstimate ?? m.timeEstimate;
              const done = m.state === "completed";
              const isNext = m.id === next;
              const doneOn = dateOf(m.completedAt);
              const meta = done
                ? doneOn
                  ? t("rm.mission.completedOn", { date: doneOn })
                  : t("rm.mission.completed")
                : [
                    time,
                    isNext
                      ? m.state === "in_progress"
                        ? t("v2.rm.inProgress")
                        : t("v2.rm.next")
                      : null,
                    !m.required ? t("common.optional") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
              return (
                <li
                  key={m.id}
                  data-testid="mission-card"
                  data-state={m.state}
                  data-evidence={m.evidenceCount}
                  className="flex flex-wrap items-center gap-5 rounded-[32px] bg-sol-ivory px-[clamp(20px,2.6vw,36px)] py-[26px]"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex w-12 shrink-0 font-display text-[40px] font-medium leading-none tracking-[-0.04em]",
                      isNext ? "text-sol-cobalt" : "text-sol-muted",
                    )}
                  >
                    {done ? (
                      <span className="flex size-11 items-center justify-center rounded-full bg-sol-champagne text-sol-ink">
                        <Check className="size-6" strokeWidth={3} />
                      </span>
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <span className="flex min-w-0 flex-[999_1_380px] flex-col gap-1.5">
                    <span
                      className={cn(
                        "font-display text-[clamp(22px,2vw,28px)] font-medium leading-[1.2] tracking-[-0.015em]",
                        done ? "text-sol-muted" : "text-sol-ink",
                      )}
                    >
                      {done && <span className="sr-only">{t("rm.mission.completed")}: </span>}
                      {title}
                    </span>
                    {meta && <span className="text-[17px] text-sol-muted">{meta}</span>}
                  </span>
                  {isNext ? (
                    <Link
                      to="/dashboard/roadmap/mission/$missionId"
                      params={{ missionId: m.id }}
                      search={m.state === "not_started" ? { start: true } : {}}
                      data-testid="mission-primary"
                      className="inline-flex min-h-[60px] shrink-0 items-center gap-3 rounded-full bg-sol-cobalt px-7 text-[19px] font-semibold text-white transition-colors hover:bg-sol-cobalt-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt"
                    >
                      {m.state === "in_progress" ? t("rm.mission.continue") : t("v2.rm.start")}
                      <span className="sr-only">: {title}</span>
                      <Arrow />
                    </Link>
                  ) : (
                    <Link
                      to="/dashboard/roadmap/mission/$missionId"
                      params={{ missionId: m.id }}
                      data-testid="mission-open"
                      className="inline-flex min-h-[60px] shrink-0 items-center rounded-full border border-sol-ink/35 px-7 text-[19px] font-medium text-sol-ink transition-colors hover:border-sol-ink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt"
                    >
                      {t("v2.rm.open")}
                      <span className="sr-only">: {title}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
          {locked && week.state !== "completed" && (
            <p className="dash-meta">{t("rm.locked.body")}</p>
          )}
        </>
      )}
    </section>
  );
}
