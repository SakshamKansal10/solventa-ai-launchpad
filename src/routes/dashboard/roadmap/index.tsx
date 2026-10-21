import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { PlanTab } from "@/components/founder/roadmap/PhaseViews";
import { RoadmapJourney } from "@/components/founder/roadmap/journey/RoadmapJourney";
import { ProgressTab } from "@/components/founder/roadmap/ProgressTab";
import { useRoadmapText } from "@/components/founder/roadmap/text";
import { WeekTab } from "@/components/founder/roadmap/WeekTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Button,
  EmptyState,
  ErrorPanel,
  Eyebrow,
  LinkButton,
  PageSkeleton,
  Pill,
} from "@/components/founder/ui";
import { getRoadmapView, type CloseWeekResult } from "@/lib/actions/roadmap";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useFounderState } from "@/lib/queries";

const TABS = ["week", "plan", "progress"] as const;
type Tab = (typeof TABS)[number];

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

  if (query.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (query.isError || !view) {
    return <ErrorPanel onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  }

  const tab: Tab = search.tab ?? "week";
  const currentPhase = view.phases.find((p) => p.id === view.currentPhaseId) ?? null;
  const currentPhaseNumber = currentPhase
    ? view.phases.findIndex((p) => p.id === currentPhase.id) + 1
    : null;
  const selectedPhase = view.phases.find((p) => p.id === search.phase) ?? null;
  const setSearch = (
    patch: Partial<{ tab: Tab; week: number | undefined; phase: string | undefined }>,
  ) => navigate({ to: "/dashboard/roadmap", search: { ...search, ...patch }, replace: true });
  const openWeek = (n: number) =>
    navigate({ to: "/dashboard/roadmap", search: { tab: "week", week: n } });
  const nextWeekNumber = shownWeek
    ? (view.weeks.find((w) => w.number === shownWeek.number + 1)?.number ?? null)
    : null;

  const onWeekChanged = (result: CloseWeekResult) => {
    if (result.result === "roadmap_completed") {
      toast.success(t("rm.completed.toast"));
      return;
    }
    openWeek(result.nextWeekNumber);
  };

  return (
    <div
      className="flex flex-col gap-8"
      data-testid="roadmap-page"
      data-roadmap-status={view.roadmap.status}
    >
      <RoadmapJourney
        view={view}
        text={text}
        selectedPhaseId={selectedPhase?.id ?? null}
        northStar={text.northStar(view.roadmap.northStar)}
        onSelectPhase={(id, week) =>
          setSearch({ phase: id ?? undefined, week: id ? week : undefined, tab: "week" })
        }
        onOpenWeek={openWeek}
      />

      <div aria-hidden="true" className="-my-3 flex flex-col items-center">
        <span className="h-6 w-px bg-gradient-to-b from-sol-cobalt/40 to-transparent" />
      </div>

      {view.roadmap.status === "completed" && (
        <div
          role="status"
          className="rounded-2xl border border-sol-champagne/60 bg-sol-champagne-soft px-5 py-4 text-[1rem] text-sol-ink"
        >
          <Pill tone="champagne" className="mr-2">
            {t("rm.state.completed")}
          </Pill>
          {t("rm.completed.body")}
        </div>
      )}

      {selectedPhase?.state === "future" ? (
        <EmptyState
          title={t("rm.state.locked")}
          body={t("rm.phase.lockedBody", {
            n: view.phases.findIndex((p) => p.id === selectedPhase.id),
          })}
        />
      ) : (
        <Tabs value={tab} onValueChange={(next) => setSearch({ tab: next as Tab })}>
          <TabsList
            aria-label={t("rm.tabs.aria")}
            className="h-auto w-full justify-start gap-1 rounded-full border border-sol-border bg-sol-surface/80 p-1 shadow-sm backdrop-blur-sm sm:w-fit"
          >
            {TABS.map((key) => (
              <TabsTrigger
                key={key}
                value={key}
                data-testid={`tab-${key}`}
                className="min-h-10 flex-1 rounded-full px-2 text-[0.875rem] font-medium text-sol-secondary transition-all duration-300 hover:text-sol-ink data-[state=active]:bg-gradient-to-b data-[state=active]:from-sol-cobalt-soft data-[state=active]:to-[#eaf0fd] data-[state=active]:text-sol-cobalt-deep data-[state=active]:shadow-[inset_0_0_0_1px_rgba(49,94,219,0.25)] sm:flex-none sm:px-6"
              >
                {t(`rm.tab.${key}` as const)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="week" className="mt-10">
            {shownWeek ? (
              <WeekTab
                key={shownWeek.id}
                view={view}
                week={shownWeek}
                text={text}
                isCurrent={shownWeek.id === view.currentWeekId}
                nextWeekNumber={nextWeekNumber}
                onWeekChanged={onWeekChanged}
              />
            ) : (
              <EmptyState title={t("rm.empty.noWeek")} />
            )}
          </TabsContent>
          <TabsContent value="plan" className="mt-8">
            <PlanTab
              view={view}
              text={text}
              openPhaseId={selectedPhase?.id ?? null}
              onOpenWeek={openWeek}
            />
          </TabsContent>
          <TabsContent value="progress" className="mt-8">
            <ProgressTab view={view} text={text} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
