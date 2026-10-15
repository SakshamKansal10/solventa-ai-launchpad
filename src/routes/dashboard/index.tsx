import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  Clock3,
  Compass,
  FileCheck2,
  Database,
  FlaskConical,
  History,
  Loader2,
  Map as MapIcon,
  Rocket,
  UserRound,
} from "lucide-react";

import {
  AlternativeCard,
  BriefChain,
  FitPill,
  FlagshipCard,
} from "@/components/founder/OpportunityCards";
import { IdeaHero } from "@/components/founder/OpportunityImage";
import { DirectionCompare } from "@/components/founder/dashboard/DirectionCompare";
import { FitSignals } from "@/components/founder/dashboard/fit-visual";
import {
  JourneyPreview,
  StepPath,
  type PathStep,
  type PreviewStep,
} from "@/components/founder/dashboard/graphics";
import { FitStatusPill } from "@/components/founder/fit";
import {
  Button,
  Card,
  ErrorPanel,
  Eyebrow,
  LinkButton,
  PageHeader,
  PageSkeleton,
  Pill,
  Skeleton,
} from "@/components/founder/ui";
import {
  exploreMoreOpportunities,
  chooseDirection,
  getOpportunityDetail,
} from "@/lib/actions/opportunities";
import { getProofOverview, type AssumptionDTO } from "@/lib/actions/proof";
import { getRoadmapView, type RoadmapView } from "@/lib/actions/roadmap";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useCurrentUserQuery, useFounderState, useInvalidateFounder } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useTranslatedBrief } from "@/lib/use-translation";
import { useTranslatedEntity } from "@/lib/use-translation";
import { useTranslatedTitle } from "@/lib/use-translation";

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

/** What follows the consultation, as a path of stops — the first is lit. */
function usePreviewSteps(): PreviewStep[] {
  const { t } = useLocale();
  return [
    { id: "you", label: t("cc.none.step.you"), icon: UserRound },
    { id: "directions", label: t("cc.none.step.directions"), icon: Compass },
    { id: "roadmap", label: t("cc.none.step.roadmap"), icon: MapIcon },
    { id: "proof", label: t("cc.none.step.proof"), icon: FlaskConical },
    { id: "next", label: t("cc.none.step.next"), icon: Rocket },
  ];
}

