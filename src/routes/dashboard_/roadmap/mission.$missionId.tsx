import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { BrandLockup } from "@/components/brand/Brand";
import {
  AskSolButton,
  AskSolProvider,
  DASH_FRAME,
  useAskSol,
} from "@/components/founder/DashboardShell";
import { nextMissionId } from "@/components/founder/dash/missions";
import {
  MissionWorkspace,
  useGateReason,
  useMissionWorkspace,
} from "@/components/founder/dash/MissionWorkspace";
import { StatusShape } from "@/components/founder/dash/StatusShape";
import {
  ActionButton,
  ActionLink,
  DashError,
  DashPage,
  DashSkeleton,
  Label,
  Tag,
} from "@/components/founder/dash/ui";
import { EvidenceDialog } from "@/components/founder/proof/EvidenceDialog";
import { useEvidenceWorkspace } from "@/components/founder/proof/useEvidence";
import { useRoadmapText } from "@/components/founder/roadmap/text";
import { reportStuck } from "@/lib/actions/missions";
import { getRoadmapView, setMissionState } from "@/lib/actions/roadmap";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useFounderState, useInvalidateFounder } from "@/lib/queries";
import type { MissionState } from "@/lib/roadmap/state";
import { applyMissionState, type RoadmapView } from "@/lib/roadmap/view";
import { requireAuthLoader } from "@/lib/route-guards";
import { cn } from "@/lib/utils";

/** A full page per mission (screens 6 and 7). Chrome-free like the building screen (the
 * trailing underscore keeps it out of the dashboard layout): the lockup, a way back to the
 * week, Ask Sol — no main navigation. */
