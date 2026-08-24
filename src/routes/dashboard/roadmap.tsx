import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, MapPin } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
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

  function markDone() {
    onToggle(task.id, task.status === "done" ? "pending" : "done");
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

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={markDone}
          disabled={busy}
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            task.status === "done"
              ? "border-econ-green-active bg-econ-green-active text-white"
              : "border-border",
          )}
          aria-label={task.status === "done" ? "Mark as not done" : "Mark complete"}
        >
          {task.status === "done" && <Check className="size-3" aria-hidden="true" />}
        </button>
        <div className="flex-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex flex-wrap items-center gap-2 text-left"
          >
            <p
              className={cn(
                "text-[0.92rem] font-medium",
                task.status === "done" ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {task.what}
            </p>
            {!task.required && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
                Optional
              </span>
            )}
          </button>
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
            <div className="mt-2.5 flex flex-col gap-1.5 text-[0.85rem] text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Why: </span>
                {task.why}
              </p>
              <p>
                <span className="font-medium text-foreground">How: </span>
                {task.how}
              </p>
              {task.resource && (
                <p>
                  <span className="font-medium text-foreground">Resource: </span>
                  {task.resource}
                </p>
              )}
              <p>
                <span className="font-medium text-foreground">Done when: </span>
                {task.done_when}
              </p>
              <div className="mt-1 flex items-center gap-3 text-[0.78rem]">
                {task.time_estimate && <span>{task.time_estimate}</span>}
                {task.deadline && <span>Due {task.deadline}</span>}
              </div>
              <div className="mt-2 flex items-center gap-4">
                <button
                  type="button"
                  onClick={markDone}
                  disabled={busy}
                  className={cn(
                    "self-start rounded-full px-3.5 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.06em] transition-colors",
                    task.status === "done"
                      ? "bg-secondary text-muted-foreground"
                      : "bg-econ-green-active text-white hover:bg-econ-green-deep",
                  )}
                >
                  {busy && (
                    <Loader2 className="mr-1 inline size-3 animate-spin" aria-hidden="true" />
                  )}
                  {task.status === "done" ? "Mark Not Done" : "Mark Complete"}
                </button>
                {task.status !== "done" && (
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

function RoadmapPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["roadmap"], queryFn: () => getRoadmap({ data: {} }) });
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Optimistic task completion — P7: the checkbox, progress bar, and Next
  // Move must all update the instant the founder clicks, not after a round
  // trip. The mutation still persists and still gets rolled back on a real
  // failure; the founder just never has to wait to see it happen.
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
      // Reconciles with the server in the background regardless of outcome
      // — a no-op visually on success (the optimistic state already
      // matches), a correction on failure (already rolled back above, this
      // just re-syncs anything else that drifted). Also refreshes the
      // dashboard's Next Move/progress so it's not stale on next visit.
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  // A phase the founder manually focused on (clicked in the stage rail)
  // can become fully done while still focused — without this, "Current
  // stage" in the header would keep naming a phase that's actually
  // finished, since `activeIndex` prefers `focusedIndex` over the real
  // computed current stage. Snap the view forward the moment that happens,
  // so completing a stage's last task visibly advances the roadmap instead
  // of leaving it looking stuck.
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

  const { roadmap, opportunity, phases } = query.data;
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

  const allTasks = phasesWithTasks.flatMap((p) => p.tasks);
  const totalDone = allTasks.filter((t) => t.status === "done").length;
  const overallProgress = allTasks.length > 0 ? Math.round((totalDone / allTasks.length) * 100) : 0;
  const estimatedWeeks = Math.max(
    1,
    Math.ceil(Math.max(0, ...allTasks.map((t) => t.deadline_days_from_start)) / 7),
  );
  const activePhase = phasesWithTasks[activeIndex];

  return (
    <DashboardShell opportunityId={roadmap.opportunity_id}>
      <p className="eyebrow text-econ-green-active">
        Your Path to {opportunity?.title ?? "Your Business"}
      </p>
      <h1 className="mt-2 font-display text-[clamp(1.9rem,3.4vw,2.5rem)] font-semibold text-primary">
        {opportunity?.title ?? "Your Roadmap"}
      </h1>
      {opportunity?.one_liner && (
        <p className="mt-2 max-w-xl text-[0.95rem] text-muted-foreground">
          {opportunity.one_liner}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-40 rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-econ-green-active transition-[width] duration-700 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="text-[0.8rem] font-medium text-foreground">{overallProgress}%</span>
        </div>
        <span className="text-[0.8rem] text-muted-foreground">
          Current stage: <span className="font-medium text-foreground">{activePhase?.title}</span>
        </span>
        <span className="text-[0.8rem] text-muted-foreground">
          Estimated path:{" "}
          <span className="font-medium text-foreground">~{estimatedWeeks} weeks</span>
        </span>
      </div>

      <div className="mt-9 grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* ===== DESKTOP: STAGE RAIL ===== */}
        <nav className="hidden flex-col gap-1 lg:flex">
          {phasesWithTasks.map((phase, i) => {
            const done = phase.tasks.filter((t) => t.status === "done").length;
            const isDone = phase.tasks.length > 0 && done === phase.tasks.length;
            const isFocused = i === activeIndex;
            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => setFocusedIndex(i)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left transition-colors",
                  isFocused
                    ? "border-econ-green-active bg-econ-green-soft/40"
                    : "border-transparent hover:bg-secondary/50",
                )}
              >
                <span
                  className={cn(
                    "block size-1.5 shrink-0 rounded-full",
                    isDone
                      ? "bg-econ-green-active"
                      : isFocused
                        ? "bg-econ-green-active ring-4 ring-econ-green-active/15"
                        : "bg-border",
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-[0.85rem] font-medium",
                    isFocused ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {phase.title}
                </span>
                {isDone && (
                  <Check className="ml-auto size-3.5 text-econ-green-active" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </nav>

        {/* ===== DESKTOP: FOCUSED STAGE ===== */}
        {activePhase && (
          <section className="hidden lg:block">
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
                      "block size-1.5 shrink-0 rounded-full",
                      isDone
                        ? "bg-econ-green-active"
                        : isCurrent
                          ? "bg-econ-green-active ring-4 ring-econ-green-active/15"
                          : "bg-border",
                    )}
                    aria-hidden="true"
                  />
                  <h2 className="font-display text-lg font-semibold text-primary">{phase.title}</h2>
                  {isDone && (
                    <Check className="size-3.5 text-econ-green-active" aria-hidden="true" />
                  )}
                  <span className="text-[0.78rem] text-muted-foreground">
                    {done}/{phase.tasks.length} done
                  </span>
                </div>
                {phase.description && (
                  <p className="mt-1.5 pl-[1.125rem] text-[0.85rem] text-muted-foreground">
                    {phase.description}
                  </p>
                )}
                <div className="mt-3 flex flex-col gap-2.5 pl-0 sm:pl-[1.125rem]">
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
