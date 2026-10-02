import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  Clock3,
  Compass,
  FileCheck2,
  Lightbulb,
  Loader2,
  Rocket,
  Users,
  Wallet,
} from "lucide-react";
import { Line, LineChart, ReferenceDot, ResponsiveContainer } from "recharts";

import {
  AlternativeCard,
  BriefFacts,
  FitPill,
  FlagshipCard,
} from "@/components/founder/OpportunityCards";
import {
  GhostChart,
  GhostNodes,
  JourneyRibbon,
  MomentumBars,
  ProgressRing,
  StackedBar,
  WeekTrack,
  type MomentumDay,
  type RibbonPhase,
} from "@/components/founder/dashboard/graphics";
import { ExecutionPath } from "@/components/founder/ExecutionPath";
import { FitStatusPill } from "@/components/founder/fit";
import { EvidenceMap } from "@/components/founder/proof/EvidenceMap";
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
import {
  exploreMoreOpportunities,
  chooseDirection,
  getOpportunityDetail,
} from "@/lib/actions/opportunities";
import { getOpportunityEconomics } from "@/lib/actions/economics";
import {
  breakEvenCustomers,
  contributionPerCustomer,
  revenueSensitivityPoints,
} from "@/lib/economics";
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
      <Card className="p-6 sm:p-8" data-testid="chosen-direction">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>{t("cc.b.chosen")}</Eyebrow>
          <FitPill fit={brief.fit} />
        </div>
        <h2 className="mt-3 max-w-[30ch] font-display text-[clamp(1.5rem,1.25rem+1vw,2rem)] font-semibold leading-[1.15] text-sol-ink">
          {brief.title}
        </h2>
        <p className="sol-body sol-prose mt-3 text-sol-secondary">{brief.oneLiner}</p>
        <div className="mt-6">
          <BriefFacts brief={brief} columns={3} limit={3} />
        </div>
      </Card>
    </>
  );
}

const FIT_PIPS = { strong: 3, moderate: 2, conditional: 1 } as const;
const FIT_ICONS = {
  capability: Lightbulb,
  resources: Wallet,
  access: Users,
  ambition: Rocket,
} as const;

const localKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The last 14 days, one entry per day: missions finished (from their completion
 * time) and evidence captured (from the date the founder gave it). */
