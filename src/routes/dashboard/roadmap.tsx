import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronRight, Loader2, MapPin, Sparkles } from "lucide-react";
import { DashboardShell, useOpenMentor } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requireAuthLoader } from "@/lib/route-guards";
import { getRoadmap, updateTaskStatus, replanRoadmap } from "@/lib/actions/roadmap";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/roadmap")({
  beforeLoad: requireAuthLoader,
  component: RoadmapPage,
  head: () => ({
    meta: [{ title: "Your Path — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

const BLOCKER_REASONS: {
  value: "time" | "money" | "difficulty" | "confusion" | "motivation" | "access" | "other";
  label: string;
}[] = [
  { value: "time", label: "Time" },
  { value: "money", label: "Money" },
  { value: "difficulty", label: "Difficulty" },
  { value: "confusion", label: "Confusion" },
  { value: "motivation", label: "Motivation" },
  { value: "access", label: "Access" },
  { value: "other", label: "Something else" },
];

interface Task {
  id: string;
  what: string;
  why: string;
  how: string;
  resource: string | null;
  time_estimate: string | null;
  deadline: string | null;
  deadline_days_from_start: number;
  required: boolean;
  depends_on: string | null;
  done_when: string;
  status: "pending" | "in_progress" | "done" | "blocked";
}

/** dependsOn is supposed to be a prior task's exact human-readable "what"
 * text (see the roadmap contract in intelligence-package.ts) — but a
 * response can still slip through with something index-shaped instead
 * (e.g. "0-0-1"). Never render that to a founder; fail closed to "no
 * visible dependency" rather than leak an internal reference. */
function isDisplayableDependency(value: string): boolean {
  return !/^\d+([.\-_]\d+)*$/.test(value.trim());
}

/** Splits "1. Do X 2. Do Y" / "Do X. Then do Y." style free text into a
 * short numbered list where possible, falling back to the original text
 * as a single line — the model returns `how` as prose, but a founder
 * scans a 2-4 step list far faster than a paragraph. */
function splitHowSteps(how: string): string[] {
  const numbered = how.match(/\d+[.)]\s*[^0-9]+/g);
  if (numbered && numbered.length > 1) {
    return numbered.map((s) => s.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean);
  }
  const sentences = how
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length > 1 ? sentences.slice(0, 4) : [how];
}

function TaskRow({
  task,
  roadmapId,
  onToggle,
  onReplanNeeded,
}: {
  task: Task;
  roadmapId: string;
  /** Fires immediately on click — the caller applies an optimistic cache
   * update synchronously and persists in the background (see RoadmapPage's
   * toggleTaskMutation). Never awaited here: waiting is exactly the "feels
   * like 5 seconds" problem this replaces. */
  onToggle: (taskId: string, nextStatus: "pending" | "done") => void;
  onReplanNeeded: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showBlocker, setShowBlocker] = useState(false);
  const [blockerReason, setBlockerReason] = useState<
    (typeof BLOCKER_REASONS)[number]["value"] | null
  >(null);
  const [blockerNote, setBlockerNote] = useState("");
  const [busy, setBusy] = useState(false);
  const isDone = task.status === "done";

  function markDone() {
    onToggle(task.id, isDone ? "pending" : "done");
  }

  async function submitBlocked() {
    if (!blockerReason) return;
    setBusy(true);
    try {
      await updateTaskStatus({
        data: { taskId: task.id, status: "blocked", blockedReason: blockerNote || undefined },
      });
      await replanRoadmap({ data: { roadmapId, blockerReason, blockerNote } });
      setShowBlocker(false);
      await onReplanNeeded();
    } catch (err) {
      console.error("[roadmap] replan failed:", err);
      toast.error("Sol couldn't replan your roadmap right now — try again.");
    } finally {
      setBusy(false);
    }
  }

  // Completed tasks collapse to a single quiet line — no strikethrough
  // paragraph — and only expand into the full detail if the founder
  // deliberately wants to review it.
  if (isDone && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition-colors hover:border-border/60 hover:bg-card/60"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-econ-green-active text-white">
          <Check className="size-3" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.88rem] font-medium text-foreground">
            {task.what}
          </span>
          <span className="text-[0.72rem] text-muted-foreground">Completed</span>
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={markDone}
          disabled={busy}
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            isDone ? "border-econ-green-active bg-econ-green-active text-white" : "border-border",
          )}
          aria-label={isDone ? "Mark as not done" : "Mark complete"}
        >
          {isDone && <Check className="size-3" aria-hidden="true" />}
        </button>
        <div className="flex-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex flex-wrap items-center gap-2 text-left"
          >
            <p className="text-[0.92rem] font-medium text-foreground">{task.what}</p>
            {!task.required && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
                Optional
              </span>
            )}
          </button>
          {!expanded && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.76rem] text-muted-foreground">
              {task.time_estimate && <span>{task.time_estimate}</span>}
              {task.required && <span>Required</span>}
              {task.deadline && <span>Due {task.deadline}</span>}
            </div>
          )}
          {task.status === "blocked" && (
            <p className="mt-1 text-[0.78rem] text-destructive">
              Blocked — Sol has replanned what's ahead.
            </p>
          )}
          {task.depends_on && isDisplayableDependency(task.depends_on) && (
            <p className="mt-1 text-[0.76rem] text-muted-foreground">
              Depends on: <span className="text-foreground">{task.depends_on}</span>
            </p>
          )}
          {expanded && (
            <div className="mt-3 flex flex-col gap-3 text-[0.85rem] text-muted-foreground">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  Why this matters
                </p>
                <p className="mt-1 leading-relaxed text-foreground">{task.why}</p>
              </div>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  How
                </p>
                <ol className="mt-1.5 flex flex-col gap-1">
                  {splitHowSteps(task.how).map((step, i) => (
                    <li key={i} className="flex gap-2 leading-relaxed text-foreground">
                      <span className="shrink-0 text-econ-green-active">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              {task.resource && (
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground/80">
                    Resource
                  </p>
                  <p className="mt-1 text-foreground">{task.resource}</p>
                </div>
              )}
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  Done when
                </p>
                <p className="mt-1 text-foreground">{task.done_when}</p>
              </div>
              <div className="flex items-center gap-3 text-[0.78rem]">
                {task.time_estimate && <span>{task.time_estimate}</span>}
                {task.deadline && <span>Due {task.deadline}</span>}
              </div>
              <div className="flex items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={markDone}
                  disabled={busy}
                  className={cn(
                    "self-start rounded-full px-3.5 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.06em] transition-colors",
                    isDone
                      ? "bg-secondary text-muted-foreground"
                      : "bg-econ-green-active text-white hover:bg-econ-green-deep",
                  )}
                >
                  {busy && (
                    <Loader2 className="mr-1 inline size-3 animate-spin" aria-hidden="true" />
                  )}
                  {isDone ? "Mark Not Done" : "Mark Complete"}
                </button>
                {!isDone && (
                  <button
                    type="button"
                    onClick={() => setShowBlocker((v) => !v)}
                    className="self-start text-[0.8rem] font-medium text-econ-green-active hover:underline"
                  >
                    I'm stuck on this
                  </button>
                )}
              </div>
            </div>
          )}
          {showBlocker && (
            <div className="mt-3 rounded-lg border border-border/60 bg-background p-3">
              <p className="text-[0.82rem] font-medium text-foreground">What got in the way?</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BLOCKER_REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setBlockerReason(r.value)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[0.76rem]",
                      blockerReason === r.value
                        ? "border-econ-green-active bg-econ-green-active/10 text-econ-green-deep"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <Textarea
                value={blockerNote}
                onChange={(e) => setBlockerNote(e.target.value)}
                placeholder="Anything else Sol should know? (optional)"
                className="mt-2 min-h-[60px] resize-none text-[0.85rem]"
              />
              <Button
                size="sm"
                className="mt-2"
                onClick={submitBlocked}
                disabled={!blockerReason || busy}
              >
                {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                Let Sol replan
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatINR(n: number): string {
  if (n <= 0) return "₹0";
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)}L`;
  if (n >= 1_000) return `₹${Math.round(n / 1000)}K`;
  return `₹${n}`;
}

/** useOpenMentor() reads a context that only exists inside <DashboardShell>'s
 * own subtree — it must be called from a component rendered as DashboardShell's
 * child, never from RoadmapPage itself (RoadmapPage is what creates
 * DashboardShell, so it renders one level above that provider). */
function AskSolStageButton() {
  const openMentor = useOpenMentor();
  return (
    <button
      type="button"
      onClick={openMentor}
      className="flex items-center justify-center gap-2 rounded-xl border border-[oklch(0.606_0.19_292.7_/_0.25)] bg-[oklch(0.606_0.19_292.7_/_0.05)] px-4 py-3 text-[0.82rem] font-medium text-primary transition-colors hover:bg-[oklch(0.606_0.19_292.7_/_0.09)]"
    >
      <Sparkles className="size-4 text-[oklch(0.55_0.16_292.7)]" aria-hidden="true" />
      Ask Sol about this stage
    </button>
  );
}

function RoadmapPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["roadmap"], queryFn: () => getRoadmap({ data: {} }) });
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Optimistic task completion — the checkbox, progress bar, and stage
  // status must all update the instant the founder clicks, not after a
  // round trip. The mutation still persists and still rolls back on a
  // real failure; the founder just never has to wait to see it happen.
  type RoadmapQueryData = NonNullable<typeof query.data>;
  const toggleTaskMutation = useMutation({
    mutationFn: (vars: { taskId: string; status: "pending" | "done" }) =>
      updateTaskStatus({ data: { taskId: vars.taskId, status: vars.status } }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["roadmap"] });
      const previous = queryClient.getQueryData<RoadmapQueryData>(["roadmap"]);
      queryClient.setQueryData<RoadmapQueryData>(["roadmap"], (old) => {
        if (!old) return old;
        return {
          ...old,
          phases: old.phases.map((phase) => ({
            ...phase,
            roadmap_tasks: phase.roadmap_tasks.map((t) =>
              t.id === vars.taskId ? { ...t, status: vars.status } : t,
            ),
          })),
        };
      });
      return { previous };
    },
    onError: (err, _vars, context) => {
      console.error("[roadmap] update task failed:", err);
      if (context?.previous) queryClient.setQueryData(["roadmap"], context.previous);
      toast.error("Couldn't update that task — try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  // A phase the founder is deliberately REVIEWING (clicked in the stage
  // rail) is distinct from the TRUE active phase — section 24. Viewing an
  // old completed phase must never force the founder back to "current";
  // it only auto-releases the view if the phase they were reviewing
  // becomes newly completed while they're looking at it, so finishing a
  // stage visibly advances rather than leaving the view stuck on a done
  // stage forever.
  const phasesForEffect = query.data?.phases;
  useEffect(() => {
    if (focusedIndex === null || !phasesForEffect) return;
    const sorted = [...phasesForEffect].sort((a, b) => a.order_index - b.order_index);
    const focused = sorted[focusedIndex];
    if (!focused) return;
    const isFocusedPhaseDone =
      focused.roadmap_tasks.length > 0 && focused.roadmap_tasks.every((t) => t.status === "done");
    if (isFocusedPhaseDone) setFocusedIndex(null);
  }, [phasesForEffect, focusedIndex]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["roadmap"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  if (query.isLoading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" />
          Loading your roadmap…
        </div>
      </DashboardShell>
    );
  }

  if (!query.data) {
    return (
      <DashboardShell>
        <div className="mt-10 rounded-[1.75rem] border border-border/70 bg-card/80 px-8 py-12 text-center">
          <MapPin className="mx-auto size-8 text-accent" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-semibold text-primary">No roadmap yet.</h2>
          <p className="mx-auto mt-2 max-w-md text-[0.9rem] text-muted-foreground">
            Select an opportunity from your dashboard and Sol will build a roadmap around it.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </DashboardShell>
    );
  }

  const { roadmap, opportunity, phases, founderSummary } = query.data;
  const sortedPhases = [...phases].sort((a, b) => a.order_index - b.order_index);

  const phasesWithTasks = sortedPhases.map((phase) => ({
    ...phase,
    tasks: [...phase.roadmap_tasks].sort((a, b) => a.order_index - b.order_index) as Task[],
  }));
  const currentPhaseIndex = phasesWithTasks.findIndex((p) =>
    p.tasks.some((t) => t.status !== "done"),
  );
  const effectiveCurrentIndex =
    currentPhaseIndex === -1 ? phasesWithTasks.length - 1 : currentPhaseIndex;
  const activeIndex = focusedIndex ?? effectiveCurrentIndex;
  const isViewingNonCurrent = activeIndex !== effectiveCurrentIndex;

  const allTasks = phasesWithTasks.flatMap((p) => p.tasks);
  const totalDone = allTasks.filter((t) => t.status === "done").length;
  const overallProgress = allTasks.length > 0 ? Math.round((totalDone / allTasks.length) * 100) : 0;
  const estimatedWeeks = Math.max(
    1,
    Math.ceil(Math.max(0, ...allTasks.map((t) => t.deadline_days_from_start)) / 7),
  );
  const activePhase = phasesWithTasks[activeIndex];
  const dueThisWeek = allTasks.filter(
    (t) => t.status !== "done" && t.deadline_days_from_start <= 7,
  ).length;
  const nextTask = phasesWithTasks
    .flatMap((p) => p.tasks)
    .find((t) => t.status !== "done" && t.required);

  return (
    <DashboardShell
      opportunityId={roadmap.opportunity_id}
      opportunityTitle={opportunity?.title ?? null}
    >
      {/* ===== TOP: EXECUTION ROADMAP HEADER ===== */}
      <p className="eyebrow text-econ-green-active">Execution Roadmap</p>
      <h1 className="mt-2 font-display text-[clamp(1.9rem,3.4vw,2.5rem)] font-semibold text-primary">
        {opportunity?.title ?? "Your Roadmap"}
      </h1>
      <p className="mt-2 max-w-xl text-[0.95rem] text-muted-foreground">
        {founderSummary
          ? `Built around your ${founderSummary.weeklyHours || "available"} hrs/week and ${formatINR(founderSummary.capitalINR)} starting capital.`
          : (opportunity?.one_liner ?? "Your personalized execution plan.")}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 sm:grid-cols-4">
        {[
          { label: "Phase", value: `${effectiveCurrentIndex + 1} / ${phasesWithTasks.length}` },
          { label: "Progress", value: `${overallProgress}%` },
          { label: "This Week", value: `${dueThisWeek} task${dueThisWeek === 1 ? "" : "s"}` },
          { label: "Estimated Path", value: `~${estimatedWeeks} wks` },
        ].map((cell) => (
          <div key={cell.label} className="bg-card px-5 py-4">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {cell.label}
            </p>
            <p className="mt-1 font-display text-[1.35rem] font-semibold text-primary">
              {cell.value}
            </p>
          </div>
        ))}
      </div>

      {nextTask && (
        <div className="mt-4 flex items-center gap-2 text-[0.82rem] text-muted-foreground">
          <span className="size-1.5 shrink-0 rounded-full bg-econ-green-active" />
          Next milestone: <span className="font-medium text-foreground">{nextTask.what}</span>
        </div>
      )}

      {/* ===== MAIN GRID: STAGE RAIL / CURRENT PHASE / CONTEXT ===== */}
      <div className="mt-9 grid gap-8 lg:grid-cols-[200px_1fr_220px]">
        {/* ===== DESKTOP: STAGE RAIL — the visual journey ===== */}
        <nav className="hidden flex-col lg:flex">
          {phasesWithTasks.map((phase, i) => {
            const done = phase.tasks.filter((t) => t.status === "done").length;
            const isDone = phase.tasks.length > 0 && done === phase.tasks.length;
            const isTrueCurrent = i === effectiveCurrentIndex;
            const isFocused = i === activeIndex;
            const isLast = i === phasesWithTasks.length - 1;
            return (
              <div key={phase.id} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setFocusedIndex(i)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                    isFocused ? "bg-econ-green-soft/40" : "hover:bg-secondary/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-semibold",
                      isDone
                        ? "border-econ-green-active bg-econ-green-active text-white"
                        : isTrueCurrent
                          ? "border-econ-green-active text-econ-green-active ring-4 ring-econ-green-active/15"
                          : "border-border text-muted-foreground/60",
                    )}
                  >
                    {isDone ? <Check className="size-3" aria-hidden="true" /> : i + 1}
                  </span>
                  <span className="flex flex-col">
                    <span
                      className={cn(
                        "text-[0.85rem] font-medium leading-tight",
                        isFocused || isTrueCurrent ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {phase.title}
                    </span>
                    {isTrueCurrent && (
                      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-econ-green-active">
                        Current
                      </span>
                    )}
                  </span>
                </button>
                {!isLast && (
                  <div
                    className={cn(
                      "ml-[1.55rem] h-4 w-px",
                      isDone ? "bg-econ-green-active/50" : "bg-border",
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </nav>

        {/* ===== DESKTOP: FOCUSED STAGE ===== */}
        {activePhase && (
          <section className="hidden lg:block">
            {isViewingNonCurrent && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-[0.78rem] text-muted-foreground">
                <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                Reviewing a {activeIndex < effectiveCurrentIndex ? "completed" : "upcoming"} stage —
                your current stage stays marked in the rail.
              </div>
            )}
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl font-semibold text-primary">
                {activePhase.title}
              </h2>
              <span className="text-[0.78rem] text-muted-foreground">
                {activePhase.tasks.filter((t) => t.status === "done").length}/
                {activePhase.tasks.length} done
              </span>
            </div>
            {activePhase.description && (
              <p className="mt-1.5 text-[0.88rem] text-muted-foreground">
                {activePhase.description}
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2.5">
              {activePhase.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  roadmapId={roadmap.id}
                  onToggle={(taskId, status) => toggleTaskMutation.mutate({ taskId, status })}
                  onReplanNeeded={refresh}
                />
              ))}
            </div>
          </section>
        )}

        {/* ===== DESKTOP: CONTEXT PANEL ===== */}
        <aside className="hidden flex-col gap-4 lg:flex">
          {nextTask && (
            <div className="rounded-xl border border-border/70 bg-card/60 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Next Milestone
              </p>
              <p className="mt-1.5 text-[0.85rem] leading-relaxed text-foreground">
                {nextTask.what}
              </p>
            </div>
          )}
          <div className="rounded-xl border border-border/70 bg-card/60 p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
              This Week
            </p>
            <p className="mt-1.5 text-[0.85rem] text-foreground">
              {dueThisWeek} task{dueThisWeek === 1 ? "" : "s"} due
            </p>
          </div>
          <AskSolStageButton />
        </aside>

        {/* ===== MOBILE: FULL VERTICAL TIMELINE ===== */}
        <div className="flex flex-col gap-8 lg:hidden">
          {phasesWithTasks.map((phase, i) => {
            const done = phase.tasks.filter((t) => t.status === "done").length;
            const isCurrent = i === effectiveCurrentIndex;
            const isDone = phase.tasks.length > 0 && done === phase.tasks.length;
            return (
              <section
                key={phase.id}
                className={cn(
                  "rounded-2xl p-5 transition-colors",
                  isCurrent
                    ? "border border-econ-green-active/30 bg-econ-green-soft/40"
                    : "border border-transparent",
                  !isCurrent && !isDone && "opacity-70",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-semibold",
                      isDone
                        ? "border-econ-green-active bg-econ-green-active text-white"
                        : isCurrent
                          ? "border-econ-green-active text-econ-green-active ring-4 ring-econ-green-active/15"
                          : "border-border text-muted-foreground/60",
                    )}
                  >
                    {isDone ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
                  </span>
                  <h2 className="font-display text-lg font-semibold text-primary">{phase.title}</h2>
                  <span className="text-[0.78rem] text-muted-foreground">
                    {done}/{phase.tasks.length} done
                  </span>
                </div>
                {phase.description && (
                  <p className="mt-1.5 pl-9 text-[0.85rem] text-muted-foreground">
                    {phase.description}
                  </p>
                )}
                <div className="mt-3 flex flex-col gap-2.5 pl-0 sm:pl-9">
                  {phase.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      roadmapId={roadmap.id}
                      onToggle={(taskId, status) => toggleTaskMutation.mutate({ taskId, status })}
                      onReplanNeeded={refresh}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
