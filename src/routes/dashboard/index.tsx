import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Check,
  Compass,
  FlaskConical,
  Loader2,
  Map as MapIcon,
  Rocket,
  UserRound,
} from "lucide-react";

import { JourneyPreview, type PreviewStep } from "@/components/founder/dashboard/graphics";
import { ErrorPanel, LinkButton, PageSkeleton, Skeleton } from "@/components/founder/ui";
import { useDirection } from "@/components/os/direction";
import { stageOfPhase } from "@/components/os/roadmap";
import { BusinessGraphic } from "@/components/os/graphics";
import { IdeaReveal } from "@/components/os/IdeaReveal";
import {
  ActionArrow,
  OsDisplay,
  OsEyebrow,
  OsFact,
  OsFrame,
  OsLead,
  Priority,
  primaryActionClass,
  textActionClass,
} from "@/components/os/os";
import { getRoadmapView, type RoadmapView } from "@/lib/actions/roadmap";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useCurrentUserQuery, useFounderState } from "@/lib/queries";
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

/**
 * COMMAND — the founder's home. Before a choice it is the idea reveal; once a direction is
 * chosen it asks one thing: what should I do next?
 */
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
    <div className="flex flex-col gap-14" data-testid="command-center" data-stage={direction.stage}>
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
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#B8924F]/50 bg-[#FBF8F2] px-5 py-4"
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
    <section className="flex flex-col gap-10" data-testid="no-consultation">
      <div className="flex flex-col gap-6">
        <OsDisplay>{t("cc.none.title")}</OsDisplay>
        <OsLead>{t("cc.none.body")}</OsLead>
      </div>
      <OsFrame className="flex flex-col gap-8 p-6 sm:p-10">
        <JourneyPreview steps={steps} ariaLabel={t("cc.none.step.aria")} />
        <div className="flex flex-col items-start gap-4 border-t border-[#171A27]/10 pt-8">
          <p className="text-[1.375rem] font-semibold text-[#171A27]">{t("cc.none.cardTitle")}</p>
          <p className="max-w-[60ch] text-[1.0625rem] leading-relaxed text-[#2A2F3B]">
            {t("cc.none.cardBody")}
          </p>
          <Link to="/consultation" className={primaryActionClass}>
            {t("nav.findMyBusinessIdea")}
            <ActionArrow />
          </Link>
        </div>
      </OsFrame>
    </section>
  );
}

/** STATE A — ideas ready, nothing chosen yet: the first idea reveal. */
function IdeasReady({
  flagshipId,
  alternativeIds,
  readOnly,
}: {
  flagshipId: string;
  alternativeIds: string[];
  readOnly: boolean;
}) {
  const founder = useFounderState();
  const briefs = founder.data!.briefs;
  const flagship = briefs[flagshipId];
  if (!flagship) return <NoConsultation />;
  const alternatives = alternativeIds.flatMap((id) => (briefs[id] ? [briefs[id]] : []));
  return (
    <IdeaReveal
      flagship={flagship}
      alternatives={alternatives}
      consultationId={flagship.consultationId}
      readOnly={readOnly}
    />
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
  const { direction } = useDirection(founder.data!.briefs[opportunityId]);
  if (!direction) return <NoConsultation />;

  const building = stage === "roadmap_building";
  const failed = stage === "roadmap_failed";
  const goBuild = () => navigate({ to: "/dashboard/roadmap/building", search: { opportunityId } });

  return (
    <section
      className="grid items-center gap-10 @4xl:min-h-[calc(100dvh-72px-6rem)] @4xl:grid-cols-[1.12fr_1fr] @4xl:gap-14"
      data-testid="next-step"
    >
      <div className="flex flex-col gap-7">
        <OsEyebrow tone="champagne">{t("os.chosen.eyebrow")}</OsEyebrow>
        <OsDisplay size="title" data-testid="surface-direction">
          {direction.title}
        </OsDisplay>
        <OsLead>{t("os.chosen.next")}</OsLead>
        {(building || failed) && (
          <p
            role={failed ? "alert" : "status"}
            className="text-[1.0625rem] font-semibold text-[#171A27]"
          >
            {building ? t("os.chosen.building") : t("os.chosen.failed")}
          </p>
        )}
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
            <button
              type="button"
              className={primaryActionClass}
              onClick={goBuild}
              data-testid="build-roadmap"
            >
              {building
                ? t("cc.b.viewProgress")
                : failed
                  ? t("common.retry")
                  : hasArchivedRoadmap
                    ? t("cc.b.resumeCta")
                    : t("os.reveal.build")}
              <ActionArrow />
            </button>
            <Link to="/dashboard/opportunities" className={textActionClass}>
              {t("os.chosen.switch")}
              <ActionArrow />
            </Link>
          </div>
        )}
      </div>
      <OsFrame className="p-4 sm:p-6">
        <BusinessGraphic
          kind={direction.kind}
          nodes={direction.nodes}
          label={direction.graphicLabel}
          testId="chosen-graphic"
        />
      </OsFrame>
    </section>
  );
}