function NoConsultation() {
  const { t } = useLocale();
  const steps = usePreviewSteps();
  return (
    <>
      <PageHeader title={t("cc.none.title")} subtitle={t("cc.none.body")} />
      <Card className="flex flex-col gap-8 p-6 sm:p-10" data-testid="no-consultation">
        <JourneyPreview steps={steps} ariaLabel={t("cc.none.step.aria")} />
        <div className="flex flex-col items-start gap-3 border-t border-sol-border pt-8">
          <p className="sol-h3">{t("cc.none.cardTitle")}</p>
          <p className="sol-body sol-prose text-sol-secondary">{t("cc.none.cardBody")}</p>
          <div className="mt-2">
            <LinkButton to="/consultation" variant="primary" size="lg">
              {t("nav.findMyBusinessIdea")}
              <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
            </LinkButton>
          </div>
        </div>
      </Card>
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
  const alternatives = alternativeIds.flatMap((id) => (briefs[id] ? [briefs[id]] : []));

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
      <DirectionCompare briefs={[flagship, ...alternatives]} />
      {alternatives.length > 0 && (
        <section aria-labelledby="alts-heading" className="flex flex-col gap-4">
          <h2 id="alts-heading" className="sol-eyebrow">
            {t("cc.alternatives")}
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {alternatives.map((alt, i) => (
              <AlternativeCard
                key={alt.id}
                brief={alt}
                rank={i + 2}
                readOnly={readOnly}
                disabled={busy}
                choosing={choose.isPending && choose.variables === alt.id}
                onChoose={() => choose.mutate(alt.id)}
              />
            ))}
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
  const detail = useQuery({
    queryKey: qk.opportunity(opportunityId),
    queryFn: () => getOpportunityDetail({ data: { id: opportunityId } }),
    staleTime: 30_000,
  });
  if (!brief) return <NoConsultation />;

  const building = stage === "roadmap_building";
  const failed = stage === "roadmap_failed";
  const goBuild = () => navigate({ to: "/dashboard/roadmap/building", search: { opportunityId } });
  const matrix = detail.data?.fit.matrix ?? null;

  // Where the founder is: direction chosen, roadmap next — then week 1, evidence, adapt.
  const steps: PathStep[] = [
    { id: "direction", label: t("cc.path.direction"), state: "done", note: t("cc.path.chosen") },
    {
      id: "roadmap",
      label: t("cc.b.step.roadmap"),
      state: "current",
      busy: building,
      warn: failed,
      note: building
        ? t("cc.b.step.building")
        : failed
          ? t("cc.b.step.failed")
          : t("cc.path.state.current"),
    },
    { id: "week1", label: t("common.weekN", { n: "01" }), state: "future" },
    { id: "evidence", label: t("cc.b.step.evidence"), state: "future" },
    { id: "adapt", label: t("howItWorks.step5.title"), state: "future" },
  ];

  return (
    <>
      <PageHeader title={t("cc.b.title")} />

      <IdeaHero
        id={opportunityId}
        title={brief.title}
        description={brief.oneLiner || brief.customer}
        badge={<FitPill fit={brief.fit} />}
        titleTestId="surface-direction"
        actions={
          <>
            {!readOnly && (
              <Button size="md" onClick={goBuild}>
                {building ? t("cc.b.viewProgress") : t("cc.hero.continue")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}
            <LinkButton
              to="/dashboard/opportunities/$id"
              params={{ id: opportunityId }}
              variant="secondary"
              size="md"
            >
              {t("cc.b.openOpportunity")}
            </LinkButton>
          </>
        }
      />

      <section
        className="relative overflow-hidden rounded-[24px] bg-workspace p-6 sm:p-8"
        data-testid="next-step"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 480px 320px at 85% -10%, var(--workspace-violet-glow), transparent 70%)",
          }}
          aria-hidden="true"
        />
        {failed && (
          <div
            role="alert"
            className="relative mt-5 rounded-2xl border border-sol-warning/50 bg-sol-warning/15 px-4 py-3 text-[1rem] text-workspace-foreground"
          >
            {t("cc.b.failed")}
          </div>
        )}
        {building && (
          <div
            role="status"
            className="relative mt-5 rounded-2xl border border-sol-violet/40 bg-sol-violet/15 px-4 py-3 text-[1rem] text-workspace-foreground"
          >
            {t("cc.b.building")}
          </div>
        )}

        <div className="relative border-t border-workspace-border pt-6">
          <StepPath steps={steps} ariaLabel={t("cc.b.step.aria")} testId="build-path" />
        </div>

        <div className="relative mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-workspace-border pt-6">
          <p className="min-w-0 flex-1 basis-60 text-[0.9375rem] text-workspace-muted">
            {hasArchivedRoadmap ? t("cc.b.resumeHint") : t("cc.b.hint")}
          </p>
          <div className="flex w-full flex-wrap gap-3 sm:w-auto">
            {!readOnly && (
              <Button
                size="lg"
                variant="champagne"
                onClick={goBuild}
                data-testid="build-roadmap"
                className="w-full sm:w-auto"
              >
                {building
                  ? t("cc.b.viewProgress")
                  : failed
                    ? t("common.retry")
                    : hasArchivedRoadmap
                      ? t("cc.b.resumeCta")
                      : t("cc.b.buildCta")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}
            <LinkButton
              to="/dashboard/opportunities/$id"
              params={{ id: opportunityId }}
              variant="secondary"
              size="lg"
              className="w-full border-workspace-border bg-transparent text-workspace-foreground hover:border-sol-violet/50 sm:w-auto"
            >
              {t("cc.b.openOpportunity")}
            </LinkButton>
          </div>
        </div>
      </section>

      <Card className="flex flex-col gap-6 p-6 sm:p-8" data-testid="chosen-direction">
        <Eyebrow>{t("cc.b.chosen")}</Eyebrow>
        <BriefChain brief={brief} />
      </Card>
      <Card className="flex flex-col gap-4 p-6" data-testid="chosen-fit">
        <h2 className="sol-eyebrow">{t("cc.oppPulse.heading")}</h2>
        {detail.isPending ? (
          <Skeleton className="h-28" />
        ) : matrix ? (
          <FitSignals rows={matrix.rows} layout="tiles" />
        ) : null}
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
function relativeTime(iso: string, locale: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale === "hi" ? "hi-IN" : "en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return rtf.format(0, "second");
}

function NextMove({
  roadmapId,
  opportunityId,
  completed,
}: {
  roadmapId: string;
  opportunityId: string;
  completed: boolean;
}) {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const currentUser = useCurrentUserQuery();
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);
  const firstName = currentUser.data?.fullName?.trim().split(/\s+/)[0] ?? null;
  const greeting = firstName
    ? t(
        hour === null
          ? "cc.greet.generic"
          : hour < 12
            ? "cc.greet.morning"
            : hour < 17
              ? "cc.greet.afternoon"
              : "cc.greet.evening",
        { name: firstName },
      )
    : "";
  const roadmap = useQuery({
    queryKey: qk.roadmap(roadmapId),
    queryFn: () => getRoadmapView({ data: { roadmapId } }),
    staleTime: 15_000,
  });
  const proof = useQuery({
    queryKey: qk.proof(opportunityId),
    queryFn: () => getProofOverview({ data: { opportunityId } }),
    staleTime: 15_000,
  });
  const detail = useQuery({
    queryKey: qk.opportunity(opportunityId),
    queryFn: () => getOpportunityDetail({ data: { id: opportunityId } }),
    staleTime: 30_000,
  });
  const view: RoadmapView | null | undefined = roadmap.data;
  const currentWeekId = view?.currentWeekId ?? null;
  const skeleton = useTranslatedEntity<SkeletonOverlay>("roadmap_skeleton", roadmapId);
  const weekDetail = useTranslatedEntity<WeekOverlay>("week_detail", currentWeekId);
  const rawBrief = useFounderState().data?.briefs[opportunityId];
  const briefForHero = useTranslatedBrief(rawBrief);
  const rawOpportunityTitle = rawBrief?.title ?? "";
  const opportunityTitle = useTranslatedTitle(opportunityId, rawOpportunityTitle) ?? "";

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
  const phaseTitle = skeleton.data?.phases?.[phase?.id ?? ""]?.title ?? phase?.title;
  const missionTitle = weekDetail.data?.missions?.[mission?.id ?? ""]?.title ?? mission?.title;
  const assumptions = proof.data?.assumptions ?? [];
  const weekMissions = week?.missions ?? [];
  const missionsDone = weekMissions.filter((m) => m.state === "completed").length;
  const matrix = detail.data?.fit.matrix ?? null;
  const activity = [
    ...assumptions.flatMap((a) =>
      a.evidence.map((e) => ({
        id: `e-${e.id}`,
        kind: "evidence" as const,
        label: e.title ?? t(`pf.type.${e.type}` as const),
        at: e.createdAt,
      })),
    ),
    ...view.weeks.flatMap((w) =>
      w.missions.flatMap((m) =>
        m.completedAt
          ? [{ id: `m-${m.id}`, kind: "mission" as const, label: m.title, at: m.completedAt }]
          : [],
      ),
    ),
  ]
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 3);

  return (
    <>
      <header className="flex flex-col gap-1" data-testid="dashboard-header">
        <p className="min-h-[1.5rem] text-[1.0625rem] text-sol-secondary" data-testid="greeting">
          {greeting}
        </p>
        <h1 className="sol-page-title">
          {completed ? t("cc.c.completedTitle") : t("cc.c.titleClear")}
        </h1>
        {completed && (
          <p className="sol-body sol-prose mt-2 text-sol-secondary">{t("cc.c.completedBody")}</p>
        )}
      </header>

      {briefForHero && (
        <IdeaHero
          id={opportunityId}
          title={briefForHero.title}
          description={briefForHero.oneLiner || briefForHero.customer}
          badge={<FitPill fit={briefForHero.fit} />}
          aside={matrix ? <FitSignals rows={matrix.rows} layout="chips" /> : undefined}
          actions={
            <>
              <LinkButton
                to="/dashboard/roadmap"
                search={week && mission ? { week: week.number, mission: mission.id } : {}}
                variant="primary"
                size="md"
              >
                {t("cc.hero.continue")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </LinkButton>
              <LinkButton to="/dashboard/roadmap" search={{}} variant="secondary" size="md">
                {t("cc.hero.viewRoadmap")}
              </LinkButton>
            </>
          }
        />
      )}

      {week && !completed && (
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr_1fr]">
          {mission && week.state !== "generating_next" ? (
            <Card
              className="border-sol-violet/20 bg-sol-violet-soft/50 p-6"
              data-testid="todays-move"
            >
              <div key={mission.id} className="sol-reveal flex items-start gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sol-violet-soft text-sol-violet-deep">
                  <FileCheck2 className="size-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <Pill tone="violet">{t("cc.focus.label")}</Pill>
                  <h2 className="sol-h-sm mt-2 !text-[1.25rem]" data-testid="current-mission">
                    {missionTitle}
                  </h2>
                  {mission.timeEstimate && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[0.9375rem] text-sol-secondary">
                      <Clock3 className="size-4" aria-hidden="true" />
                      {mission.timeEstimate}
                    </p>
                  )}
                  <div>
                    <LinkButton
                      to="/dashboard/roadmap"
                      search={{ week: week.number, mission: mission.id }}
                      variant="primary"
                      size="md"
                      className="mt-4"
                      data-testid="start-mission"
                    >
                      {mission.state === "not_started"
                        ? t("rm.mission.start")
                        : t("cc.c.continueMission")}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </LinkButton>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card
              className="flex flex-col items-start justify-center gap-4 p-6"
              data-testid="week-wrap"
            >
              {week.state === "generating_next" ? (
                <p className="flex items-center gap-3 text-[1.25rem] text-sol-ink" role="status">
                  <Loader2 className="size-6 animate-spin text-sol-violet" aria-hidden="true" />
                  {t("rm.gen.preparingShort")}
                </p>
              ) : (
                <>
                  <span className="flex size-12 items-center justify-center rounded-full bg-sol-champagne text-sol-ink">
                    <Check className="size-6" strokeWidth={3} aria-hidden="true" />
                  </span>
                  <h2 className="sol-h-sm !text-[1.25rem]">{t("rm.week.readyToClose")}</h2>
                  <LinkButton
                    to="/dashboard/roadmap"
                    search={{ week: week.number }}
                    size="md"
                    data-testid="review-from-dashboard"
                  >
                    {t("rm.week.review")}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </LinkButton>
                </>
              )}
            </Card>
          )}

          <Card className="flex items-start gap-4 p-6" data-testid="business-pulse">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sol-champagne-soft text-sol-champagne-deep">
              <CalendarDays className="size-6" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.9375rem] text-sol-secondary">{t("cc.week.heading")}</p>
              <p className="mt-2 text-[1.25rem] font-medium text-sol-ink">
                {t("common.weekN", { n: String(week.number).padStart(2, "0") })}
              </p>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-sol-ivory-depth"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={weekMissions.length}
                aria-valuenow={missionsDone}
                aria-label={t("cc.ring.missions")}
              >
                <span
                  className="block h-full rounded-full bg-sol-violet transition-[width] duration-300"
                  style={{
                    width: `${weekMissions.length ? (missionsDone / weekMissions.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="mt-3 text-[0.9375rem] text-sol-secondary">
                {t("cc.week.missionsOf", { x: missionsDone, y: weekMissions.length })}
              </p>
            </div>
          </Card>

          <Card className="flex items-start gap-4 p-6" data-testid="surface-evidence">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sol-champagne-soft text-sol-champagne-deep">
              <Database className="size-6" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.9375rem] text-sol-secondary">{t("cc.surface.evidence")}</p>
              <p className="mt-2 text-[1.25rem] font-medium text-sol-ink">
                {t("rm.rail.captured", { n: view.totals.evidence })}
              </p>
              <LinkButton
                to="/dashboard/proof"
                search={{ opportunity: opportunityId, add: true }}
                variant="ghost"
                size="sm"
                className="-ml-3 mt-3 text-sol-violet-deep"
              >
                {t("pf.addEvidence")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </LinkButton>
            </div>
          </Card>
        </div>
      )}

      <Card className="flex flex-col gap-6 p-6" data-testid="mini-roadmap">
        <div className="flex items-center justify-between gap-3">
          <h2 className="sol-h-sm flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-sol-violet-soft text-sol-violet-deep">
              <MapIcon className="size-5" aria-hidden="true" />
            </span>
            {t("cc.mini.heading")}
          </h2>
          <LinkButton to="/dashboard/roadmap" variant="secondary" size="sm">
            {t("cc.mini.openFull")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </LinkButton>
        </div>
        <ol className="flex items-start" data-testid="journey-ribbon">
          {view.phases.map((p, i) => {
            const current = p.id === view.currentPhaseId;
            const done = p.state === "completed";
            const last = i === view.phases.length - 1;
            const name = (skeleton.data?.phases?.[p.id]?.title ?? p.title).split(/\s+/)[0];
            return (
              <li key={p.id} className="relative flex-1">
                {!last && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-1/2 right-[-50%] top-[1.25rem] h-[2px]",
                      done ? "bg-sol-champagne" : current ? "bg-sol-violet/50" : "bg-sol-border",
                    )}
                  />
                )}
                <button
                  type="button"
                  onClick={() => navigate({ to: "/dashboard/roadmap", search: { phase: p.id } })}
                  className="relative flex w-full flex-col items-center gap-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/50"
                >
                  <span
                    className={cn(
                      "relative z-10 flex size-10 items-center justify-center rounded-full border text-[1rem]",
                      done
                        ? "border-sol-champagne bg-sol-champagne text-sol-ink"
                        : current
                          ? "border-sol-violet bg-sol-violet text-white"
                          : "border-sol-border-strong bg-sol-surface text-sol-secondary",
                    )}
                  >
                    {done ? <Check className="size-5" strokeWidth={3} aria-hidden="true" /> : i + 1}
                  </span>
                  <span className="text-[1rem] font-medium text-sol-ink">{name}</span>
                  {p.range && (
                    <span className="text-[0.875rem] text-sol-secondary">
                      {t("common.weeksRange", { from: p.range.first, to: p.range.last })}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid gap-5">
        <Card className="flex flex-col gap-5 p-6" data-testid="recent-changes">
          <div className="flex items-center justify-between gap-3">
            <h2 className="sol-h-sm flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-sol-violet-soft text-sol-violet-deep">
                <History className="size-5" aria-hidden="true" />
              </span>
              {t("cc.activity.heading")}
            </h2>
            <LinkButton
              to="/dashboard/proof"
              search={{ opportunity: opportunityId }}
              variant="ghost"
              size="sm"
              className="text-sol-violet-deep"
            >
              {t("cc.viewAll")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
          </div>
          {activity.length === 0 ? (
            <p className="text-[0.9375rem] text-sol-secondary">{t("cc.activity.empty")}</p>
          ) : (
            <ol className="flex flex-col gap-4 border-l border-sol-border pl-5">
              {activity.map((a, i) => (
                <li key={a.id} className="relative flex items-center justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute -left-[1.6875rem] size-2.5 rounded-full",
                      i === 0 ? "bg-sol-violet" : "bg-sol-border-strong",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-[1rem] text-sol-ink">
                    {a.label}
                  </span>
                  <span className="shrink-0 text-[0.875rem] text-sol-secondary">
                    {relativeTime(a.at, locale)}
                  </span>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sol-ivory text-sol-secondary">
                    {a.kind === "mission" ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <FileCheck2 className="size-4" aria-hidden="true" />
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
