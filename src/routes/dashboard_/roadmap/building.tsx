import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { BrandLockup } from "@/components/brand/Brand";
import { LanguageSwitcher } from "@/components/solventia/LanguageSwitcher";
import { DASH_FRAME } from "@/components/founder/DashboardShell";
import { ActionButton, ActionLink } from "@/components/founder/dash/ui";
import { BuildWait } from "@/components/founder/roadmap/BuildWait";
import { cn } from "@/lib/utils";
import { buildRoadmap } from "@/lib/actions/roadmap";
import { parseDailyLimit } from "@/lib/limits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useFounderState, useInvalidateFounder } from "@/lib/queries";
import { requireAuthLoader } from "@/lib/route-guards";

/** A dedicated, chrome-free route (note the trailing underscore in the folder
 * name: it deliberately does NOT nest under the dashboard layout). */
export const Route = createFileRoute("/dashboard_/roadmap/building")({
  beforeLoad: requireAuthLoader,
  validateSearch: z.object({ opportunityId: z.string().uuid() }),
  component: BuildingPage,
  head: () => ({
    meta: [
      { title: "Building your roadmap | Solventia" },
      { name: "description", content: "Your roadmap is being written from your chosen direction." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function BuildingPage() {
  const { opportunityId } = Route.useSearch();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFounder();
  const founder = useFounderState();
  const [waitingOnOther, setWaitingOnOther] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const startedRef = useRef(false);

  const build = useMutation({
    mutationFn: () => buildRoadmap({ data: { opportunityId, locale } }),
    onSuccess: async (res) => {
      if (res.status === "ready") {
        try {
          await invalidate();
        } finally {
          // Navigate even if refreshing the cache failed: the destination page
          // fetches its own data, so a stale cache must never leave this
          // screen spinning once the roadmap itself is confirmed built.
          void navigate({
            to: "/dashboard/roadmap",
            search: { week: 1 },
            replace: true,
          });
        }
      } else if (res.status === "in_progress") {
        // Another request (another tab, or an earlier attempt) owns this build.
        setWaitingOnOther(true);
        await invalidate().catch(() => {});
      } else {
        await invalidate().catch(() => {});
      }
    },
    onError: (err) => console.error("[roadmap] build request failed:", err),
  });

  // Start exactly once per visit; a refresh simply finds the row and resumes.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    build.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A hard ceiling so this screen can never spin forever: generation plus
  // persistence normally finishes well under a minute, so anything still
  // pending after this is a genuine failure (a hung request, a dead
  // connection to the AI/database) even if no error ever came back.
  useEffect(() => {
    if (!build.isPending) return;
    setTimedOut(false);
    const id = window.setTimeout(() => {
      console.error("[roadmap] build request timed out client-side after 120s");
      setTimedOut(true);
    }, 120_000);
    return () => window.clearTimeout(id);
  }, [build.isPending]);

  // Real elapsed time — the one honest measure an opaque request has.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!build.isPending && !waitingOnOther) return;
    const start = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [build.isPending, waitingOnOther]);

  // When someone else is building it, watch the real state until it finishes.
  useEffect(() => {
    if (!waitingOnOther) return;
    const id = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: qk.founderAll });
    }, 3000);
    return () => window.clearInterval(id);
  }, [waitingOnOther, queryClient]);
  const roadmapStatus = founder.data?.direction.roadmap?.status;
  useEffect(() => {
    if (waitingOnOther && roadmapStatus === "active") {
      void navigate({ to: "/dashboard/roadmap", search: { week: 1 }, replace: true });
    }
  }, [waitingOnOther, roadmapStatus, navigate]);

  const limit = parseDailyLimit(build.error);
  const failed =
    build.isError ||
    build.data?.status === "failed" ||
    (waitingOnOther && roadmapStatus === "failed") ||
    timedOut;

  return (
    <div className="app-inter flex min-h-dvh flex-col bg-white text-sol-ink">
      <header
        className={cn(
          DASH_FRAME,
          "flex flex-wrap items-center justify-between gap-4 pb-[clamp(20px,3vw,44px)] pt-5 sm:pt-[26px]",
        )}
      >
        <Link
          to="/"
          className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sol-cobalt"
          aria-label={t("nav.homeAria")}
        >
          <BrandLockup preset="compact" />
        </Link>
        <LanguageSwitcher className="inline-flex min-h-[46px] items-center rounded-full border border-sol-ink/20 bg-white px-[18px] text-[16px] font-medium text-sol-ink transition-colors hover:border-sol-ink/50" />
      </header>

      <main className={cn(DASH_FRAME, "flex flex-1 flex-col pb-16")}>
        <div className="dash-page flex w-full flex-col gap-8" data-testid="building">
          {failed ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-7"
              data-testid="build-failed"
            >
              <h1 className="dash-headline max-w-[15em]">
                {limit ? t("v2.limit.title") : t("rm.build.failedTitle")}
              </h1>
              <p className="dash-lead max-w-[32em]" data-testid={limit ? "daily-limit" : undefined}>
                {limit ? t("v2.limit.roadmap", { n: limit.limit }) : t("rm.build.failedBody")}
              </p>
              <div className="flex flex-wrap items-center gap-3.5">
                <ActionButton
                  loading={build.isPending}
                  onClick={() => {
                    setWaitingOnOther(false);
                    setTimedOut(false);
                    build.mutate();
                  }}
                  data-testid="retry-build"
                >
                  {t("common.retry")}
                </ActionButton>
                <ActionLink to="/dashboard" tone="secondary" arrow={false}>
                  {t("shell.nav.commandCenter")}
                </ActionLink>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-[18px]">
                <h1 className="dash-headline">{t("rm.build.title")}</h1>
                <p
                  role="status"
                  aria-live="polite"
                  className="dash-lead min-h-8"
                  data-testid="build-status"
                >
                  {waitingOnOther ? t("rm.build.other") : t("rm.build.working", { s: elapsed })}
                </p>
                <p className="dash-body text-sol-secondary">{t("v2.build.time")}</p>
              </div>
              <BuildWait opportunityId={opportunityId} active={build.isPending || waitingOnOther} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