function buildMomentum(view: RoadmapView, assumptions: AssumptionDTO[]): MomentumDay[] {
  const now = new Date();
  const days: MomentumDay[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push({ key: localKey(d), missions: 0, evidence: 0, today: i === 0 });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const w of view.weeks) {
    for (const m of w.missions) {
      if (!m.completedAt) continue;
      const day = byKey.get(localKey(new Date(m.completedAt)));
      if (day) day.missions += 1;
    }
  }
  for (const a of assumptions) {
    for (const e of a.evidence) {
      const day = byKey.get(e.occurredOn);
      if (day) day.evidence += 1;
    }
  }
  return days;
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
  const economics = useQuery({
    queryKey: qk.opportunityEconomics(opportunityId),
    queryFn: () => getOpportunityEconomics({ data: { opportunityId } }),
    staleTime: 30_000,
  });
  const view: RoadmapView | null | undefined = roadmap.data;
  const currentWeekId = view?.currentWeekId ?? null;
  const skeleton = useTranslatedEntity<SkeletonOverlay>("roadmap_skeleton", roadmapId);
  const weekDetail = useTranslatedEntity<WeekOverlay>("week_detail", currentWeekId);
  const rawOpportunityTitle = useFounderState().data?.briefs[opportunityId]?.title ?? "";
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
  const weekTitle = skeleton.data?.weeks?.[week?.id ?? ""]?.title ?? week?.title;
  const phaseTitle = skeleton.data?.phases?.[phase?.id ?? ""]?.title ?? phase?.title;
  const missionTitle = weekDetail.data?.missions?.[mission?.id ?? ""]?.title ?? mission?.title;
  const adaptation = week?.adaptationNote ?? null;
  const counts = proof.data?.counts;
  const assumptions = proof.data?.assumptions ?? [];
  const weekMissions = week?.missions ?? [];
  const missionsDone = weekMissions.filter((m) => m.state === "completed").length;
  const requiredMissions = weekMissions.filter((m) => m.required);
  const econ = economics.data ?? null;
  const contribution = econ ? contributionPerCustomer(econ) : null;
  const breakEven = econ ? breakEvenCustomers(econ) : null;
  const sensPoints = econ ? revenueSensitivityPoints(econ) : [];
  const matrix = detail.data?.fit.matrix ?? null;
  const supportedN = counts?.supported ?? 0;
  const testingN = (counts?.weak ?? 0) + (counts?.mixed ?? 0);
  const untestedN = counts?.untested ?? 0;
  const contradictedN = counts?.contradicted ?? 0;
  const momentum = buildMomentum(view, assumptions);
  const momentumTotal = momentum.reduce((n, d) => n + d.missions + d.evidence, 0);
  const weekDone = weekMissions.length > 0 && missionsDone === weekMissions.length;
  const nextWeekLabel =
    week && week.number < view.totals.weeks
      ? t("common.weekN", { n: String(week.number + 1).padStart(2, "0") })
      : t("rm.state.completed");
  const phaseRibbon: RibbonPhase[] = view.phases.map((p, i) => ({
    id: p.id,
    number: i + 1,
    title: skeleton.data?.phases?.[p.id]?.title ?? p.title,
    current: p.id === view.currentPhaseId,
    weeks: p.weekIds.flatMap((wid) => {
      const w = view.weeks.find((x) => x.id === wid);
      return w
        ? [
            {
              id: w.id,
              state: (w.state === "completed"
                ? "completed"
                : w.id === view.currentWeekId
                  ? "current"
                  : "future") as "completed" | "current" | "future",
            },
          ]
        : [];
    }),
  }));

  return (
    <>
      <header className="flex flex-col gap-1.5" data-testid="dashboard-header">
        <p
          className="min-h-[1.75rem] text-[1.1875rem] font-semibold text-sol-secondary"
          data-testid="greeting"
        >
          {greeting}
        </p>
        <h1 className="sol-page-title">
          {completed ? t("cc.c.completedTitle") : t("cc.c.titleClear")}
        </h1>
        {completed && (
          <p className="sol-body sol-prose mt-2 text-sol-secondary">{t("cc.c.completedBody")}</p>
        )}
      </header>

      {week && !completed && (
        <section
          className="relative overflow-hidden rounded-[24px] bg-workspace p-6 sm:p-8"
          data-testid="founder-command-surface"
        >
          {/* Subtle violet illumination only — the surface itself stays the
              deliberate navy/near-black, never a gradient background. */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 480px 320px at 85% -10%, var(--workspace-violet-glow), transparent 70%)",
            }}
            aria-hidden="true"
          />

          {/* Top row: Active Direction / Current Week / Evidence — real data only. */}
          <div className="relative grid gap-5 border-b border-workspace-border pb-5 sm:grid-cols-[1.35fr_1fr_1.15fr]">
            <div className="min-w-0">
              <p className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-workspace-muted">
                {t("cc.surface.direction")}
              </p>
              <p
                className="mt-1.5 line-clamp-2 text-[1.1875rem] font-semibold leading-snug text-workspace-foreground"
                data-testid="surface-direction"
              >
                {opportunityTitle}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-workspace-muted">
                {t("cc.surface.week")}
              </p>
              <p className="mt-1.5 text-[1.1875rem] font-semibold leading-snug text-workspace-foreground">
                {t("common.weekN", { n: String(week.number).padStart(2, "0") })}
              </p>
              <p className="truncate text-[0.9375rem] text-workspace-muted">{weekTitle}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-workspace-muted">
                {t("cc.surface.evidence")}
              </p>
              <p
                className="mt-1.5 text-[1.1875rem] font-semibold leading-snug text-workspace-foreground"
                data-testid="surface-evidence"
              >
                {proof.data && assumptions.length > 0
                  ? t("cc.surface.evidenceLine", {
                      captured: view.totals.evidence,
                      supported: supportedN,
                      testing: testingN,
                    })
                  : t("cc.surface.evidenceNone")}
              </p>
              <div className="mt-2.5">
                <StackedBar
                  ariaLabel={t("cc.surface.evidenceAria")}
                  track="bg-white/10"
                  segments={[
                    {
                      value: supportedN,
                      className: "bg-sol-champagne",
                      label: t("cc.map.legend.supported"),
                    },
                    {
                      value: testingN,
                      className: "bg-sol-violet",
                      label: t("cc.map.legend.testing"),
                    },
                    {
                      value: contradictedN,
                      className: "bg-sol-warning",
                      label: t("pf.state.contradicted"),
                    },
                    {
                      value: untestedN,
                      className: "bg-white/25",
                      label: t("cc.map.legend.untested"),
                    },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* The execution path — each stop read off the founder's real assumptions. */}
          <div className="relative mt-5">
            <p className="mb-3 text-[0.875rem] font-bold uppercase tracking-[0.1em] text-sol-champagne">
              {t("cc.path.heading")}
            </p>
            <ExecutionPath
              opportunityId={opportunityId}
              assumptions={assumptions}
              loading={proof.isPending}
            />
          </div>

          <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-workspace-border pt-5">
            <div className="min-w-0 flex-1">
              {week.state === "generating_next" ? (
                <p className="sol-body text-workspace-muted" role="status">
                  {week.generationStatus === "failed"
                    ? t("rm.gen.failedShort")
                    : t("rm.gen.preparingShort")}
                </p>
              ) : week.state === "ready_to_close" ? (
                <p className="sol-body text-workspace-foreground">{t("cc.c.readyToClose")}</p>
              ) : (
                <p className="text-[0.9375rem] text-workspace-muted">
                  {t(`rm.state.${week.state}` as const)}
                </p>
              )}
            </div>
            <LinkButton
              to="/dashboard/roadmap"
              search={{ week: week.number, mission: mission?.id }}
              variant="secondary"
              size="lg"
              className="border-workspace-border bg-transparent text-workspace-foreground hover:border-sol-violet/50"
              data-testid="continue-mission"
            >
              {week.state === "ready_to_close" ? t("rm.week.review") : t("cc.c.openWeek")}
            </LinkButton>
          </div>
        </section>
      )}

      {/* Today's Move + this week as a track that ends at the next unlock. */}
      {week && !completed && (
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          {mission && week.state !== "generating_next" ? (
            <Card
              className="relative overflow-hidden border-l-[6px] border-l-sol-champagne p-6 sm:p-8"
              data-testid="todays-move"
            >
              <Eyebrow className="text-sol-champagne-deep">{t("cc.today.heading")}</Eyebrow>
              <h2
                className="mt-3 max-w-[30ch] font-display text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)] font-semibold leading-[1.15] text-sol-ink"
                data-testid="current-mission"
              >
                {missionTitle}
              </h2>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {mission.timeEstimate && (
                  <Pill>
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    {mission.timeEstimate}
                  </Pill>
                )}
                {mission.evidenceRequired && (
                  <Pill tone="violet">
                    <FileCheck2 className="size-3.5" aria-hidden="true" />
                    {t("rm.evidenceRequired")}
                  </Pill>
                )}
              </div>
              <div className="mt-6">
                <LinkButton
                  to="/dashboard/roadmap"
                  search={{ week: week.number, mission: mission.id }}
                  variant="primary"
                  size="lg"
                  data-testid="start-mission"
                >
                  {mission.state === "not_started"
                    ? t("rm.mission.start")
                    : t("cc.c.continueMission")}
                  <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
                </LinkButton>
              </div>
            </Card>
          ) : (
            <Card
              className="flex flex-col items-start justify-center gap-5 border-l-[6px] border-l-sol-champagne p-6 sm:p-8"
              data-testid="week-wrap"
            >
              {week.state === "generating_next" ? (
                <p
                  className="flex items-center gap-3 font-display text-[1.5rem] font-semibold text-sol-ink"
                  role="status"
                >
                  <Loader2 className="size-6 animate-spin text-sol-violet" aria-hidden="true" />
                  {t("rm.gen.preparingShort")}
                </p>
              ) : (
                <>
                  <span className="flex size-14 items-center justify-center rounded-full bg-sol-champagne text-sol-ink">
                    <Check className="size-7" strokeWidth={3} aria-hidden="true" />
                  </span>
                  <h2 className="font-display text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)] font-semibold leading-[1.15] text-sol-ink">
                    {t("rm.week.readyToClose")}
                  </h2>
                  <LinkButton
                    to="/dashboard/roadmap"
                    search={{ week: week.number }}
                    size="lg"
                    data-testid="review-from-dashboard"
                  >
                    {t("rm.week.review")}
                    <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
                  </LinkButton>
                </>
              )}
            </Card>
          )}

          <Card className="flex flex-col gap-5 p-6" data-testid="next-unlock">
            <h2 className="sol-eyebrow">{t("cc.unlock.heading")}</h2>
            <div className="my-auto">
              <WeekTrack
                testId="week-track"
                missions={weekMissions.map((m) => ({
                  id: m.id,
                  title: weekDetail.data?.missions?.[m.id]?.title ?? m.title,
                  state: m.state,
                }))}
                unlocked={weekDone || week.state === "ready_to_close"}
                nextLabel={nextWeekLabel}
                onOpen={(missionId) =>
                  navigate({
                    to: "/dashboard/roadmap",
                    search: { week: week.number, mission: missionId },
                  })
                }
              />
            </div>
          </Card>
        </div>
      )}

      {/* Pulse rings + evidence map — real counts and real assumptions. */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card className="flex flex-col gap-5 p-6" data-testid="business-pulse">
          <h2 className="sol-eyebrow">{t("cc.pulse.heading")}</h2>
          <div className="my-auto flex flex-wrap items-start justify-around gap-5">
            <ProgressRing
              testId="ring-missions"
              label={t("cc.ring.missions")}
              value={missionsDone}
              total={weekMissions.length}
              tone="violet"
            />
            <ProgressRing
              testId="ring-supported"
              label={t("cc.ring.supported")}
              value={supportedN}
              total={assumptions.length}
              tone="champagne"
            />
            <ProgressRing
              testId="ring-weeks"
              label={t("cc.ring.weeks")}
              value={view.totals.completedWeeks}
              total={view.totals.weeks}
              tone="violet"
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6" data-testid="dashboard-evidence-map">
          <div className="flex items-center justify-between gap-3">
            <h2 className="sol-eyebrow">{t("cc.map.heading")}</h2>
            <LinkButton
              to="/dashboard/proof"
              search={{ opportunity: opportunityId }}
              variant="ghost"
              size="sm"
              aria-label={t("cc.c.openProof")}
              title={t("cc.c.openProof")}
            >
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
          </div>
          {proof.isPending ? (
            <Skeleton className="h-28" />
          ) : assumptions.length > 0 ? (
            <EvidenceMap
              assumptions={assumptions}
              onSelect={(id) =>
                navigate({
                  to: "/dashboard/proof",
                  search: { opportunity: opportunityId, assumption: id },
                })
              }
            />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <GhostNodes />
              <p className="text-[0.9375rem] leading-snug text-sol-secondary">
                {t("cc.map.empty")}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Founder fit as four bars; economics as a chart (or the shape of one). */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="flex flex-col gap-4 p-6" data-testid="opportunity-pulse">
          <h2 className="sol-eyebrow">{t("cc.oppPulse.heading")}</h2>
          {detail.isPending || !matrix ? (
            <Skeleton className="h-28" />
          ) : (
            <ul className="flex flex-col gap-3">
              {matrix.rows.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3 text-[0.9375rem] font-semibold text-sol-ink">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-sol-champagne-soft text-sol-champagne-deep">
                      {(() => {
                        const Icon = FIT_ICONS[row.key];
                        return <Icon className="size-4" aria-hidden="true" />;
                      })()}
                    </span>
                    {t(`fit.row.${row.key}` as const)}
                  </span>
                  <span
                    className="flex items-center gap-1.5"
                    role="img"
                    aria-label={t(`fit.status.${row.status}` as const)}
                    title={t(`fit.status.${row.status}` as const)}
                  >
                    {[1, 2, 3].map((n) => (
                      <span
                        key={n}
                        className={cn(
                          "h-2.5 w-8 rounded-full",
                          n <= FIT_PIPS[row.status]
                            ? row.status === "strong"
                              ? "bg-sol-champagne-deep"
                              : "bg-sol-violet"
                            : "bg-sol-ivory-depth",
                        )}
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-6" data-testid="economics-snapshot">
          <div className="flex items-center justify-between gap-3">
            <h2 className="sol-eyebrow">{t("cc.econ.heading")}</h2>
            {econ?.exists && <Pill>{t("opp.econ.assumptionBadge")}</Pill>}
          </div>
          {economics.isPending ? (
            <Skeleton className="h-28" />
          ) : econ && econ.exists && econ.pricePerCustomer != null ? (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-[0.875rem] font-semibold text-sol-secondary">
                    {t("opp.econ.contribution")}
                  </dt>
                  <dd className="mt-1 font-display text-[1.5rem] font-semibold text-sol-ink">
                    {contribution != null
                      ? `${econ.currency} ${contribution.toLocaleString()}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.875rem] font-semibold text-sol-secondary">
                    {t("opp.econ.breakEven")}
                  </dt>
                  <dd className="mt-1 font-display text-[1.5rem] font-semibold text-sol-ink">
                    {breakEven != null ? breakEven : "—"}
                  </dd>
                </div>
              </dl>
              {sensPoints.length > 1 && (
                <div className="h-24 w-full" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sensPoints}>
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="var(--sol-violet)"
                        strokeWidth={2}
                        dot={false}
                      />
                      {breakEven != null && (
                        <ReferenceDot
                          x={breakEven}
                          y={econ.pricePerCustomer * breakEven}
                          r={4}
                          fill="var(--sol-champagne-deep)"
                          stroke="none"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <GhostChart />
          )}
          <LinkButton
            to="/dashboard/opportunities/$id"
            params={{ id: opportunityId }}
            search={{ tab: "economics" }}
            variant="ghost"
            size="sm"
            className="mt-auto self-start"
          >
            {econ?.exists ? t("opp.econ.edit") : t("opp.econ.add")}
          </LinkButton>
        </Card>
      </div>

      {/* The whole roadmap on one line, and the last fortnight's momentum. */}
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="flex flex-col gap-5 p-6" data-testid="mini-roadmap">
          <div className="flex items-center justify-between gap-3">
            <h2 className="sol-eyebrow">{t("cc.mini.heading")}</h2>
            <LinkButton
              to="/dashboard/roadmap"
              variant="ghost"
              size="sm"
              aria-label={t("cc.mini.openFull")}
              title={t("cc.mini.openFull")}
            >
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
          </div>
          <JourneyRibbon
            phases={phaseRibbon}
            onOpenPhase={(id) => navigate({ to: "/dashboard/roadmap", search: { phase: id } })}
          />
          {phaseTitle && (
            <p className="truncate text-[0.9375rem] font-semibold text-sol-secondary">
              {phaseTitle}
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-6" data-testid="recent-changes">
          <h2 className="sol-eyebrow">{t("cc.mom.heading")}</h2>
          <MomentumBars
            days={momentum}
            ariaLabel={t("cc.mom.aria")}
            missionsLabel={t("cc.mom.missions")}
            evidenceLabel={t("cc.mom.evidence")}
          />
          {momentumTotal === 0 && (
            <p className="text-[0.9375rem] text-sol-secondary">{t("cc.mom.empty")}</p>
          )}
        </Card>
      </div>
    </>
  );
}
