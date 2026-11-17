import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { z } from "zod";

import { BrandLockup } from "@/components/brand/Brand";
import { LanguageSwitcher } from "@/components/solventia/LanguageSwitcher";
import { DASH_FRAME } from "@/components/founder/DashboardShell";
import { ActionButton, ActionLink } from "@/components/founder/dash/ui";
import { exploreMoreOpportunities, getGenerationJob } from "@/lib/actions/opportunities";
import { findNewDirections } from "@/lib/actions/fact-updates";
import type { GenerationJob } from "@/lib/actions/generation-jobs.server";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useInvalidateFounder } from "@/lib/queries";
import { requireAuthLoader } from "@/lib/route-guards";
import { cn } from "@/lib/utils";

/**
 * Finding directions, full page (owner, 2026-11-17, Jobs M and N): "Find 3 more directions" and
 * Ask Sol's "Find new directions". The same calm style as the consultation's finish screen: the
 * real step the server is on, the honest time ("a minute or two"), the seconds counted from when
 * the job really started (also after leaving and coming back), and — never a spinner with no end
 * — a calm line when it takes longer, a plain error with "Try again" (the same job) when it fails.
 * One job per founder: opening this page while one runs shows that job; it never starts another.
 */
export const Route = createFileRoute("/dashboard_/directions/finding")({
  beforeLoad: requireAuthLoader,
  validateSearch: z.object({
    kind: z.enum(["more", "refresh"]).catch("more"),
    /** Set by the button that sent the founder here: start a job unless one is running. */
    start: z.boolean().optional(),
    /** Ask Sol's saved facts (refresh only). */
    update: z.string().uuid().optional(),
  }),
  component: FindingPage,
  head: () => ({
    meta: [
      { title: "Finding directions | Solventia" },
      { name: "description", content: "New business directions are being written for you." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const STEPS = ["reading", "fitting", "writing"] as const;
/** "A minute or two": the calm line shows past two minutes. */
const LONG_AFTER_S = 120;
const jobKey = ["generation-job"] as const;

function FindingPage() {
  const search = Route.useSearch();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFounder();
  const started = useRef(false);
  // While the start request is in flight the job is polled too (its row appears as soon as the
  // server takes it), and the clock counts from the tap until the job is known.
  const pending = useRef(false);
  const tappedAt = useRef<number | null>(null);

  const job = useQuery({
    queryKey: jobKey,
    queryFn: () => getGenerationJob(),
    staleTime: 0,
    // Poll the real state while it runs (and once more when it ends).
    refetchInterval: (q) => (q.state.data?.status === "running" || pending.current ? 2_000 : false),
  });

  const run = useMutation({
    mutationFn: (retryJobId?: string) =>
      search.kind === "refresh" && search.update
        ? findNewDirections({ data: { updateId: search.update, locale, retryJobId } }).then(
            (r) => r.job,
          )
        : exploreMoreOpportunities({ data: { locale, retryJobId } }).then((r) => r.job),
    onMutate: () => {
      // The page shows "running" from the first moment (the server row follows).
      pending.current = true;
      tappedAt.current = Date.now();
      void queryClient.invalidateQueries({ queryKey: jobKey });
    },
    onSettled: (data) => {
      pending.current = false;
      if (data) queryClient.setQueryData(jobKey, data);
      void queryClient.invalidateQueries({ queryKey: jobKey });
    },
  });

  // Start at most once per visit, and only when no job is running already.
  // While a start request is in flight, an earlier finished job is not this one.
  const current: GenerationJob | null | undefined =
    run.data ?? (!run.isPending || job.data?.status === "running" ? job.data : null);
  useEffect(() => {
    if (started.current || !search.start || job.isPending) return;
    started.current = true;
    if (job.data?.status === "running") return;
    run.mutate(undefined);
    // Drop ?start so a refresh or a return visit never asks again.
    void navigate({ to: ".", search: { kind: search.kind, update: search.update }, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.start, job.isPending]);

  // Seconds since the job really started (server time), also after coming back.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const running = run.isPending || current?.status === "running";
  const done = !running && current?.status === "done";
  const failed = !running && current?.status === "failed";
  const limit = failed && current?.error === "limit";

  // Done: a short "ready" moment, then the new directions. (Keyed on `done` alone: the page
  // re-renders every second for the clock, which must not restart this timer.)
  const leave = useRef({ invalidate, navigate });
  leave.current = { invalidate, navigate };
  useEffect(() => {
    if (!done) return;
    void leave.current.invalidate().catch(() => {});
    const id = window.setTimeout(() => {
      void leave.current.navigate({ to: "/dashboard/opportunities", replace: true });
    }, 1_200);
    return () => window.clearTimeout(id);
  }, [done]);

  // Nothing running and nothing asked for: back to the directions.
  const idle = !job.isPending && !run.isPending && !current && !search.start;
  useEffect(() => {
    if (idle) void navigate({ to: "/dashboard/opportunities", replace: true });
  }, [idle, navigate]);

  const startedAt = current?.createdAt ? Date.parse(current.createdAt) : tappedAt.current;
  const elapsed = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;
  const stepIndex = current ? STEPS.indexOf(current.step) : 0;
  const kind = current?.kind === "refresh" || search.kind === "refresh" ? "refresh" : "more";

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
        <div
          className="dash-page flex w-full flex-col gap-8"
          data-testid="finding"
          data-status={running ? "running" : (current?.status ?? "starting")}
          data-job={current?.id}
        >
          {failed ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-7"
              data-testid="finding-failed"
            >
              <h1 className="dash-headline max-w-[15em]">
                {limit ? t("v2.limit.title") : t("gen.failed.title")}
              </h1>
              <p className="dash-lead max-w-[32em]" data-testid={limit ? "daily-limit" : undefined}>
                {limit
                  ? kind === "refresh"
                    ? t("sol.facts.limit")
                    : t("gen.limit")
                  : t("gen.failed.body")}
              </p>
              <div className="flex flex-wrap items-center gap-3.5">
                {!limit && (
                  <ActionButton
                    onClick={() => run.mutate(current?.id)}
                    loading={run.isPending}
                    disabled={run.isPending}
                    data-testid="finding-retry"
                  >
                    {t("common.retry")}
                  </ActionButton>
                )}
                <ActionLink to="/dashboard/opportunities" tone="secondary" arrow={false}>
                  {t("gen.back")}
                </ActionLink>
              </div>
            </div>
          ) : (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-start gap-8 transition-opacity duration-500"
              style={{ opacity: done ? 0.6 : 1 }}
            >
              <div className="flex flex-col gap-[18px]">
                <h1 className="dash-headline max-w-[16em]">
                  {done
                    ? t("gen.done")
                    : kind === "refresh"
                      ? t("gen.refresh.title")
                      : t("gen.more.title")}
                </h1>
                {!done && <p className="dash-lead">{t("gen.time")}</p>}
              </div>
              <ol className="flex flex-col gap-3.5" data-testid="finding-steps">
                {STEPS.map((k, i) => {
                  const complete = done || i < stepIndex;
                  const active = !done && i === stepIndex && running;
                  return (
                    <li
                      key={k}
                      data-state={complete ? "done" : active ? "active" : "waiting"}
                      className={cn(
                        "flex items-center gap-3 text-[20px]",
                        complete || active ? "text-sol-ink" : "text-sol-secondary/70",
                      )}
                    >
                      {complete ? (
                        <Check
                          className="size-5 text-sol-cobalt"
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                      ) : active ? (
                        <span
                          className="size-5 animate-pulse rounded-full bg-sol-cobalt/30"
                          aria-hidden="true"
                        />
                      ) : (
                        <span
                          className="size-5 rounded-full border border-sol-border"
                          aria-hidden="true"
                        />
                      )}
                      {t(`gen.step.${k}` as const)}
                    </li>
                  );
                })}
              </ol>
              {!done && (
                <div className="flex flex-col gap-2">
                  <p className="dash-meta tabular-nums" data-testid="finding-elapsed">
                    {t("gen.elapsed", { s: elapsed })}
                  </p>
                  {elapsed >= LONG_AFTER_S && (
                    <p className="dash-body text-sol-secondary" data-testid="finding-long">
                      {t("gen.long")}
                    </p>
                  )}
                  <p className="dash-body max-w-[34em] text-sol-secondary">{t("gen.leave")}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