interface WeekOverlay {
  mission?: string;
  missions?: Record<string, { title?: string; why?: string }>;
}

/**
 * STATE C — the returning founder. ONE question: what should I do next? One specific move,
 * huge, with one action; its personalised model beside it; then the direction, at most three
 * priorities for the week, and what changed. Nothing else competes.
 */
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
  const founder = useFounderState();
  const { direction } = useDirection(founder.data?.briefs[opportunityId]);
  const view: RoadmapView | null | undefined = roadmap.data;
  const currentWeekId = view?.currentWeekId ?? null;
  const weekDetail = useTranslatedEntity<WeekOverlay>("week_detail", currentWeekId);
  const [whyOpen, setWhyOpen] = useState(false);

  if (roadmap.isPending) {
    return (
      <>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[22rem] w-full rounded-[1.5rem]" />
      </>
    );
  }
  if (roadmap.isError || !view) {
    return <ErrorPanel onRetry={() => void roadmap.refetch()} retrying={roadmap.isFetching} />;
  }

  const week = view.weeks.find((w) => w.id === view.currentWeekId) ?? null;
  const phaseIndex = view.phases.findIndex((p) => p.id === view.currentPhaseId);
  const phase = phaseIndex >= 0 ? view.phases[phaseIndex] : null;
  const mission =
    week?.missions.find((m) => m.state === "in_progress") ??
    week?.missions.find((m) => m.state === "not_started" && m.required) ??
    week?.missions.find((m) => m.state === "not_started") ??
    null;
  const missionText = (m: { id: string; title: string }) =>
    weekDetail.data?.missions?.[m.id]?.title ?? m.title;
  const missionWhy = mission ? (weekDetail.data?.missions?.[mission.id]?.why ?? mission.why) : "";
  const stage = stageOfPhase(phase?.key, Math.max(0, phaseIndex));
  const priorities = (week?.missions ?? []).slice(0, 3);
  const adaptation = week?.adaptationNote ?? null;
  const d = direction?.detail ?? null;
  const edge = d?.advantages[0] ?? direction?.why[0] ?? null;

  return (
    <>
      <header className="flex flex-col gap-4" data-testid="dashboard-header">
        <p
          className="min-h-[1.5rem] text-[1.0625rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250]"
          data-testid="greeting"
        >
          {greeting}
        </p>
        <OsDisplay>{completed ? t("cc.c.completedTitle") : t("os.cc.title")}</OsDisplay>
        {completed && <OsLead>{t("cc.c.completedBody")}</OsLead>}
      </header>

      {week && !completed && (
        <section className="flex flex-col" data-testid="founder-command-surface">
          {mission && week.state !== "generating_next" ? (
            <div className="flex flex-col gap-6" data-testid="todays-move">
              <div key={mission.id} className="flex flex-col gap-6 sol-reveal">
                <OsEyebrow tone="champagne">
                  {t("os.rm.week", { n: String(week.number).padStart(2, "0") })}
                  {mission.timeEstimate ? ` · ${mission.timeEstimate}` : ""}
                </OsEyebrow>
                <h2
                  className="max-w-[20ch] font-os text-[clamp(2.1rem,1.35rem+2.4vw,3.6rem)] font-medium leading-[1.04] tracking-[-0.035em] text-[#171A27]"
                  data-testid="current-mission"
                >
                  {missionText(mission)}
                </h2>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link
                    to="/dashboard/roadmap"
                    search={{ week: week.number, mission: mission.id }}
                    className={primaryActionClass}
                    data-testid="start-mission"
                  >
                    {mission.state === "not_started" ? t("os.cc.start") : t("os.cc.continue")}
                    <ActionArrow />
                  </Link>
                  {missionWhy && (
                    <button
                      type="button"
                      aria-expanded={whyOpen}
                      onClick={() => setWhyOpen((v) => !v)}
                      className={textActionClass}
                      data-testid="why-this"
                    >
                      {t("os.cc.why")}
                    </button>
                  )}
                </div>
                {whyOpen && missionWhy && (
                  <p className="max-w-[56ch] border-l-2 border-[#B8924F] pl-4 text-[1.0625rem] leading-relaxed text-[#2A2F3B]">
                    {missionWhy}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-6" data-testid="week-wrap">
              {week.state === "generating_next" ? (
                <p
                  className="flex items-center gap-3 font-os text-[1.75rem] font-medium text-[#171A27]"
                  role="status"
                >
                  <Loader2 className="size-6 animate-spin text-[#2F62D9]" aria-hidden="true" />
                  {t("os.cc.preparing")}
                </p>
              ) : (
                <>
                  <span className="flex size-14 items-center justify-center rounded-full bg-[#B8924F] text-white">
                    <Check className="size-7" strokeWidth={3} aria-hidden="true" />
                  </span>
                  <h2 className="font-os text-[clamp(1.85rem,1.3rem+1.8vw,3rem)] font-medium leading-[1.06] tracking-[-0.03em] text-[#171A27]">
                    {t("os.cc.weekDone")}
                  </h2>
                  <Link
                    to="/dashboard/roadmap"
                    search={{ week: week.number }}
                    className={primaryActionClass}
                    data-testid="review-from-dashboard"
                  >
                    {t("os.cc.review")}
                    <ActionArrow />
                  </Link>
                </>
              )}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-12 border-t border-[#171A27]/10 pt-12 @4xl:grid-cols-3 @4xl:gap-10">
        {/* The direction, in three facts. */}
        <section className="flex flex-col gap-5" data-testid="current-direction">
          <OsEyebrow>{t("os.cc.direction")}</OsEyebrow>
          {direction && (
            <BusinessGraphic
              kind={direction.kind}
              nodes={direction.nodes}
              size="mini"
              label={direction.graphicLabel}
              testId="command-graphic"
              className="max-w-[22rem] rounded-xl border border-[#171A27]/[0.06] bg-white/70"
            />
          )}
          <div className="flex flex-col gap-2">
            <h2 className="font-os text-[1.625rem] font-medium uppercase leading-[1.05] tracking-[-0.02em] text-[#171A27]">
              {direction?.title ?? view.roadmap.opportunityTitle}
            </h2>
            <p className="text-[0.9375rem] font-semibold uppercase tracking-[0.12em] text-[#7A5B2B]">
              {t(`os.cc.stage.${stage}` as const)}
            </p>
          </div>
          {d && (
            <dl className="flex flex-col gap-4">
              {d.startingCapital && (
                <OsFact label={t("os.cc.startCost")} value={d.startingCapital} />
              )}
              {d.weeklyTime && <OsFact label={t("os.cc.time")} value={d.weeklyTime} />}
              {edge && <OsFact label={t("os.cc.advantage")} value={edge} />}
            </dl>
          )}
        </section>

        {/* This week: at most three priorities. */}
        <section className="flex flex-col gap-3" data-testid="this-week">
          <OsEyebrow>{t("os.cc.thisWeek")}</OsEyebrow>
          {week && priorities.length > 0 ? (
            <div className="flex flex-col">
              {priorities.map((m, i) => (
                <Priority
                  key={m.id}
                  n={i + 1}
                  title={missionText(m)}
                  done={m.state === "completed"}
                  active={m.id === mission?.id}
                  testId="track-node"
                  onOpen={() =>
                    navigate({
                      to: "/dashboard/roadmap",
                      search: { week: week.number, mission: m.id },
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <Link to="/dashboard/roadmap" className={textActionClass}>
              {t("os.cc.openRoadmap")}
              <ActionArrow />
            </Link>
          )}
        </section>

        {/* What changed: a compact, honest recap. */}
        <section className="flex flex-col gap-4" data-testid="what-changed">
          <OsEyebrow>{t("os.cc.changed")}</OsEyebrow>
          <h2 className="font-os text-[1.625rem] font-medium uppercase leading-[1.05] tracking-[-0.02em] text-[#171A27]">
            {adaptation ? t("os.cc.adapted") : t("os.cc.unchanged")}
          </h2>
          <p
            className="text-[1.0625rem] leading-relaxed text-[#2A2F3B]"
            data-testid="adaptation-summary"
          >
            {adaptation ?? t("os.cc.unchangedBody")}
          </p>
          {adaptation && week && (
            <Link
              to="/dashboard/roadmap"
              search={{ week: week.number }}
              className={textActionClass}
            >
              {t("os.cc.seeWhy")}
              <ActionArrow />
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
