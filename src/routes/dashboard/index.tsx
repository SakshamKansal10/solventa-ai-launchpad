import { useEffect, useState, type ReactNode } from "react";
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
  type LucideIcon,
} from "lucide-react";

import { BriefChain, FitPill, FlagshipCard } from "@/components/founder/OpportunityCards";
import { IdeaHero } from "@/components/founder/OpportunityImage";
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
import { chooseDirection, getOpportunityDetail } from "@/lib/actions/opportunities";
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
        <IdeasReady flagshipId={direction.flagshipId} readOnly={readOnly} />
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
function IdeasReady({ flagshipId, readOnly }: { flagshipId: string; readOnly: boolean }) {
  const { t } = useLocale();
  const founder = useFounderState();
  const invalidate = useInvalidateFounder();
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

  const flagship = briefs[flagshipId];
  if (!flagship) return <NoConsultation />;

  return (
    <>
      <PageHeader title={t("cc.a.title")} subtitle={t("cc.a.subtitle")} />
      <FlagshipCard
        brief={flagship}
        readOnly={readOnly}
        disabled={choose.isPending}
        choosing={choose.isPending}
        onChoose={() => choose.mutate(flagshipId)}
      />
      {!readOnly && (
        <div className="flex flex-col items-start gap-2">
          <LinkButton
            to="/dashboard/opportunities"
            variant="soft"
            size="lg"
            data-testid="explore-more"
          >
            <Compass className="size-5" aria-hidden="true" />
            {t("cc.exploreMore")}
          </LinkButton>
          <p className="text-[0.9375rem] text-sol-secondary">{t("cc.exploreMore.hint")}</p>
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
  const assessment = detail.data?.fit.assessment ?? null;

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
            className="relative mt-5 rounded-2xl border border-sol-cobalt/40 bg-sol-cobalt/15 px-4 py-3 text-[1rem] text-workspace-foreground"
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
              className="w-full border-workspace-border bg-transparent text-workspace-foreground hover:border-sol-cobalt/50 sm:w-auto"
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
        ) : assessment ? (
          <FitSignals rows={assessment.factors} layout="tiles" />
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
  const view: RoadmapView | null | undefined = roadmap.data;
  const currentWeekId = view?.currentWeekId ?? null;
  const skeleton = useTranslatedEntity<SkeletonOverlay>("roadmap_skeleton", roadmapId);
  const weekDetail = useTranslatedEntity<WeekOverlay>("week_detail", currentWeekId);
  const founderState = useFounderState().data;
  const rawBrief = founderState?.briefs[opportunityId];
  const translatedBrief = useTranslatedBrief(rawBrief) ?? rawBrief;
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
  const mission =
    week?.missions.find((m) => m.state === "in_progress") ??
    week?.missions.find((m) => m.state === "not_started" && m.required) ??
    week?.missions.find((m) => m.state === "not_started") ??
    null;
  const missionTitle = weekDetail.data?.missions?.[mission?.id ?? ""]?.title ?? mission?.title;
  const weekMissions = week?.missions ?? [];
  const missionsDone = weekMissions.filter((m) => m.state === "completed").length;
  const weekCount = view.totals.weeks;
  const weekProgress = weekMissions.length ? (missionsDone / weekMissions.length) * 100 : 0;
  const journeyProgress = weekCount ? (view.totals.completedWeeks / weekCount) * 100 : 0;
  const headline = mission && week?.state !== "generating_next" ? missionTitle : null;

  return (
    <>
      <header className="flex flex-col gap-1" data-testid="dashboard-header">
        <p className="min-h-[1.5rem] text-[1rem] text-sol-secondary" data-testid="greeting">
          {greeting}
        </p>
        <h1 className="sol-page-title">
          {completed ? t("cc.c.completedTitle") : t("cc.c.titleClear")}
        </h1>
        {completed && (
          <p className="sol-body sol-prose mt-2 text-sol-secondary">{t("cc.c.completedBody")}</p>
        )}
      </header>

      {translatedBrief && (
        <section
          aria-label={t("cc.idea.label")}
          className="flex flex-col gap-4 rounded-2xl border border-sol-border bg-sol-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6"
          data-testid="your-idea"
        >
          <div className="flex min-w-0 flex-col gap-2">
            <p className="sol-eyebrow">{t("cc.idea.label")}</p>
            <h2 className="sol-h-sm !text-[1.25rem]">{translatedBrief.title}</h2>
            {translatedBrief.oneLiner && (
              <p className="line-clamp-2 max-w-[64ch] text-[0.9375rem] leading-snug text-sol-secondary">
                {translatedBrief.oneLiner}
              </p>
            )}
            {translatedBrief.whyFit[0] && (
              <p className="flex max-w-[64ch] items-start gap-2.5 text-[0.9375rem] leading-snug text-sol-ink">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sol-cobalt-soft text-sol-cobalt-deep">
                  <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                </span>
                <span className="min-w-0">{translatedBrief.whyFit[0]}</span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <LinkButton
              to="/dashboard/opportunities/$id"
              params={{ id: opportunityId }}
              variant="secondary"
              size="md"
            >
              {t("cc.idea.view")}
            </LinkButton>
            <LinkButton
              to="/dashboard/opportunities"
              variant="soft"
              size="md"
              data-testid="explore-more"
            >
              <Compass className="size-4" aria-hidden="true" />
              {t("cc.exploreMore")}
            </LinkButton>
          </div>
        </section>
      )}

      <section
        className="sol-atmosphere p-6 sm:p-8"
        data-testid={week && !completed && !mission ? "week-wrap" : "todays-move"}
      >
        <div className="relative z-10 flex flex-col gap-6 sm:min-h-[13rem] sm:pr-72 lg:pr-88">
          {opportunityTitle && (
            <p className="text-[0.9375rem] text-sol-secondary">
              {t("cc.hero.label")}
              <span className="mx-2 text-sol-champagne-deep" aria-hidden="true">
                ·
              </span>
              <span className="font-medium text-sol-ink">{opportunityTitle}</span>
            </p>
          )}
          {week && !completed ? (
            headline ? (
              <div key={mission!.id} className="sol-reveal flex flex-col items-start gap-3">
                <Pill tone="cobalt">{t("cc.focus.label")}</Pill>
                <h2 className="sol-h-sm max-w-xl !text-[1.5rem]" data-testid="current-mission">
                  {headline}
                </h2>
                {mission!.timeEstimate && (
                  <p className="inline-flex items-center gap-1.5 text-[0.9375rem] text-sol-secondary">
                    <Clock3 className="size-4" aria-hidden="true" />
                    {mission!.timeEstimate}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-3">
                  <LinkButton
                    to="/dashboard/roadmap"
                    search={{ week: week.number, mission: mission!.id }}
                    variant="primary"
                    size="md"
                    data-testid="start-mission"
                  >
                    {mission!.state === "not_started"
                      ? t("rm.mission.start")
                      : t("cc.c.continueMission")}
                    <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
                  </LinkButton>
                  <LinkButton to="/dashboard/roadmap" search={{}} variant="secondary" size="md">
                    {t("cc.hero.viewRoadmap")}
                  </LinkButton>
                </div>
              </div>
            ) : week.state === "generating_next" ? (
              <p className="flex items-center gap-3 text-[1.25rem] text-sol-ink" role="status">
                <Loader2 className="size-6 animate-spin text-sol-cobalt" aria-hidden="true" />
                {t("rm.gen.preparingShort")}
              </p>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-sol-champagne text-sol-ink">
                  <Check className="size-5" strokeWidth={3} aria-hidden="true" />
                </span>
                <h2 className="sol-h-sm !text-[1.5rem]">{t("rm.week.readyToClose")}</h2>
                <LinkButton
                  to="/dashboard/roadmap"
                  search={{ week: week.number }}
                  size="md"
                  data-testid="review-from-dashboard"
                >
                  {t("rm.week.review")}
                  <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
                </LinkButton>
              </div>
            )
          ) : (
            <div className="flex flex-wrap gap-3">
              <LinkButton to="/dashboard/roadmap" search={{}} variant="primary" size="md">
                {t("cc.hero.viewRoadmap")}
                <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
              </LinkButton>
              <LinkButton
                to="/dashboard/proof"
                search={{ opportunity: opportunityId }}
                size="md"
                variant="secondary"
              >
                {t("cc.c.openProof")}
              </LinkButton>
            </div>
          )}
        </div>
      </section>

      {week && (
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricTile
            testId="business-pulse"
            icon={CalendarDays}
            label={t("cc.week.heading")}
            value={t("common.weekN", { n: String(week.number).padStart(2, "0") })}
            note={t("cc.week.missionsOf", { x: missionsDone, y: weekMissions.length })}
            progress={weekProgress}
            progressLabel={t("cc.ring.missions")}
          />
          <MetricTile
            icon={MapIcon}
            label={t("cc.c.roadmap")}
            value={t("cc.c.weekOf", { x: week.number, y: weekCount })}
            note={t("cc.mini.heading")}
            progress={journeyProgress}
            progressLabel={t("cc.c.roadmap")}
          />
          <MetricTile
            testId="surface-evidence"
            icon={Database}
            label={t("cc.surface.evidence")}
            value={t("rm.rail.captured", { n: view.totals.evidence })}
          />
        </div>
      )}

      <Card className="flex flex-col gap-6 p-6" data-testid="mini-roadmap">
        <div className="flex items-center justify-between gap-3">
          <h2 className="sol-h-sm">{t("cc.mini.heading")}</h2>
          <LinkButton
            to="/dashboard/roadmap"
            variant="ghost"
            size="sm"
            className="text-sol-cobalt-deep"
          >
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
                      done ? "bg-sol-champagne" : current ? "bg-sol-cobalt/50" : "bg-sol-border",
                    )}
                  />
                )}
                <button
                  type="button"
                  onClick={() => navigate({ to: "/dashboard/roadmap", search: { phase: p.id } })}
                  className="relative flex w-full flex-col items-center gap-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-sol-cobalt/50"
                >
                  <span
                    className={cn(
                      "relative z-10 flex size-10 items-center justify-center rounded-full border text-[1rem]",
                      done
                        ? "border-sol-champagne bg-sol-champagne text-sol-ink"
                        : current
                          ? "border-sol-cobalt bg-sol-cobalt text-white shadow-[0_0_0_5px_rgba(155,130,255,0.18)]"
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
    </>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  note,
  progress,
  progressLabel,
  action,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note?: string;
  progress?: number;
  progressLabel?: string;
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <Card className="flex flex-col gap-2 p-5" data-testid={testId}>
      <div className="flex items-center gap-2 text-[0.9375rem] text-sol-secondary">
        <Icon className="size-4 text-sol-cobalt-deep" strokeWidth={1.75} aria-hidden="true" />
        {label}
      </div>
      <p className="text-[1.375rem] font-medium text-sol-ink">{value}</p>
      {progress !== undefined && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-sol-ivory-depth"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label={progressLabel}
        >
          <span
            className="block h-full rounded-full bg-sol-cobalt transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {note && <p className="text-[0.875rem] text-sol-secondary">{note}</p>}
      {action}
    </Card>
  );
}