export const Route = createFileRoute("/dashboard_/roadmap/mission/$missionId")({
  beforeLoad: requireAuthLoader,
  validateSearch: z.object({
    /** Set by a Start button: the mission moves to "in progress" when the page opens. */
    start: z.boolean().optional(),
  }),
  component: MissionRoute,
  head: () => ({
    meta: [
      { title: "Mission | Solventia" },
      {
        name: "description",
        content: "One mission: why it matters, the steps, and when it is done.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function MissionRoute() {
  return (
    <AskSolProvider>
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
        data-testid="scroll-area"
      >
        <MissionPage />
      </div>
    </AskSolProvider>
  );
}

function MissionPage() {
  const { missionId } = Route.useParams();
  const search = Route.useSearch();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFounder();
  const ask = useAskSol();
  const founder = useFounderState();
  const roadmapId = founder.data?.direction.roadmap?.id ?? null;
  const roadmapKey = qk.roadmap(roadmapId);
  const query = useQuery({
    queryKey: roadmapKey,
    queryFn: () => getRoadmapView({ data: { roadmapId: roadmapId! } }),
    enabled: Boolean(roadmapId),
    staleTime: 10_000,
  });
  const view = query.data ?? null;
  const week = view?.weeks.find((w) => w.missions.some((m) => m.id === missionId)) ?? null;
  const text = useRoadmapText(view, week);
  const opportunityId = view?.roadmap.opportunityId ?? null;
  const evidence = useEvidenceWorkspace(opportunityId);
  const workspace = useMissionWorkspace(missionId);
  const [showFallback, setShowFallback] = useState(false);
  const [stuckNote, setStuckNote] = useState<string | null>(null);
  const stuckMutation = useMutation({
    mutationFn: (reason: "cant" | "time" | "wrong") =>
      reportStuck({ data: { taskId: missionId, reason } }),
    onError: (err) => console.error("[mission] stuck report failed:", err),
  });
  const dayOf = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "long",
    });
  const gateReason = useGateReason()(workspace.data);
  const [recording, setRecording] = useState(false);

  const setState = useMutation({
    mutationFn: (v: { taskId: string; state: MissionState }) =>
      setMissionState({ data: { taskId: v.taskId, state: v.state } }),
    // Optimistic: the page responds instantly; the server confirms or we roll back.
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: roadmapKey });
      const previous = queryClient.getQueryData<RoadmapView | null>(roadmapKey);
      if (previous)
        queryClient.setQueryData(roadmapKey, applyMissionState(previous, v.taskId, v.state));
      return { previous };
    },
    onError: (err, _v, ctx) => {
      console.error("[mission] state update failed:", err);
      if (ctx?.previous) queryClient.setQueryData(roadmapKey, ctx.previous);
      toast.error(t("rm.mission.error"));
    },
    onSettled: () => {
      void invalidate();
    },
  });

  const mission = week?.missions.find((m) => m.id === missionId) ?? null;
  const isCurrent = Boolean(week && view && week.id === view.currentWeekId);
  const locked = !week || week.state === "completed" || !isCurrent;

  // A Start button brought the founder here: the mission is now in progress (once).
  const started = useRef(false);
  useEffect(() => {
    if (!search.start || !mission || started.current) return;
    started.current = true;
    if (mission.state === "not_started" && !locked)
      setState.mutate({ taskId: mission.id, state: "in_progress" });
    void navigate({
      to: "/dashboard/roadmap/mission/$missionId",
      params: { missionId },
      search: {},
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.start, mission?.id]);

  const header = (
    <header
      className={cn(
        DASH_FRAME,
        "flex flex-wrap items-center justify-between gap-4 pb-[clamp(20px,3vw,44px)] pt-5 sm:pt-[26px]",
      )}
    >
      <Link
        to="/dashboard"
        aria-label={t("nav.homeAria")}
        className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sol-cobalt"
      >
        <BrandLockup preset="compact" />
      </Link>
      <div className="flex flex-wrap items-center gap-2.5">
        {week && (
          <Link
            to="/dashboard/roadmap"
            search={isCurrent ? {} : { week: week.number }}
            data-testid="back-to-week"
            className="inline-flex min-h-[46px] items-center gap-2.5 rounded-full bg-sol-ivory px-5 text-[17px] font-medium text-sol-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            {t("v2.journey.week", { n: String(week.number).padStart(2, "0") })}
          </Link>
        )}
        <AskSolButton />
      </div>
    </header>
  );

  if (founder.isPending || (roadmapId && query.isPending))
    return (
      <>
        {header}
        <main className={DASH_FRAME}>
          <DashSkeleton label={t("shell.skeleton.loading")} />
        </main>
      </>
    );
  if (query.isError || founder.isError) {
    return (
      <>
        {header}
        <main className={DASH_FRAME}>
          <DashError onRetry={() => void query.refetch()} retrying={query.isFetching} />
        </main>
      </>
    );
  }
  if (!week || !mission) {
    return (
      <>
        {header}
        <main className={cn(DASH_FRAME, "flex max-w-[1040px] flex-col items-start gap-6")}>
          <h1 className="dash-headline">{t("v2.mission.missing")}</h1>
          <ActionLink to="/dashboard/roadmap">{t("v2.journey.open")}</ActionLink>
        </main>
      </>
    );
  }

  const tx = text.detail.mission(mission.id);
  const title = tx?.title ?? mission.title;
  const why = tx?.why ?? mission.why;
  const time = tx?.timeEstimate ?? mission.timeEstimate;
  const steps = tx?.steps && tx.steps.length > 0 ? tx.steps : mission.steps;
  const doneWhen = tx?.doneWhen ?? mission.doneWhen;
  const mistakes = text.detail.mistakes(week.mistakes);
  const index = week.missions.findIndex((m) => m.id === mission.id);
  const done = mission.state === "completed";
  const busy = setState.isPending;
  const nextId = done ? nextMissionId(week) : null;
  const assumptionTitle = mission.assumption
    ? (evidence.assumptions.find((a) => a.id === mission.assumption!.id)?.title ??
      mission.assumption.title)
    : null;
  const stuck = [
    { key: "cant" as const, label: t("v2.mission.stuck.cant") },
    { key: "time" as const, label: t("v2.mission.stuck.time") },
    { key: "wrong" as const, label: t("v2.mission.stuck.wrong") },
  ];

  return (
    <>
      {header}
      <main
        id="main"
        className={cn(DASH_FRAME, "pb-[calc(72px+env(safe-area-inset-bottom))]")}
        data-testid="mission-page"
        data-state={mission.state}
      >
        <DashPage className="mx-auto max-w-[1040px] sm:gap-8">
          <div className="flex flex-col gap-[22px]">
            <div className="flex flex-wrap items-center gap-2.5">
              <Tag tone="ink">{t("v2.mission.of", { x: index + 1, y: week.missions.length })}</Tag>
              {time && <Tag>{time}</Tag>}
              {!mission.required && <Tag>{t("common.optional")}</Tag>}
              {done && (
                <Tag tone="done">
                  <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                  {t("rm.mission.completed")}
                </Tag>
              )}
            </div>
            <h1 className="dash-headline" data-testid="mission-title">
              {title}
            </h1>
            {why && <p className="dash-lead max-w-[32em]">{why}</p>}
          </div>

          <MissionWorkspace taskId={mission.id} locked={locked} />

          {(steps.length > 0 || mistakes.length > 0) && (
            <section
              aria-labelledby="how-title"
              className="flex flex-col gap-1.5"
              data-testid="mission-details"
            >
              <h2 id="how-title" className="dash-label pb-2.5">
                {t("v2.mission.how")}
              </h2>
              <ol className="flex flex-col">
                {steps.map((s, i) => (
                  <li
                    key={s}
                    className="flex items-baseline gap-[18px] border-t border-sol-border py-[18px] last:border-b"
                  >
                    <span
                      aria-hidden="true"
                      className="w-[1.4em] shrink-0 font-display text-[24px] font-medium text-sol-muted"
                    >
                      {i + 1}
                    </span>
                    <span className="text-[clamp(20px,1.9vw,24px)] leading-[1.3] text-sol-ink">
                      {s}
                    </span>
                  </li>
                ))}
              </ol>
              {mistakes.length > 0 && (
                // The week's "avoid" list (moved here from the old right-hand rail).
                <ul
                  data-testid="week-avoid"
                  aria-label={t("rm.rail.avoid")}
                  className="flex flex-col"
                >
                  {mistakes.map((m) => (
                    <li
                      key={m}
                      className="flex items-baseline gap-[18px] border-b border-sol-border py-[18px] first:border-t"
                    >
                      <span
                        aria-hidden="true"
                        className="w-[1.4em] shrink-0 font-display text-[24px] font-medium dash-warn-text"
                      >
                        !
                      </span>
                      <span className="text-[clamp(20px,1.9vw,24px)] leading-[1.3] text-sol-ink">
                        <span className="sr-only">{t("rm.rail.avoid")}: </span>
                        {m}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {mission.assumption && (
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[32px] bg-sol-ivory px-[clamp(20px,2.6vw,32px)] py-5"
              data-testid="mission-assumption"
            >
              <Label as="p">{t("pf.mission.tests")}</Label>
              <Link
                to="/dashboard/proof"
                search={{ opportunity: opportunityId!, assumption: mission.assumption.id }}
                className="min-w-0 flex-1 basis-60 text-[19px] font-medium leading-snug text-sol-cobalt-deep hover:underline"
              >
                {assumptionTitle}
              </Link>
              <StatusShape status={mission.assumption.status} />
            </div>
          )}

          <section
            aria-labelledby="done-title"
            className="flex flex-wrap items-end justify-between gap-6"
          >
            <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-3">
              <h2 id="done-title" className="dash-label">
                {t("v2.mission.doneWhen")}
              </h2>
              <p className="font-display text-[clamp(24px,2.4vw,34px)] font-medium leading-[1.18] tracking-[-0.02em] text-sol-ink">
                {doneWhen}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {locked ? (
                <p className="dash-meta">
                  {week.state === "completed" ? t("v2.mission.weekClosed") : t("rm.locked.body")}
                </p>
              ) : done ? (
                nextId ? (
                  <ActionLink
                    to="/dashboard/roadmap/mission/$missionId"
                    params={{ missionId: nextId }}
                    search={{ start: true }}
                    data-testid="next-mission"
                  >
                    {t("v2.mission.next")}
                  </ActionLink>
                ) : (
                  <ActionLink to="/dashboard/roadmap" data-testid="next-mission">
                    {t("v2.mission.backToWeek")}
                  </ActionLink>
                )
              ) : (
                <ActionButton
                  disabled={busy || Boolean(gateReason)}
                  aria-describedby={gateReason ? "gate-reason" : undefined}
                  data-testid="mission-complete"
                  onClick={() => {
                    setState.mutate({ taskId: mission.id, state: "completed" });
                    toast.success(t("v2.mission.doneToast"));
                  }}
                >
                  {t("v2.mission.markDone")}
                </ActionButton>
              )}
              {gateReason && !done && !locked && (
                <p id="gate-reason" className="dash-meta basis-full" data-testid="gate-reason">
                  {gateReason}
                </p>
              )}
            </div>
          </section>

          {!locked && (
            <div className="flex flex-wrap items-center gap-3">
              {evidence.assumptions.length > 0 && (
                <ActionButton
                  tone="secondary"
                  size="md"
                  arrow={false}
                  onClick={() => setRecording(true)}
                  data-testid="mission-record-evidence"
                >
                  {t("v2.mission.record")}
                </ActionButton>
              )}
              {mission.evidenceCount > 0 && (
                <span className="dash-meta">
                  {t("pf.mission.recorded", { n: mission.evidenceCount })}
                </span>
              )}
              {done && (
                <ActionButton
                  tone="secondary"
                  size="md"
                  arrow={false}
                  disabled={busy}
                  data-testid="mission-reopen"
                  onClick={() => setState.mutate({ taskId: mission.id, state: "in_progress" })}
                >
                  {t("rm.mission.reopen")}
                </ActionButton>
              )}
            </div>
          )}

          {/* Stuck? — each answer leads somewhere, and is stored with the mission (drop-off data):
              can't do it → the mission's easier route; no time → the week moves by seven days, no
              penalty; doesn't feel right → Ask Sol with the mission as context. */}
          <section
            aria-label={t("v2.mission.stuck.aria")}
            className="flex flex-wrap items-center gap-3 rounded-[32px] border border-sol-border px-[clamp(20px,2.6vw,32px)] py-6"
            data-testid="stuck-row"
          >
            <p className="mr-2 text-[20px] font-medium text-sol-ink">
              {t("v2.mission.stuck.title")}
            </p>
            {stuck.map((s) => (
              <button
                key={s.key}
                type="button"
                data-testid={`stuck-${s.key}`}
                onClick={() => {
                  stuckMutation.mutate(s.key, {
                    onSuccess: (res) => {
                      if (s.key === "time" && res.moved) {
                        setStuckNote(
                          res.newDeadline
                            ? t("v2.mission.stuck.moved", { date: dayOf(res.newDeadline) })
                            : t("v2.mission.stuck.movedPlain"),
                        );
                        void invalidate();
                      }
                    },
                  });
                  if (s.key === "cant" && workspace.data?.fallback) {
                    setStuckNote(null);
                    setShowFallback(true);
                  } else if (s.key !== "time") {
                    ask.open(t("v2.mission.stuck.ask", { reason: s.label, mission: title }));
                  }
                }}
                className="min-h-12 rounded-full border border-sol-ink/30 bg-white px-5 text-[17px] font-medium text-sol-ink transition-colors hover:border-sol-ink/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt"
              >
                {s.label}
              </button>
            ))}
            {showFallback && workspace.data?.fallback && (
              <div
                className="basis-full rounded-[24px] bg-sol-ivory p-5"
                data-testid="stuck-fallback"
              >
                <p className="dash-label pb-2">{t("v2.mission.stuck.easier")}</p>
                <p className="dash-body text-sol-ink">{workspace.data.fallback}</p>
              </div>
            )}
            {stuckNote && (
              <p
                role="status"
                className="dash-body basis-full text-sol-ink"
                data-testid="stuck-note"
              >
                {stuckNote}
              </p>
            )}
          </section>
        </DashPage>
      </main>

      {recording && opportunityId && (
        <EvidenceDialog
          open
          onOpenChange={(o) => !o && setRecording(false)}
          opportunityId={opportunityId}
          assumptions={evidence.assumptions}
          presetAssumptionId={mission.assumption?.id ?? null}
          taskId={mission.id}
          weekId={week.id}
          titleSupported={evidence.overview.data?.titleSupported ?? false}
        />
      )}
      <span className="sr-only" aria-live="polite">
        {done ? t("rm.mission.completed") : ""}
      </span>
    </>
  );
}
