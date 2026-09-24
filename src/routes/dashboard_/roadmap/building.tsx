import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import mark from "@/assets/solventia-mark.png";
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

/** Honest narration of what the one real request is doing. It rotates on a
 * timer and holds on the last line; it is NOT tied to a progress bar or a
 * percentage, and nothing on this page claims completion until the request
 * has actually resolved. */
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
  const startedRef = useRef(false);

  const build = useMutation({
    mutationFn: () => buildRoadmap({ data: { opportunityId, locale } }),
    onSuccess: async (res) => {
      await invalidate();
      if (res.status === "ready") {
        void navigate({
          to: "/dashboard/roadmap",
          search: { tab: "week", week: 1 },
          replace: true,
        });
      } else if (res.status === "in_progress") {
        // Another request (another tab, or an earlier attempt) owns this build.
        setWaitingOnOther(true);
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

  useEffect(() => {
    const id = window.setInterval(
      () => setStatusIndex((i) => Math.min(i + 1, STATUS_KEYS.length - 1)),
      3600,
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
    (waitingOnOther && roadmapStatus === "failed");

  return (
    <div className="flex min-h-dvh flex-col bg-sol-pearl text-sol-ink">
      <header className="flex h-[72px] items-center justify-between px-5 sm:px-10">
        <Link to="/" className="flex items-center gap-3" aria-label={t("nav.homeAria")}>
          <img src={mark} alt="" width={298} height={436} className="h-9 w-auto" />
          <span className="hidden font-display text-[1.25rem] font-semibold tracking-[0.2em] sm:block">
            SOLVENTIA
          </span>
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
              <Loader2 className="size-9 animate-spin text-sol-violet" aria-hidden="true" />
              <h1 className="sol-h2">{t("rm.build.title")}</h1>
              <p
                key={statusIndex}
                role="status"
                aria-live="polite"
                className="min-h-8 text-[1.25rem] text-sol-ink"
                data-testid="build-status"
              >
                {waitingOnOther ? t("rm.build.other") : t(STATUS_KEYS[statusIndex])}
              </p>
              <p className="sol-support max-w-[38ch]">{t("rm.build.honest")}</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
