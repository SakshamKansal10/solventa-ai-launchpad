import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowRight, Compass } from "lucide-react";

import {
  AlternativeCard,
  BriefFacts,
  FitPill,
  FlagshipCard,
} from "@/components/founder/OpportunityCards";
import {
  Button,
  Card,
  ErrorPanel,
  EmptyState,
  Eyebrow,
  LinkButton,
  PageHeader,
  PageSkeleton,
  Pill,
  Skeleton,
} from "@/components/founder/ui";
import { exploreMoreOpportunities, chooseDirection } from "@/lib/actions/opportunities";
import { getProofSummary } from "@/lib/actions/proof";
import { getRoadmapView, type RoadmapView } from "@/lib/actions/roadmap";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useFounderState, useInvalidateFounder } from "@/lib/queries";
import { useTranslatedBrief } from "@/lib/use-translation";
import { useTranslatedEntity } from "@/lib/use-translation";

export const Route = createFileRoute("/dashboard/")({
  // Set by a deep link to ONE consultation's ideas (the "ideas ready" email or
  // History → Review). It pins the view to that consultation; without it the
  // dashboard is always the newest consultation.
  validateSearch: z.object({ consultation: z.string().uuid().optional() }),
  component: CommandCenter,
  head: () => ({
    meta: [{ title: "Command Center — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

function CommandCenter() {
  const { t } = useLocale();
  const founder = useFounderState();

  if (founder.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (founder.isError || !founder.data) {
    return <ErrorPanel onRetry={() => void founder.refetch()} retrying={founder.isFetching} />;
  }
  const { direction, briefs } = founder.data;
  const readOnly = !direction.isLatestConsultation && direction.stage !== "roadmap_active";

  return (
    <div className="flex flex-col gap-10" data-testid="command-center" data-stage={direction.stage}>
      {!direction.isLatestConsultation && <EarlierConsultationBanner />}

      {direction.stage === "no_consultation" && <NoConsultation />}
      {direction.stage === "ideas_ready" && direction.flagshipId && (
        <IdeasReady
          flagshipId={direction.flagshipId}
          alternativeIds={direction.alternativeIds}
          readOnly={readOnly}
        />
      )}
      {(direction.stage === "direction_selected" ||
        direction.stage === "roadmap_building" ||
        direction.stage === "roadmap_failed") &&
        direction.selectedId && (
          <DirectionSelected
            opportunityId={direction.selectedId}
            stage={direction.stage}
            hasArchivedRoadmap={direction.hasArchivedRoadmap}
            readOnly={readOnly}
          />
        )}
      {(direction.stage === "roadmap_active" || direction.stage === "roadmap_completed") &&
        direction.roadmap &&
        direction.selectedId && (
          <NextMove
            roadmapId={direction.roadmap.id}
            opportunityId={direction.selectedId}
            completed={direction.stage === "roadmap_completed"}
          />
        )}
      {/* Defensive: a stage whose ids somehow resolved to nothing must never render blank. */}
      {direction.stage === "ideas_ready" && !direction.flagshipId && briefs && <NoConsultation />}
    </div>
  );
}

function EarlierConsultationBanner() {
  const { t } = useLocale();
  return (
    <div
      role="status"
      data-testid="earlier-consultation-banner"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sol-champagne/50 bg-sol-champagne-soft px-5 py-4"
    >
      <p className="text-[1.0625rem] font-medium text-sol-ink">{t("cc.earlier.body")}</p>
      <div className="flex flex-wrap gap-2">
        <LinkButton to="/dashboard" variant="secondary" size="sm" search={{}}>
          {t("cc.earlier.back")}
        </LinkButton>
        <LinkButton to="/dashboard/history" variant="soft" size="sm">
          {t("cc.earlier.history")}
        </LinkButton>
      </div>
    </div>
  );
}

function NoConsultation() {
  const { t } = useLocale();
  return (
    <>
      <PageHeader title={t("cc.none.title")} subtitle={t("cc.none.body")} />
      <EmptyState
        title={t("cc.none.cardTitle")}
        body={t("cc.none.cardBody")}
        action={
          <LinkButton to="/consultation" variant="primary" size="lg">
            {t("nav.findMyBusinessIdea")}
            <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
          </LinkButton>
        }
      />
    </>
  );
}

/** STATE A — ideas ready, nothing chosen yet. */
function IdeasReady({
  flagshipId,
  alternativeIds,
  readOnly,
}: {
  flagshipId: string;
  alternativeIds: string[];
  readOnly: boolean;
}) {
  const { t, locale } = useLocale();
  const founder = useFounderState();
  const invalidate = useInvalidateFounder();
  const navigate = useNavigate();
  const briefs = founder.data!.briefs;

  const choose = useMutation({
    mutationFn: (opportunityId: string) => chooseDirection({ data: { opportunityId } }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("cc.chosen.toast"));
    },
    onError: (err) => {
      console.error("[command-center] choose failed:", err);
      toast.error(t("cc.chosen.error"));
    },
  });
  const explore = useMutation({
    mutationFn: () => exploreMoreOpportunities({ data: { locale } }),
    onSuccess: async (res) => {
      await invalidate();
      toast.success(t("cc.explore.done", { n: res.added }));
      void navigate({ to: "/dashboard/opportunities" });
    },
    onError: (err) => {
      console.error("[command-center] explore more failed:", err);
      toast.error(t("cc.explore.error"));
    },
  });

  const busy = choose.isPending || explore.isPending;
  const flagship = briefs[flagshipId];
  if (!flagship) return <NoConsultation />;

  return (
    <>
      <PageHeader title={t("cc.a.title")} subtitle={t("cc.a.subtitle")} />
      <FlagshipCard
        brief={flagship}
        readOnly={readOnly}
        disabled={busy}
        choosing={choose.isPending && choose.variables === flagshipId}
        onChoose={() => choose.mutate(flagshipId)}
      />
      {alternativeIds.length > 0 && (
        <section aria-labelledby="alts-heading" className="flex flex-col gap-4">
          <h2 id="alts-heading" className="sol-eyebrow">
            {t("cc.alternatives")}
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {alternativeIds.map((id) =>
              briefs[id] ? (
                <AlternativeCard
                  key={id}
                  brief={briefs[id]}
                  readOnly={readOnly}
                  disabled={busy}
                  choosing={choose.isPending && choose.variables === id}
                  onChoose={() => choose.mutate(id)}
                />
              ) : null,
            )}
          </div>
        </section>
      )}
      {!readOnly && (
        <div className="flex flex-col items-start gap-2">
          <Button
            variant="soft"
            size="lg"
            onClick={() => explore.mutate()}
            loading={explore.isPending}
            disabled={choose.isPending}
            data-testid="explore-more"
          >
            <Compass className="size-5" aria-hidden="true" />
            {t("cc.exploreMore")}
          </Button>
          {explore.isPending && (
            <p role="status" className="text-[1rem] text-sol-secondary">
              {t("cc.explore.working")}
            </p>
          )}
        </div>
      )}
    </>
  );
}

/** STATE B — a direction is chosen but the roadmap isn't built (or failed / is building). */
function DirectionSelected({
  opportunityId,
  stage,
  hasArchivedRoadmap,
  readOnly,
}: {
  opportunityId: string;
  stage: "direction_selected" | "roadmap_building" | "roadmap_failed";
  hasArchivedRoadmap: boolean;
  readOnly: boolean;
}) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const founder = useFounderState();
  const brief = useTranslatedBrief(founder.data!.briefs[opportunityId]);
  if (!brief) return <NoConsultation />;

  const goBuild = () => navigate({ to: "/dashboard/roadmap/building", search: { opportunityId } });

  return (
    <>
      <PageHeader title={t("cc.b.title")} subtitle={t("cc.b.subtitle")} />
      <Card feature className="p-6 sm:p-10" data-testid="chosen-direction">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>{t("cc.b.chosen")}</Eyebrow>
          <FitPill fit={brief.fit} />
        </div>
        <h2 className="mt-4 max-w-[26ch] font-display text-[clamp(1.875rem,1.5rem+1.4vw,2.5rem)] font-semibold leading-[1.1] text-sol-ink">
          {brief.title}
        </h2>
        <p className="sol-body sol-prose mt-4 text-sol-secondary">{brief.oneLiner}</p>
        <div className="mt-8">
          <BriefFacts brief={brief} />
        </div>
      </Card>

      <Card className="flex flex-col gap-5 p-6 sm:p-8" data-testid="next-step">
        <Eyebrow>{t("cc.b.nextStep")}</Eyebrow>
        {stage === "roadmap_failed" && (
          <div
            role="alert"
            className="rounded-2xl border border-sol-warning/40 bg-sol-warning-soft px-4 py-3 text-[1.0625rem] text-sol-ink"
          >
            {t("cc.b.failed")}
          </div>
        )}
        {stage === "roadmap_building" && (
          <div
            role="status"
            className="rounded-2xl border border-sol-violet/25 bg-sol-violet-soft px-4 py-3 text-[1.0625rem] text-sol-ink"
          >
            {t("cc.b.building")}
          </div>
        )}
        <h2 className="sol-h2">
          {hasArchivedRoadmap ? t("cc.b.resumeTitle") : t("cc.b.buildTitle")}
        </h2>
        <p className="sol-body sol-prose text-sol-secondary">
          {hasArchivedRoadmap ? t("cc.b.resumeBody") : t("cc.b.buildBody")}
        </p>
        <div className="flex flex-wrap gap-3">
          {!readOnly && (
            <Button size="lg" variant="primary" onClick={goBuild} data-testid="build-roadmap">
              {stage === "roadmap_building"
                ? t("cc.b.viewProgress")
                : stage === "roadmap_failed"
                  ? t("common.retry")
                  : hasArchivedRoadmap
                    ? t("cc.b.resumeCta")
                    : t("cc.b.buildCta")}
            </Button>
          )}
          <LinkButton
            to="/dashboard/opportunities/$id"
            params={{ id: opportunityId }}
            variant="secondary"
            size="lg"
          >
            {t("cc.b.openOpportunity")}
          </LinkButton>
        </div>
      </Card>
    </>
  );
}

interface WeekOverlay {
  mission?: string;
  missions?: Record<string, { title?: string }>;
}
interface SkeletonOverlay {
  phases?: Record<string, { title?: string }>;
  weeks?: Record<string, { title?: string; objective?: string }>;
}

/** STATE C — the returning founder's dashboard: this week's mission, and three
 * small modules. No setup CTAs, no giant idea report. */
function NextMove({
  roadmapId,
  opportunityId,
  completed,
}: {
  roadmapId: string;
  opportunityId: string;
  completed: boolean;
}) {
  const { t } = useLocale();
  const roadmap = useQuery({
    queryKey: qk.roadmap(roadmapId),
    queryFn: () => getRoadmapView({ data: { roadmapId } }),
    staleTime: 15_000,
  });
  const proof = useQuery({
    queryKey: qk.proof(opportunityId),
    queryFn: () => getProofSummary({ data: { opportunityId } }),
    staleTime: 15_000,
  });
  const view: RoadmapView | null | undefined = roadmap.data;
  const currentWeekId = view?.currentWeekId ?? null;
  const skeleton = useTranslatedEntity<SkeletonOverlay>("roadmap_skeleton", roadmapId);
  const weekDetail = useTranslatedEntity<WeekOverlay>("week_detail", currentWeekId);

  if (roadmap.isPending) {
    return (
      <>
        <PageHeader title={t("cc.c.title")} />
        <Skeleton className="h-72 w-full rounded-[1.5rem]" />
        <div className="grid gap-5 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </>
    );
  }
  if (roadmap.isError || !view) {
    return <ErrorPanel onRetry={() => void roadmap.refetch()} retrying={roadmap.isFetching} />;
  }

  const week = view.weeks.find((w) => w.id === view.currentWeekId) ?? null;
  const phase = view.phases.find((p) => p.id === view.currentPhaseId) ?? null;
  const mission =
    week?.missions.find((m) => m.state === "in_progress") ??
    week?.missions.find((m) => m.state === "not_started" && m.required) ??
    week?.missions.find((m) => m.state === "not_started") ??
    null;
  const weekTitle = skeleton.data?.weeks?.[week?.id ?? ""]?.title ?? week?.title;
  const phaseTitle = skeleton.data?.phases?.[phase?.id ?? ""]?.title ?? phase?.title;
  const missionTitle = weekDetail.data?.missions?.[mission?.id ?? ""]?.title ?? mission?.title;
  const adaptation = week?.adaptationNote ?? null;
  const counts = proof.data?.counts;

  return (
    <>
      <PageHeader
        title={completed ? t("cc.c.completedTitle") : t("cc.c.title")}
        subtitle={completed ? t("cc.c.completedBody") : undefined}
      />

      {week && !completed && (
        <Card
          feature
          className="relative overflow-hidden p-6 sm:p-10"
          data-testid="current-week-card"
        >
          <div className="absolute inset-y-0 left-0 w-1.5 bg-sol-violet" aria-hidden="true" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Eyebrow>{t("common.weekN", { n: String(week.number).padStart(2, "0") })}</Eyebrow>
            <Pill tone="violet" data-testid="week-state">
              {t(`rm.state.${week.state}` as const)}
            </Pill>
          </div>
          <h2 className="mt-3 max-w-[28ch] font-display text-[clamp(1.875rem,1.5rem+1.4vw,2.5rem)] font-semibold leading-[1.1] text-sol-ink">
            {weekTitle}
          </h2>

          {week.state === "generating_next" ? (
            <p className="sol-body mt-6 text-sol-secondary" role="status">
              {week.generationStatus === "failed"
                ? t("rm.gen.failedShort")
                : t("rm.gen.preparingShort")}
            </p>
          ) : week.state === "ready_to_close" ? (
            <p className="sol-body mt-6 text-sol-ink">{t("cc.c.readyToClose")}</p>
          ) : mission ? (
            <div className="mt-7">
              <p className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                {t("cc.c.currentMission")}
              </p>
              <p
                className="mt-1.5 text-[1.25rem] font-semibold leading-snug text-sol-ink"
                data-testid="current-mission"
              >
                {missionTitle}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {mission.timeEstimate && <Pill tone="neutral">{mission.timeEstimate}</Pill>}
                {mission.evidenceRequired && (
                  <Pill tone="champagne">{t("rm.evidenceRequired")}</Pill>
                )}
                <Pill tone={mission.state === "in_progress" ? "violet" : "neutral"}>
                  {t(`rm.mission.${mission.state}` as const)}
                </Pill>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton
              to="/dashboard/roadmap"
              search={{ week: week.number, mission: mission?.id }}
              variant="primary"
              size="lg"
              data-testid="continue-mission"
            >
              {week.state === "ready_to_close"
                ? t("rm.week.review")
                : week.state === "generating_next"
                  ? t("cc.c.openWeek")
                  : t("cc.c.continueMission")}
            </LinkButton>
            <LinkButton
              to="/dashboard/roadmap"
              search={{ week: week.number }}
              variant="secondary"
              size="lg"
            >
              {t("cc.c.openWeek")}
            </LinkButton>
          </div>
        </Card>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <Card
          className="flex flex-col gap-3 p-6"
          data-testid="proof-pulse"
          aria-labelledby="pulse-h"
        >
          <h2 id="pulse-h" className="sol-eyebrow">
            {t("cc.c.proofPulse")}
          </h2>
          {proof.isPending ? (
            <Skeleton className="h-16" />
          ) : proof.data && proof.data.available && proof.data.total > 0 ? (
            <p className="text-[1.125rem] leading-snug text-sol-ink">
              <span className="font-semibold">
                {t("cc.c.pulseSupported", { n: counts?.supported ?? 0 })}
              </span>
              <br />
              <span className="text-sol-secondary">
                {t("cc.c.pulseUntested", { n: counts?.untested ?? 0 })}
              </span>
            </p>
          ) : (
            <p className="text-[1.0625rem] leading-snug text-sol-secondary">
              {t("cc.c.pulseNone")}
            </p>
          )}
          <LinkButton
            to="/dashboard/proof"
            search={{ opportunity: opportunityId }}
            variant="ghost"
            size="sm"
            className="mt-auto self-start"
          >
            {t("cc.c.openProof")}
          </LinkButton>
        </Card>

        <Card
          className="flex flex-col gap-3 p-6"
          data-testid="roadmap-module"
          aria-labelledby="rm-h"
        >
          <h2 id="rm-h" className="sol-eyebrow">
            {t("cc.c.roadmap")}
          </h2>
          <p className="text-[1.125rem] leading-snug text-sol-ink">
            <span className="font-semibold">{phaseTitle}</span>
            <br />
            <span className="text-sol-secondary">
              {t("cc.c.weekOf", {
                x: week?.number ?? view.totals.completedWeeks,
                y: view.totals.weeks,
              })}
            </span>
          </p>
          <LinkButton
            to="/dashboard/roadmap"
            variant="ghost"
            size="sm"
            className="mt-auto self-start"
          >
            {t("cc.c.openRoadmap")}
          </LinkButton>
        </Card>

        <Card
          className="flex flex-col gap-3 p-6"
          data-testid="latest-change"
          aria-labelledby="lc-h"
        >
          <h2 id="lc-h" className="sol-eyebrow">
            {t("cc.c.latestChange")}
          </h2>
          <p className="text-[1.0625rem] leading-snug text-sol-ink">
            {adaptation ?? t("cc.c.noChange")}
          </p>
        </Card>
      </div>
    </>
  );
}
