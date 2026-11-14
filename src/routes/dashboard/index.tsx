import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { FitSummaryCard } from "@/components/founder/dash/FitBar";
import { JourneyBlock } from "@/components/founder/dash/JourneyBlock";
import { NextSteps } from "@/components/founder/dash/NextSteps";
import {
  ActionButton,
  ActionLink,
  Arrow,
  DashError,
  DashPage,
  DashSkeleton,
  Label,
  MistCard,
  Segments,
  Tag,
} from "@/components/founder/dash/ui";
import { useEvidenceWorkspace } from "@/components/founder/proof/useEvidence";
import { useRoadmapText } from "@/components/founder/roadmap/text";
import { getRoadmapView, type RoadmapView } from "@/lib/actions/roadmap";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useCurrentUserQuery, useFounderState } from "@/lib/queries";
import { useTranslatedBrief } from "@/lib/use-translation";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  // Set by a deep link to ONE consultation's ideas (the "ideas ready" email or
  // History → Review). It pins the view to that consultation; without it the
  // dashboard is always the newest consultation.
  validateSearch: z.object({ consultation: z.string().uuid().optional() }),
  component: Today,
  head: () => ({
    meta: [
      { title: "Today | Solventia" },
      {
        name: "description",
        content: "Your next step: today's mission, or the direction to explore next.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/**
 * Today — "What do I do now?" One headline area that follows the founder's state, and nothing
 * competing with it:
 *   no consultation            → the invitation
 *   directions ready           → the recommended direction (screen 2)
 *   direction chosen           → build the roadmap
 *   roadmap active             → today's mission (screen 1)
 *   week's missions all done   → "Week N done."
 */
function Today() {
  const { t } = useLocale();
  const founder = useFounderState();

  if (founder.isPending) return <DashSkeleton label={t("shell.skeleton.loading")} />;
  if (founder.isError || !founder.data) {
    return <DashError onRetry={() => void founder.refetch()} retrying={founder.isFetching} />;
  }
  const { direction } = founder.data;
  const stage = direction.stage;

  return (
    <div className="flex flex-col gap-6" data-testid="command-center" data-stage={stage}>
      {!direction.isLatestConsultation && <EarlierConsultationBanner />}
      {stage === "ideas_ready" && direction.flagshipId ? (
        <DirectionsReady flagshipId={direction.flagshipId} />
      ) : (stage === "direction_selected" ||
          stage === "roadmap_building" ||
          stage === "roadmap_failed") &&
        direction.selectedId ? (
        <DirectionChosen
          opportunityId={direction.selectedId}
          stage={stage}
          hasArchivedRoadmap={direction.hasArchivedRoadmap}
          readOnly={!direction.isLatestConsultation}
        />
      ) : (stage === "roadmap_active" || stage === "roadmap_completed") &&
        direction.roadmap &&
        direction.selectedId ? (
        <RoadmapToday
          roadmapId={direction.roadmap.id}
          opportunityId={direction.selectedId}
          completed={stage === "roadmap_completed"}
        />
      ) : (
        // No consultation yet — and, defensively, any stage whose ids resolved to nothing.
        <NoConsultation />
      )}
    </div>
  );
}

function useGreeting() {
  const { t } = useLocale();
  const user = useCurrentUserQuery();
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => setHour(new Date().getHours()), []);
  const firstName = user.data?.fullName?.trim().split(/\s+/)[0] ?? null;
  if (!firstName) return "";
  return t(
    hour === null
      ? "cc.greet.generic"
      : hour < 12
        ? "cc.greet.morning"
        : hour < 17
          ? "cc.greet.afternoon"
          : "cc.greet.evening",
    { name: firstName },
  );
}

function EarlierConsultationBanner() {
  const { t } = useLocale();
  return (
    <div
      role="status"
      data-testid="earlier-consultation-banner"
      className="flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-sol-champagne bg-sol-champagne-soft px-[clamp(20px,2.6vw,32px)] py-5"
    >
      <p className="text-[19px] font-medium text-sol-ink">{t("cc.earlier.body")}</p>
      <div className="flex flex-wrap gap-3">
        <ActionLink to="/dashboard" search={{}} tone="secondary" size="md" arrow={false}>
          {t("cc.earlier.back")}
        </ActionLink>
        <ActionLink to="/dashboard/history" tone="secondary" size="md" arrow={false}>
          {t("cc.earlier.history")}
        </ActionLink>
      </div>
    </div>
  );
}

function NoConsultation() {
  const { t } = useLocale();
  const greeting = useGreeting();
  return (
    <DashPage data-testid="no-consultation">
      {greeting && <p className="dash-lead">{greeting}</p>}
      <section className="flex flex-col items-start gap-7 pb-4 pt-[clamp(8px,1.4vw,20px)]">
        <h1 className="dash-headline max-w-[15em]">{t("v2.today.none.title")}</h1>
        <p className="dash-lead max-w-[32em]">{t("v2.today.none.lead")}</p>
        <ActionLink to="/consultation">{t("v2.today.none.cta")}</ActionLink>
      </section>
    </DashPage>
  );
}

/** Screen 2 — directions are ready, none chosen yet. */
function DirectionsReady({ flagshipId }: { flagshipId: string }) {
  const { t } = useLocale();
  const greeting = useGreeting();
  const founder = useFounderState();
  const { briefs, direction } = founder.data!;
  const raw = briefs[flagshipId];
  const brief = useTranslatedBrief(raw) ?? raw;
  if (!brief) return <NoConsultation />;
  const count = direction.viewedIds.length;
  const cards = [
    { key: "who", label: t("v2.card.who"), value: brief.customer },
    { key: "problem", label: t("v2.card.problem"), value: brief.problem },
    { key: "what", label: t("v2.card.what"), value: brief.product },
  ].filter((c): c is { key: string; label: string; value: string } => Boolean(c.value));

  return (
    <DashPage>
      <p className="dash-lead" data-testid="greeting">
        {greeting && <>{greeting} </>}
        <span className="font-medium text-sol-ink">{t("v2.today.ready.found", { n: count })}</span>
      </p>
      <section
        aria-labelledby="direction-title"
        data-testid="flagship-card"
        className="flex flex-wrap items-end gap-10 pb-[clamp(16px,2.4vw,32px)] pt-[clamp(8px,1.4vw,20px)]"
      >
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
          <div className="flex flex-wrap items-center gap-2.5">
            <Tag tone="ink">{t("v2.today.ready.recommended")}</Tag>
            <Tag>{t(`fit2.label.${brief.fit}` as const)}</Tag>
          </div>
          <h1 id="direction-title" className="dash-headline">
            {brief.title}
          </h1>
          {brief.oneLiner && <p className="dash-lead max-w-[32em]">{brief.oneLiner}</p>}
          <div className="flex flex-wrap items-center gap-3.5">
            <ActionLink
              to="/dashboard/opportunities/$id"
              params={{ id: brief.id }}
              data-testid="flagship-explore"
            >
              {t("v2.today.ready.explore")}
            </ActionLink>
            {count > 1 && (
              <ActionLink
                to="/dashboard/opportunities"
                tone="secondary"
                arrow={false}
                data-testid="explore-more"
              >
                {t("v2.today.ready.compare", { n: count })}
              </ActionLink>
            )}
          </div>
        </div>
        {raw.fitFactors && <FitSummaryCard factors={raw.fitFactors} className="flex-[1_1_340px]" />}
      </section>
      {cards.length > 0 && (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
          {cards.map((c) => (
            <MistCard key={c.key} className="gap-3.5">
              <Label>{c.label}</Label>
              <p className="dash-statement !text-[clamp(20px,1.8vw,26px)]">{c.value}</p>
            </MistCard>
          ))}
        </div>
      )}
      <NextSteps active={1} />
    </DashPage>
  );
}

/** A direction is chosen; the roadmap is not built yet (or is building, or failed). */
function DirectionChosen({
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
  const raw = founder.data!.briefs[opportunityId];
  const brief = useTranslatedBrief(raw) ?? raw;
  if (!brief) return <NoConsultation />;
  const building = stage === "roadmap_building";
  const failed = stage === "roadmap_failed";

  return (
    <DashPage>
      <section
        aria-labelledby="direction-title"
        className="flex flex-col items-start gap-7 pb-2 pt-[clamp(8px,1.4vw,20px)]"
      >
        <Tag tone="ink">{t("v2.today.chosen.tag")}</Tag>
        <h1
          id="direction-title"
          className="dash-headline max-w-[16em]"
          data-testid="surface-direction"
        >
          {brief.title}
        </h1>
        {brief.oneLiner && <p className="dash-lead max-w-[32em]">{brief.oneLiner}</p>}
        {failed && (
          <p
            role="alert"
            className="max-w-[40em] rounded-[24px] border border-sol-warning/50 bg-sol-warning-soft px-5 py-4 text-[18px] text-sol-ink"
          >
            {t("cc.b.failed")}
          </p>
        )}
        {building && (
          <p role="status" className="dash-body flex items-center gap-3 text-sol-ink">
            <Loader2 className="size-5 animate-spin text-sol-cobalt" aria-hidden="true" />
            {t("cc.b.building")}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3.5">
          {!readOnly && (
            <ActionButton
              data-testid="build-roadmap"
              onClick={() =>
                navigate({ to: "/dashboard/roadmap/building", search: { opportunityId } })
              }
            >
              {building
                ? t("v2.today.chosen.progress")
                : failed
                  ? t("v2.today.chosen.retry")
                  : hasArchivedRoadmap
                    ? t("cc.b.resumeCta")
                    : t("v2.today.chosen.build")}
            </ActionButton>
          )}
          <ActionLink
            to="/dashboard/opportunities/$id"
            params={{ id: opportunityId }}
            tone="secondary"
            arrow={false}
          >
            {t("v2.today.chosen.review")}
          </ActionLink>
        </div>
      </section>
      <NextSteps active={2} />
    </DashPage>
  );
}

/** Screen 1 — the roadmap is active: today's mission; or the week's missions are all done. */
function RoadmapToday({
  roadmapId,
  opportunityId,
  completed,
}: {
  roadmapId: string;
  opportunityId: string;
  completed: boolean;
}) {
  const { t } = useLocale();
  const greeting = useGreeting();
  const roadmap = useQuery({
    queryKey: qk.roadmap(roadmapId),
    queryFn: () => getRoadmapView({ data: { roadmapId } }),
    staleTime: 15_000,
  });
  const view: RoadmapView | null | undefined = roadmap.data;
  const week = view?.weeks.find((w) => w.id === view.currentWeekId) ?? null;
  const text = useRoadmapText(view, week);

  if (roadmap.isPending) return <DashSkeleton label={t("shell.skeleton.loading")} />;
  if (roadmap.isError || !view) {
    return <DashError onRetry={() => void roadmap.refetch()} retrying={roadmap.isFetching} />;
  }

  const phase = view.phases.find((p) => p.id === view.currentPhaseId) ?? null;
  const weekLine = week
    ? [
        t("v2.today.weekOf", { x: week.number, y: view.totals.weeks }),
        phase ? text.phaseTitle(phase.id, phase.title) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const missions = week?.missions ?? [];
  const mission =
    missions.find((m) => m.state === "in_progress") ??
    missions.find((m) => m.state === "not_started" && m.required) ??
    missions.find((m) => m.state === "not_started") ??
    null;
  const allDone = Boolean(
    week && (week.state === "ready_to_close" || (!mission && missions.length)),
  );

  return (
    <DashPage>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="dash-lead text-sol-muted" data-testid="greeting">
          {greeting && <>{greeting} </>}
          {!completed && mission && week?.state !== "generating_next" && (
            <span className="font-medium text-sol-ink">{t("v2.today.one")}</span>
          )}
        </p>
        {weekLine && !completed && <p className="dash-meta">{weekLine}</p>}
      </div>

      {completed ? (
        <section className="flex flex-col items-start gap-7 pb-4 pt-[clamp(8px,1.4vw,20px)]">
          <h1 className="dash-headline max-w-[15em]">{t("cc.c.completedTitle")}</h1>
          <p className="dash-lead max-w-[32em]">{t("cc.c.completedBody")}</p>
          <ActionLink to="/dashboard/proof" search={{ opportunity: opportunityId }}>
            {t("v2.today.done.proof")}
          </ActionLink>
        </section>
      ) : week?.state === "generating_next" ? (
        <section className="flex flex-col items-start gap-6 pb-4 pt-[clamp(8px,1.4vw,20px)]">
          <h1 className="dash-headline max-w-[15em]">
            {t("v2.today.preparing", { n: week.number })}
          </h1>
          <p role="status" className="dash-lead flex max-w-[32em] items-center gap-3">
            <Loader2 className="size-6 shrink-0 animate-spin text-sol-cobalt" aria-hidden="true" />
            {t("rm.gen.preparingBody")}
          </p>
        </section>
      ) : allDone && week ? (
        <section
          className="flex flex-col items-start gap-7 pb-4 pt-[clamp(8px,1.4vw,20px)]"
          data-testid="week-wrap"
        >
          <h1 className="dash-headline">{t("v2.today.done.title", { n: week.number })}</h1>
          <p className="dash-lead max-w-[32em]">{t("v2.today.done.lead")}</p>
          <div className="flex flex-wrap items-center gap-3.5">
            <ActionLink to="/dashboard/proof" search={{ opportunity: opportunityId }}>
              {t("v2.today.done.proof")}
            </ActionLink>
            <ActionLink
              to="/dashboard/roadmap"
              search={{}}
              tone="secondary"
              arrow={false}
              data-testid="review-from-dashboard"
            >
              {t("v2.today.done.close")}
            </ActionLink>
          </div>
        </section>
      ) : week && mission ? (
        <MissionHero
          weekId={week.id}
          weekNumber={week.number}
          missions={missions}
          missionId={mission.id}
          text={text}
        />
      ) : null}

      <JourneyBlock view={view} text={text} heading showOpenLink />

      {week && !completed && (
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
          {text.detail.successThreshold(week.successThreshold) && (
            <MistCard data-testid="success-threshold">
              <Label>{t("v2.today.succeeds")}</Label>
              <p className="dash-statement !text-[clamp(22px,2.1vw,30px)] !leading-[1.25]">
                {text.detail.successThreshold(week.successThreshold)}
              </p>
            </MistCard>
          )}
          <ProofSoFar opportunityId={opportunityId} />
        </div>
      )}
    </DashPage>
  );
}

function MissionHero({
  weekId,
  weekNumber,
  missions,
  missionId,
  text,
}: {
  weekId: string;
  weekNumber: number;
  missions: RoadmapView["weeks"][number]["missions"];
  missionId: string;
  text: ReturnType<typeof useRoadmapText>;
}) {
  const { t } = useLocale();
  const index = missions.findIndex((m) => m.id === missionId);
  const mission = missions[index];
  const tx = text.detail.mission(mission.id);
  const title = tx?.title ?? mission.title;
  const why = tx?.why ?? mission.why;
  const time = tx?.timeEstimate ?? mission.timeEstimate;
  const done = missions.filter((m) => m.state === "completed").length;
  void weekId;
  return (
    <section
      aria-labelledby="mission-title"
      data-testid="todays-move"
      className="flex flex-wrap items-end gap-10 pb-[clamp(16px,2.4vw,32px)] pt-[clamp(8px,1.4vw,20px)]"
    >
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
        <div className="flex flex-wrap items-center gap-2.5">
          <Tag tone="ink">{t("v2.today.missionTag")}</Tag>
          {time && <Tag>{time}</Tag>}
        </div>
        <h1 id="mission-title" className="dash-mission" data-testid="current-mission">
          {title}
        </h1>
        {why && <p className="dash-lead max-w-[32em]">{why}</p>}
        <div className="flex flex-wrap items-center gap-3.5">
          <ActionLink
            to="/dashboard/roadmap"
            search={{ week: weekNumber, mission: mission.id }}
            data-testid="start-mission"
          >
            {mission.state === "in_progress" ? t("v2.today.continue") : t("v2.today.start")}
          </ActionLink>
          <ActionLink to="/dashboard/roadmap" search={{}} tone="secondary" arrow={false}>
            {t("v2.today.seeWeek", { n: missions.length })}
          </ActionLink>
        </div>
      </div>
      <div className="flex flex-[1_1_220px] flex-col items-start gap-3.5">
        <div
          aria-hidden="true"
          className="font-display text-[clamp(88px,12vw,176px)] font-medium leading-[0.82] tracking-[-0.05em] text-sol-cobalt"
        >
          {String(index + 1).padStart(2, "0")}
        </div>
        <p className="text-[18px] font-medium text-sol-secondary">
          {t("v2.today.missionOf", { x: index + 1, y: missions.length })}
        </p>
        <Segments total={missions.length} done={done} current={index} className="max-w-[220px]" />
      </div>
    </section>
  );
}

function ProofSoFar({ opportunityId }: { opportunityId: string }) {
  const { t } = useLocale();
  const { assumptions, overview } = useEvidenceWorkspace(opportunityId);
  const checked = assumptions.filter((a) => a.status !== "not_tested").length;
  return (
    <MistCard
      className="flex-row flex-wrap items-end justify-between gap-6"
      data-testid="surface-evidence"
    >
      <div className="flex flex-col gap-4">
        <Label>{t("v2.today.proof.title")}</Label>
        {overview.isPending ? (
          <span className="h-16 w-40 animate-pulse rounded-2xl bg-sol-ivory-depth" />
        ) : assumptions.length > 0 ? (
          <div className="flex items-baseline gap-3.5">
            <span className="whitespace-nowrap font-display text-[clamp(56px,5.6vw,80px)] font-medium leading-[0.9] tracking-[-0.04em] text-sol-ink">
              {checked}
              <span className="text-sol-muted"> / {assumptions.length}</span>
            </span>
            <span className="text-[19px] text-sol-secondary">{t("v2.today.proof.checked")}</span>
          </div>
        ) : (
          <p className="dash-body">{t("v2.today.proof.empty")}</p>
        )}
      </div>
      <Link
        to="/dashboard/proof"
        search={{ opportunity: opportunityId }}
        data-testid="open-evidence"
        className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full border border-sol-ink/30 px-6 text-[18px] font-medium text-sol-ink transition-colors hover:border-sol-ink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt"
      >
        {t("v2.today.proof.open")}
        <Arrow />
      </Link>
    </MistCard>
  );
}
