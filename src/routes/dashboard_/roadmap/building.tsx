import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { BrandLockup } from "@/components/brand/Brand";
import { LanguageSwitcher } from "@/components/solventia/LanguageSwitcher";
import { Button, LinkButton } from "@/components/founder/ui";
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

/** What building a roadmap involves. The server does it in ONE request that reports
 * no intermediate progress, so these are listed — never ticked off on a timer, never
 * given a percentage: the page only says it is done when the request has resolved. */
const STATUS_KEYS = [
  "rm.build.s1",
  "rm.build.s2",
  "rm.build.s3",
  "rm.build.s4",
  "rm.build.s5",
] as const;

function BuildingPage() {
  const { opportunityId } = Route.useSearch();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFounder();
  const founder = useFounderState();
  const [statusIndex, setStatusIndex] = useState(0);
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
            search: { tab: "week", week: 1 },
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
  void statusIndex;

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

  return (
    <div className="sol-world-bg flex min-h-dvh flex-col text-sol-ink">
      <header className="flex h-[72px] items-center justify-between px-5 sm:px-10">
        <Link to="/" className="flex items-center gap-3" aria-label={t("nav.homeAria")}>
          <BrandLockup preset="compact" signature={false} />
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div
          className="flex w-full max-w-[560px] flex-col items-center gap-6 text-center"
          data-testid="building"
        >
          {failed ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-4"
              data-testid="build-failed"
            >
              <h1 className="sol-h2">{t("rm.build.failedTitle")}</h1>
              <p className="sol-body sol-prose text-sol-secondary">{t("rm.build.failedBody")}</p>
              <div className="flex flex-wrap justify-center gap-3">
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
              <h1 className="sol-h2">{t("rm.build.title")}</h1>
              <p
                role="status"
                aria-live="polite"
                className="min-h-8 text-[1.125rem] text-sol-ink"
                data-testid="build-status"
              >
                {waitingOnOther ? t("rm.build.other") : t("rm.build.working", { s: elapsed })}
              </p>
              {/* Indeterminate: movement without a number, because none is measurable. */}
              <div
                className="h-1 w-full max-w-[320px] overflow-hidden rounded-full bg-sol-cobalt-soft"
                aria-hidden="true"
              >
                <div className="h-full w-1/3 rounded-full bg-sol-cobalt motion-safe:animate-[sol-indeterminate_1.6s_ease-in-out_infinite]" />
              </div>
              <div className="w-full max-w-[420px] text-left">
                <p className="text-[0.9375rem] font-semibold text-sol-secondary">
                  {t("rm.build.whatHappens")}
                </p>
                <ul className="mt-2 flex flex-col gap-1.5 text-[0.9375rem] text-sol-ink">
                  {STATUS_KEYS.map((k) => (
                    <li key={k} className="flex gap-2.5">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-sol-border-strong"
                        aria-hidden="true"
                      />
                      {t(k)}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="sol-support max-w-[38ch]">{t("rm.build.honest")}</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
