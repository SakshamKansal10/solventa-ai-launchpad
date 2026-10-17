import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { useAskSol } from "@/components/founder/DashboardShell";
import { useRoadmapText } from "@/components/founder/roadmap/text";
import { Button, EmptyState, ErrorPanel, LinkButton, PageSkeleton } from "@/components/founder/ui";
import { useDirection } from "@/components/os/direction";
import { RoutePath } from "@/components/os/graphics";
import {
  ActionArrow,
  FlashCard,
  OsDisplay,
  OsEyebrow,
  primaryActionClass,
  textActionClass,
} from "@/components/os/os";
import { routeStages } from "@/components/os/roadmap";
import { RoadmapWeek, RouteAhead } from "@/components/os/RoadmapWeek";
import type { WeekDTO } from "@/lib/roadmap/view";
import { getRoadmapView, type CloseWeekResult } from "@/lib/actions/roadmap";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useFounderState } from "@/lib/queries";
import { useTranslatedTitle } from "@/lib/use-translation";

/** Older links carried a tab (week · plan · progress); the roadmap is one continuous page now. */
const TABS = ["week", "plan", "progress"] as const;

export const Route = createFileRoute("/dashboard/roadmap/")({
  validateSearch: z.object({
    tab: z.enum(TABS).optional(),
    /** Global week number (1-based) to show. Defaults to the active week. */
    week: z.number().int().min(1).optional(),
    mission: z.string().uuid().optional(),
    phase: z.string().uuid().optional(),
  }),
  component: RoadmapPage,
  head: () => ({
    meta: [{ title: "Roadmap — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

function RoadmapPage() {
  const { t } = useLocale();
  const founder = useFounderState();
  const roadmapId = founder.data?.direction.roadmap?.id ?? null;
  const stage = founder.data?.direction.stage;

  if (founder.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (founder.isError || !founder.data) {
    return <ErrorPanel onRetry={() => void founder.refetch()} retrying={founder.isFetching} />;
  }
  const { direction } = founder.data;

  if (
    !roadmapId ||
    !direction.selectedId ||
    stage === "roadmap_building" ||
    stage === "roadmap_failed"
  ) {
    return <NoRoadmapYet stage={stage ?? "no_consultation"} opportunityId={direction.selectedId} />;
  }
  return <RoadmapWorkspace roadmapId={roadmapId} opportunityId={direction.selectedId} />;
}

function NoRoadmapYet({ stage, opportunityId }: { stage: string; opportunityId: string | null }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const building = stage === "roadmap_building";
  const failed = stage === "roadmap_failed";
  if (stage === "no_consultation") {
    return (
      <EmptyState
        title={t("cc.none.cardTitle")}
        body={t("cc.none.cardBody")}
        action={
          <LinkButton to="/consultation" variant="primary" size="lg">
            {t("nav.findMyBusinessIdea")}
          </LinkButton>
        }
      />
    );
  }
  if (!opportunityId) {
    return (
      <EmptyState
        title={t("rm.empty.chooseTitle")}
        body={t("rm.empty.chooseBody")}
        action={
          <LinkButton to="/dashboard" variant="primary" size="lg">
            {t("shell.nav.commandCenter")}
          </LinkButton>
        }
      />
    );
  }
  return (
    <EmptyState
      title={
        building
          ? t("rm.empty.buildingTitle")
          : failed
            ? t("rm.empty.failedTitle")
            : t("cc.b.buildTitle")
      }
      body={building ? t("cc.b.building") : failed ? t("cc.b.failed") : t("cc.b.buildBody")}
      action={
        <Button
          size="lg"
          onClick={() => navigate({ to: "/dashboard/roadmap/building", search: { opportunityId } })}
          data-testid="build-roadmap"
        >
          {building ? t("cc.b.viewProgress") : failed ? t("common.retry") : t("cc.b.buildCta")}
        </Button>
      }
    />
  );
}

function RoadmapWorkspace({
  roadmapId,
  opportunityId,
}: {
  roadmapId: string;
  opportunityId: string;
}) {
  const { t } = useLocale();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const founder = useFounderState();
  const { direction } = useDirection(founder.data?.briefs[opportunityId]);
  const [focus, setFocus] = useState<{ id: string; nonce: number; start: boolean } | null>(
    search.mission ? { id: search.mission, nonce: 0, start: false } : null,
  );

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
  const shownWeek =
    (search.week ? view?.weeks.find((w) => w.number === search.week) : null) ??
    currentWeek ??
    view?.weeks.filter((w) => w.state === "completed").at(-1) ??
    null;
  const text = useRoadmapText(view, shownWeek);
  const opportunityTitle = useTranslatedTitle(opportunityId, view?.roadmap.opportunityTitle);

  if (query.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (query.isError || !view) {
    return <ErrorPanel onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  }

  const openWeek = (n: number | undefined) =>
    navigate({ to: "/dashboard/roadmap", search: { week: n }, resetScroll: false }).then(() =>
      document.getElementById("week-missions")?.scrollIntoView({ behavior: "smooth" }),
    );
  const nextWeekNumber = shownWeek
    ? (view.weeks.find((w) => w.number === shownWeek.number + 1)?.number ?? null)
    : null;

  const onWeekChanged = (result: CloseWeekResult) => {
    if (result.result === "roadmap_completed") {
      toast.success(t("rm.completed.toast"));
      return;
    }
    void openWeek(result.nextWeekNumber);
  };

  return (
    <div
      className="flex flex-col gap-14"
      data-testid="roadmap-page"
      data-roadmap-status={view.roadmap.status}
    >
      {/* The opening: where this is going, and the whole route on one line. */}
      <header className="flex flex-col gap-10">
        <div className="flex flex-col gap-5">
          <OsEyebrow tone="champagne">{opportunityTitle}</OsEyebrow>
          <OsDisplay>
            {t("os.rm.title.a")}
            <span className="block text-[#454B59]">{t("os.rm.title.b")}</span>
          </OsDisplay>
          {view.roadmap.northStar && (
            <p
              className="max-w-[62ch] text-[1.125rem] leading-relaxed text-[#2A2F3B]"
              data-testid="north-star"
            >
              <span className="font-semibold text-[#171A27]">{t("rm.northStar")}: </span>
              {text.northStar(view.roadmap.northStar)}
            </p>
          )}
        </div>
        <RoutePath
          stages={routeStages(view, t)}
          ariaLabel={t("os.rm.route")}
          testId="roadmap-route"
          className="max-w-[980px]"
        />
      </header>

      {view.roadmap.status === "completed" && (
        <div
          role="status"
          className="rounded-2xl border border-[#B8924F]/60 bg-[#FBF8F2] px-5 py-4 text-[1.0625rem] text-[#171A27]"
        >
          <span className="mr-2 font-semibold uppercase tracking-[0.1em] text-[#7A5B2B]">
            {t("rm.state.completed")}
          </span>
          {t("rm.completed.body")}
        </div>
      )}

      {/* NOW: this week's mission, and the help that makes it doable. */}
      {currentWeek && view.roadmap.status !== "completed" && (
        <CurrentMission
          week={currentWeek}
          text={text}
          customer={direction?.detail?.customerHeadline ?? null}
          findFirst={direction?.detail?.firstExperiment ?? null}
          onFocus={(missionId) => {
            const go = () => setFocus({ id: missionId, nonce: Date.now(), start: true });
            if (shownWeek?.id !== currentWeek.id) void openWeek(undefined).then(go);
            else go();
          }}
        />
      )}

      {/* The missions themselves — this week, or a finished week read back. */}
      {shownWeek ? (
        <RoadmapWeek
          key={shownWeek.id}
          view={view}
          week={shownWeek}
          text={text}
          opportunityId={opportunityId}
          isCurrent={shownWeek.id === view.currentWeekId}
          nextWeekNumber={nextWeekNumber}
          focus={focus}
          onWeekChanged={onWeekChanged}
          onBackToNow={() => void openWeek(undefined)}
        />
      ) : (
        <p className="text-[1.125rem] text-[#2A2F3B]">{t("rm.empty.noWeek")}</p>
      )}

      {/* LATER: next week in a line, then the whole plan — disclosed only when asked. */}
      <RouteAhead view={view} text={text} currentWeek={currentWeek} onOpenWeek={openWeek} />
    </div>
  );
}

/**
 * THIS WEEK — the one mission that matters now, in plain words, what done looks like, and one
 * action that brings it forward; beside it four flash cards of help (what to say, how to find
 * people, what good looks like, if nobody responds) — Sol writes the words when asked.
 */
function CurrentMission({
  week,
  text,
  customer,
  findFirst,
  onFocus,
}: {
  week: WeekDTO;
  text: ReturnType<typeof useRoadmapText>;
  /** Who pays, in the direction's own words (for "how to find people"). */
  customer: string | null;
  /** The direction's first experiment — where to find them first. */
  findFirst: string | null;
  onFocus: (missionId: string) => void;
}) {
  const { t } = useLocale();
  const ask = useAskSol();
  const missions = week.missions;
  const first =
    missions.find((m) => m.state === "in_progress") ??
    missions.find((m) => m.state === "not_started") ??
    missions[0] ??
    null;
  const titleOf = (m: { id: string; title: string }) => text.detail.mission(m.id)?.title ?? m.title;
  const statement = text.detail.weekMission(week.mission) ?? text.weekTitle(week.id, week.title);
  const firstTitle = first ? titleOf(first) : statement;
  const doneWhen = first ? (text.detail.mission(first.id)?.doneWhen ?? first.doneWhen) : "";
  const success = text.detail.successThreshold(week.successThreshold);
  const mistakes = text.detail.mistakes(week.mistakes);
  return (
    <section
      className="grid gap-10 border-t border-[#171A27]/10 pt-12 @4xl:grid-cols-[1.1fr_1fr] @4xl:gap-14"
      data-testid="current-mission-hero"
    >
      <div className="flex flex-col gap-6">
        <OsEyebrow tone="champagne" data-testid="current-week-number">
          {t("os.rm.thisWeek")} · {t("os.rm.week", { n: String(week.number).padStart(2, "0") })}
        </OsEyebrow>
        <h2 className="max-w-[22ch] font-os text-[clamp(1.85rem,1.3rem+1.8vw,3rem)] font-medium uppercase leading-[1.02] tracking-[-0.03em] text-[#171A27]">
          {statement}
        </h2>
        {success && (
          <div className="flex max-w-[52ch] flex-col gap-1.5" data-testid="success-threshold">
            <OsEyebrow>{t("os.rm.doneWhen")}</OsEyebrow>
            <p className="text-[1.1875rem] font-semibold leading-snug text-[#171A27]">{success}</p>
          </div>
        )}
        {first && week.state !== "generating_next" && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => onFocus(first.id)}
              className={primaryActionClass}
              data-testid="start-week-mission"
            >
              {first.state === "in_progress" ? t("cc.c.continueMission") : t("rm.mission.start")}
              <ActionArrow />
            </button>
            <p className="mt-3 text-[0.9375rem] font-medium text-[#454B59]">{firstTitle}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3" data-testid="mission-help">
        <FlashCard
          label={t("os.rm.help.say")}
          headline={t("os.rm.help.sayHeadline")}
          points={[]}
          action={
            <button
              type="button"
              className={textActionClass}
              onClick={() => ask.open(t("os.rm.help.askSay", { mission: firstTitle }))}
            >
              {t("os.rm.help.writeIt")}
              <ActionArrow />
            </button>
          }
        />
        {(customer || findFirst) && (
          <FlashCard
            label={t("os.rm.help.find")}
            headline={customer ?? firstTitle}
            points={findFirst ? [findFirst] : []}
            action={
              <button
                type="button"
                className={textActionClass}
                onClick={() =>
                  ask.open(
                    t("os.rm.help.findAsk", { mission: firstTitle, customer: customer ?? "" }),
                  )
                }
              >
                {t("os.rm.help.findIt")}
                <ActionArrow />
              </button>
            }
          />
        )}
        {doneWhen && <FlashCard label={t("os.rm.help.good")} headline={doneWhen} points={[]} />}
        <FlashCard
          label={t("os.rm.help.nobody")}
          headline={t("os.rm.help.nobodyHeadline")}
          points={mistakes}
          action={
            <button
              type="button"
              className={textActionClass}
              onClick={() => ask.open(t("os.rm.help.askNobody", { mission: firstTitle }))}
            >
              {t("os.rm.help.askHow")}
              <ActionArrow />
            </button>
          }
        />
      </div>
    </section>
  );
}
