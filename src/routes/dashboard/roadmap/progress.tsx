import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageEyebrow } from "@/components/dashboard/PageEyebrow";
import { SolventiaLoadingState } from "@/components/dashboard/SolventiaLoadingState";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { requireAuthLoader } from "@/lib/route-guards";
import { getRoadmap } from "@/lib/actions/roadmap";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { translateDashboardText } from "@/lib/i18n/dashboard-dictionary";

export const Route = createFileRoute("/dashboard/roadmap/progress")({
  beforeLoad: requireAuthLoader,
  component: RoadmapProgressPage,
  head: () => ({
    meta: [{ title: "Roadmap Progress — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

// Same done/remaining semantics used throughout the roadmap page itself
// (champagne = done, a quiet neutral = remaining) — never a new palette,
// just the app's own existing status pair reused for the chart marks.
const DONE_COLOR = "var(--sol-champagne)";
const REMAINING_COLOR = "var(--sol-border-strong)";

const OVERALL_CONFIG = {
  done: { label: "Done", color: DONE_COLOR },
  remaining: { label: "Remaining", color: REMAINING_COLOR },
} satisfies ChartConfig;

const PHASE_CONFIG = {
  done: { label: "Done", color: DONE_COLOR },
  remaining: { label: "Remaining", color: REMAINING_COLOR },
} satisfies ChartConfig;

function RoadmapProgressPage() {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["roadmap"], queryFn: () => getRoadmap({ data: {} }) });
  const { locale } = useLocale();
  const tr = (s: string) => translateDashboardText(s, locale) ?? s;

  if (query.isLoading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <SolventiaLoadingState message={tr("Loading your progress…")} />
        </div>
      </DashboardShell>
    );
  }

  if (!query.data || "needsBuild" in query.data) {
    navigate({ to: "/dashboard/roadmap", replace: true });
    return null;
  }

  const { roadmap, opportunity, phases } = query.data;
  const sortedPhases = [...phases].sort((a, b) => a.order_index - b.order_index);

  const allTasks = sortedPhases.flatMap((p) => p.roadmap_tasks);
  const totalDone = allTasks.filter((t) => t.status === "done").length;
  const totalRemaining = allTasks.length - totalDone;
  const overallProgress = allTasks.length > 0 ? Math.round((totalDone / allTasks.length) * 100) : 0;

  const overallData = [
    { key: "done", label: tr("Done"), value: totalDone },
    { key: "remaining", label: tr("Remaining"), value: totalRemaining },
  ];

  const phaseData = sortedPhases.map((phase, i) => {
    const done = phase.roadmap_tasks.filter((t) => t.status === "done").length;
    const remaining = phase.roadmap_tasks.length - done;
    return {
      phase: tr(`Stage ${i + 1}`),
      title: phase.title,
      done,
      remaining,
    };
  });

  return (
    <DashboardShell
      opportunityId={roadmap.opportunity_id}
      opportunityTitle={opportunity?.title ?? null}
      hasRoadmap
    >
      <button
        type="button"
        onClick={() => navigate({ to: "/dashboard/roadmap" })}
        className="flex items-center gap-1.5 text-[0.8rem] font-medium text-sol-secondary transition-colors hover:text-sol-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {tr("Back to Roadmap")}
      </button>

      <PageEyebrow className="mt-3">
        {tr("Roadmap")} · {tr("Progress")}
      </PageEyebrow>
      <h1 className="mt-1 font-display text-[1.5rem] font-semibold text-sol-ink">
        {tr("Your Progress")}
      </h1>
      <p className="mt-1 max-w-xl text-[0.82rem] text-sol-secondary">
        {opportunity?.title ?? tr("Your personalized execution plan.")}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Overall completion — a single headline number is the real
            content here; the donut is supporting visual context, not the
            other way around. */}
        <div className="flex flex-col items-center rounded-xl border border-sol-border bg-sol-surface p-5">
          <p className="self-start text-[0.7rem] font-semibold uppercase tracking-wide text-sol-muted">
            {tr("Overall Completion")}
          </p>
          <div className="relative mx-auto mt-2 size-[190px] shrink-0">
            <ChartContainer config={OVERALL_CONFIG} className="aspect-auto size-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={overallData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={84}
                  strokeWidth={2}
                  stroke="var(--sol-surface)"
                >
                  {overallData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={entry.key === "done" ? DONE_COLOR : REMAINING_COLOR}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[1.7rem] font-semibold text-sol-ink">
                {overallProgress}%
              </span>
              <span className="text-[0.65rem] text-sol-muted">{tr("complete")}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-[0.76rem]">
            <span className="flex items-center gap-1.5 text-sol-secondary">
              <span
                className="size-2 rounded-full"
                style={{ background: DONE_COLOR }}
                aria-hidden="true"
              />
              {tr("Done")} ({totalDone})
            </span>
            <span className="flex items-center gap-1.5 text-sol-secondary">
              <span
                className="size-2 rounded-full"
                style={{ background: REMAINING_COLOR }}
                aria-hidden="true"
              />
              {tr("Remaining")} ({totalRemaining})
            </span>
          </div>
        </div>

        {/* Per-stage breakdown — a stacked bar per phase, same done/remaining
            pair as the donut, so the two charts read as one system. */}
        <div className="rounded-xl border border-sol-border bg-sol-surface p-5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sol-muted">
            {tr("Progress by Stage")}
          </p>
          <ChartContainer config={PHASE_CONFIG} className="mt-3 max-h-[260px] w-full">
            <BarChart data={phaseData} barCategoryGap={18}>
              <CartesianGrid vertical={false} stroke="var(--sol-border)" />
              <XAxis
                dataKey="phase"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--sol-muted)" }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.title ?? ""}
                  />
                }
              />
              <Bar dataKey="done" stackId="tasks" fill={DONE_COLOR} radius={[0, 0, 4, 4]} />
              <Bar
                dataKey="remaining"
                stackId="tasks"
                fill={REMAINING_COLOR}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <Button asChild variant="outline">
          <Link to="/dashboard/roadmap">{tr("Back to Roadmap")}</Link>
        </Button>
      </div>
    </DashboardShell>
  );
}
