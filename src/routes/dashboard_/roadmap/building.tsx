import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { z } from "zod";

import { BrandLockup } from "@/components/brand/Brand";
import { LanguageSwitcher } from "@/components/solventia/LanguageSwitcher";
import { Button, LinkButton } from "@/components/founder/ui";
import { RoutePath, type RouteStage } from "@/components/os/graphics";
import { ActionArrow, OsDisplay, OsEyebrow, primaryActionClass } from "@/components/os/os";
import { useTranslatedTitle } from "@/lib/use-translation";
import { cn } from "@/lib/utils";
import { buildRoadmap } from "@/lib/actions/roadmap";
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
    meta: [{ title: "Building Your Roadmap — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

/** Honest narration of what the one real request is doing. It rotates on a
 * timer and holds on the last line; it is NOT tied to a progress bar or a
 * percentage, and nothing on this page claims completion until the request
 * has actually resolved. */
const STATUS_KEYS = ["os.build.s1", "os.build.s2", "os.build.s3", "os.build.s4"] as const;

function BuildingPage() {
  const { opportunityId } = Route.useSearch();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFounder();
  const founder = useFounderState();
  const opportunityTitle = useTranslatedTitle(
    opportunityId,
    founder.data?.briefs[opportunityId]?.title ?? null,
  );
  const [statusIndex, setStatusIndex] = useState(0);
  const [waitingOnOther, setWaitingOnOther] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);
  const openRoadmap = () =>
    void navigate({ to: "/dashboard/roadmap", search: { tab: "week", week: 1 }, replace: true });

  const build = useMutation({
    mutationFn: () => buildRoadmap({ data: { opportunityId, locale } }),
    onSuccess: async (res) => {
      if (res.status === "ready") {
        try {
          await invalidate();
        } finally {
          // The plan is real now: a short "ready" beat, then the first move. Navigate even if
          // refreshing the cache failed — the destination fetches its own data, so a stale
          // cache must never leave this screen waiting once the roadmap is confirmed built.
          setReady(true);
          window.setTimeout(openRoadmap, 1800);
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

  useEffect(() => {
    const id = window.setInterval(
      () => setStatusIndex((i) => Math.min(i + 1, STATUS_KEYS.length - 1)),
      4200,
    );
    return () => window.clearInterval(id);
  }, []);

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
      void navigate({ to: "/dashboard/roadmap", search: { tab: "week", week: 1 }, replace: true });
    }
  }, [waitingOnOther, roadmapStatus, navigate]);

  const failed =
    build.isError ||
    build.data?.status === "failed" ||
    (waitingOnOther && roadmapStatus === "failed") ||
    timedOut;

  const title = opportunityTitle ?? "";
  // The direction becomes a path: the start of Validate is where the founder stands.
  const stages: RouteStage[] = [
    {
      key: "validate",
      label: t("os.rm.validate"),
      span: t("os.rm.weeks", { a: 1, b: 2 }),
      state: "current",
    },
    {
      key: "build",
      label: t("os.rm.build"),
      span: t("os.rm.weeks", { a: 3, b: 4 }),
      state: "later",
    },
    { key: "elevate", label: t("os.rm.elevate"), span: t("os.rm.later"), state: "later" },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-sol-pearl text-sol-ink">
      <header className="flex h-[84px] items-center justify-between px-5 sm:px-10">
        <Link to="/" className="flex items-center" aria-label={t("nav.homeAria")}>
          <BrandLockup preset="compact" signature={false} />
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="flex flex-1 items-center px-5 pb-16 sm:px-10">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-12" data-testid="building">
          {failed ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-5"
              data-testid="build-failed"
            >
              <OsDisplay size="section">{t("rm.build.failedTitle")}</OsDisplay>
              <p className="max-w-[52ch] text-[1.125rem] text-[#2A2F3B]">
                {t("rm.build.failedBody")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  loading={build.isPending}
                  onClick={() => {
                    setWaitingOnOther(false);
                    setStatusIndex(0);
                    setTimedOut(false);
                    build.mutate();
                  }}
                  data-testid="retry-build"
                >
                  {t("common.retry")}
                </Button>
                <LinkButton to="/dashboard" variant="secondary" size="lg">
                  {t("shell.nav.commandCenter")}
                </LinkButton>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-5">
                <OsEyebrow tone="champagne">{t("os.build.direction")}</OsEyebrow>
                <OsDisplay>
                  {ready ? (
                    <span data-testid="build-ready">{t("os.build.ready")}</span>
                  ) : (
                    title || t("rm.build.title")
                  )}
                </OsDisplay>
              </div>
              <RoutePath stages={stages} ariaLabel={t("os.rm.route")} className="max-w-[920px]" />
              <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-end">
                <ol className="flex flex-col gap-3" aria-label={t("rm.build.title")}>
                  {STATUS_KEYS.map((key, i) => {
                    const done = ready || i < statusIndex;
                    const current = !ready && i === statusIndex;
                    return (
                      <li
                        key={key}
                        className={cn(
                          "flex items-center gap-3 text-[1.1875rem] leading-snug transition-colors duration-300",
                          done && "text-[#171A27]",
                          current && "font-semibold text-[#171A27]",
                          !done && !current && "text-[#5B6170]",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full border",
                            done && "border-[#B8924F] bg-[#B8924F] text-white",
                            current && "border-[#2F62D9]",
                            !done && !current && "border-[#171A27]/20",
                          )}
                        >
                          {done ? (
                            <Check className="size-3.5" strokeWidth={3} />
                          ) : current ? (
                            <span className="size-2 rounded-full bg-[#2F62D9] motion-safe:animate-pulse" />
                          ) : null}
                        </span>
                        {t(key)}
                      </li>
                    );
                  })}
                </ol>
                <div className="flex flex-col items-start gap-4">
                  <p
                    role="status"
                    aria-live="polite"
                    className="sr-only"
                    data-testid="build-status"
                  >
                    {ready
                      ? t("os.build.ready")
                      : waitingOnOther
                        ? t("rm.build.other")
                        : t(STATUS_KEYS[statusIndex])}
                  </p>
                  {ready ? (
                    <button type="button" onClick={openRoadmap} className={primaryActionClass}>
                      {t("os.build.open")}
                      <ActionArrow />
                    </button>
                  ) : (
                    <p className="max-w-[40ch] text-[1rem] text-[#454B59]">
                      {t("os.build.honest")}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
