import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  Loader2,
  MapPin,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import { DashboardShell, useOpenMentor } from "@/components/dashboard/DashboardShell";
import { SolventiaLoadingState } from "@/components/dashboard/SolventiaLoadingState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requireAuthLoader } from "@/lib/route-guards";
import {
  generateActiveWeekDetail,
  getRoadmap,
  updateTaskStatus,
  replanRoadmap,
} from "@/lib/actions/roadmap";
import { formatCompactMoney } from "@/lib/country-currency";
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

/** The week-close reflection is a compact rating, not an essay prompt —
 * this one tap is what actually shapes next week's generation (see
 * generateWeekDetail's priorWeek.reflection), so it needs to be something
 * a founder will realistically fill in every time, not something they
 * skip because typing feels like homework. */
const REFLECTION_RATINGS: { value: string; label: string }[] = [
  { value: "stronger", label: "Stronger than expected" },
  { value: "as_expected", label: "About as expected" },
  { value: "weaker", label: "Weaker than expected" },
  { value: "mixed", label: "Mixed" },
];

interface Task {
  id: string;
  week_id: string | null;
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

interface Week {
  id: string;
  order_index: number;
  week_number: number;
  title: string;
  objective: string;
  status: "locked" | "active" | "completed";
  mission: string | null;
  mistakes_to_avoid: string[] | null;
  evidence_required: string | null;
  success_threshold: string | null;
  founder_reflection: string | null;
  tasks: Task[];
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
  isLastInWeek,
  onToggle,
  onReplanNeeded,
}: {
  task: Task;
  roadmapId: string;
  /** True when completing this task would finish every task in its week
   * — completing it triggers unlocking (and generating) the next week,
   * so this is the one moment worth pausing one click longer to ask the
   * founder how the week actually went (see the inline reflection prompt
   * below) rather than the instant no-questions-asked toggle every other
   * task gets. */
  isLastInWeek: boolean;
  /** Fires immediately on click — the caller applies an optimistic cache
   * update synchronously and persists in the background (see RoadmapPage's
   * toggleTaskMutation). Never awaited here: waiting is exactly the "feels
   * like 5 seconds" problem this replaces. `reflection` is only ever sent
   * alongside marking the LAST task in a week done. */
  onToggle: (taskId: string, nextStatus: "pending" | "done", reflection?: string) => void;
  onReplanNeeded: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showBlocker, setShowBlocker] = useState(false);
  const [blockerReason, setBlockerReason] = useState<
    (typeof BLOCKER_REASONS)[number]["value"] | null
  >(null);
  const [blockerNote, setBlockerNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [showReflectionPrompt, setShowReflectionPrompt] = useState(false);
  const [reflectionRating, setReflectionRating] = useState<string | null>(null);
  const [reflectionBlocker, setReflectionBlocker] = useState<
    (typeof BLOCKER_REASONS)[number]["value"] | null
  >(null);
  const [reflectionNote, setReflectionNote] = useState("");
  const isDone = task.status === "done";

  function markDone() {
    if (isDone) {
      onToggle(task.id, "pending");
      return;
    }
    if (isLastInWeek) {
      setShowReflectionPrompt(true);
      return;
    }
    onToggle(task.id, "done");
  }

  /** Composes the tap-first structured reflection into the one plain-text
   * string generateWeekDetail's priorWeek.reflection actually reads —
   * the AI prompt contract stays a single string; only this sheet's UI
   * needs to be more than a free-text box. */
  function composeReflection(): string | undefined {
    const parts: string[] = [];
    const rating = REFLECTION_RATINGS.find((r) => r.value === reflectionRating);
    if (rating) parts.push(rating.label);
    const blocker = BLOCKER_REASONS.find((b) => b.value === reflectionBlocker);
    if (blocker) parts.push(`Blocker: ${blocker.label}`);
    if (reflectionNote.trim()) parts.push(reflectionNote.trim());
    return parts.length > 0 ? parts.join(". ") : undefined;
  }

  function finishWeek() {
    onToggle(task.id, "done", composeReflection());
    setShowReflectionPrompt(false);
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
        className="flex w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition-colors hover:border-sol-border hover:bg-sol-ivory"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sol-champagne text-white">
          <Check className="size-3" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.95rem] font-medium text-sol-ink">
            {task.what}
          </span>
          <span className="text-[0.72rem] text-sol-muted">Completed</span>
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-sol-border bg-sol-surface p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={markDone}
          disabled={busy}
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            isDone ? "border-sol-champagne bg-sol-champagne text-white" : "border-sol-border",
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
            <p className="text-[0.95rem] font-medium text-sol-ink">{task.what}</p>
            {!task.required && (
              <span className="rounded-full bg-sol-ivory px-2 py-0.5 text-[0.68rem] font-medium text-sol-muted">
                Optional
              </span>
            )}
          </button>
          {!expanded && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem] text-sol-secondary">
              {task.time_estimate && <span>{task.time_estimate}</span>}
              {task.required && <span>Required</span>}
              {task.deadline && <span>Due {task.deadline}</span>}
            </div>
          )}
          {task.status === "blocked" && (
            <p className="mt-1 text-[0.8rem] text-sol-danger">
              Blocked — Sol has replanned what's ahead.
            </p>
          )}
          {task.depends_on && isDisplayableDependency(task.depends_on) && (
            <p className="mt-1 text-[0.78rem] text-sol-secondary">
              Depends on: <span className="text-sol-ink">{task.depends_on}</span>
            </p>
          )}
          {expanded && (
            <div className="mt-3 flex flex-col gap-3 text-[0.95rem] text-sol-secondary">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sol-muted">
                  Why this matters
                </p>
                <p className="mt-1 leading-relaxed text-sol-ink">{task.why}</p>
              </div>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sol-muted">
                  How
                </p>
                <ol className="mt-1.5 flex flex-col gap-1">
                  {splitHowSteps(task.how).map((step, i) => (
                    <li key={i} className="flex gap-2 leading-relaxed text-sol-ink">
                      <span className="shrink-0 text-sol-violet-deep">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              {task.resource && (
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sol-muted">
                    Resource
                  </p>
                  <p className="mt-1 text-sol-ink">{task.resource}</p>
                </div>
              )}
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sol-muted">
                  Done when
                </p>
                <p className="mt-1 text-sol-ink">{task.done_when}</p>
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
                      ? "bg-sol-ivory text-sol-muted"
                      : "bg-sol-navy text-white hover:bg-sol-navy-soft",
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
                    className="self-start text-[0.82rem] font-medium text-sol-violet-deep hover:underline"
                  >
                    I'm stuck on this
                  </button>
                )}
              </div>
            </div>
          )}
          {showBlocker && (
            <div className="mt-3 rounded-lg border border-sol-border bg-sol-page p-3">
              <p className="text-[0.82rem] font-medium text-sol-ink">What got in the way?</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BLOCKER_REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setBlockerReason(r.value)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[0.76rem]",
                      blockerReason === r.value
                        ? "border-sol-violet bg-sol-violet-mist text-sol-violet-deep"
                        : "border-sol-border text-sol-secondary",
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
                className="mt-2 min-h-[60px] resize-none text-[0.9rem]"
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
          {showReflectionPrompt && (
            <div className="mt-3 rounded-lg border border-sol-champagne/30 bg-sol-champagne-soft/40 p-3.5">
              <p className="text-[0.82rem] font-medium text-sol-ink">
                This finishes the week. How did it actually go?
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {REFLECTION_RATINGS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReflectionRating(r.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[0.78rem] font-medium transition-colors",
                      reflectionRating === r.value
                        ? "border-sol-violet bg-sol-violet text-white"
                        : "border-sol-border bg-sol-surface text-sol-secondary hover:border-sol-violet/40",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-wide text-sol-muted">
                Anything in your way? (optional)
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {BLOCKER_REASONS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() =>
                      setReflectionBlocker((cur) => (cur === b.value ? null : b.value))
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[0.74rem] font-medium transition-colors",
                      reflectionBlocker === b.value
                        ? "border-sol-champagne bg-sol-champagne text-white"
                        : "border-sol-border bg-sol-surface text-sol-secondary hover:border-sol-champagne/40",
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <Textarea
                value={reflectionNote}
                onChange={(e) => setReflectionNote(e.target.value)}
                placeholder="Anything else Sol should know? (optional)"
                className="mt-3 min-h-[52px] resize-none text-[0.88rem]"
              />
              <div className="mt-2.5 flex items-center gap-3">
                <Button size="sm" onClick={finishWeek}>
                  Prepare Next Week
                  <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
                </Button>
                <button
                  type="button"
                  onClick={() => setShowReflectionPrompt(false)}
                  className="text-[0.82rem] font-medium text-sol-secondary hover:text-sol-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** An active week with zero tasks and no mission yet means its detail
 * generation either hasn't run or failed (see buildRoadmapForOpportunity
 * / updateTaskStatus, both of which deliberately never let a generation
 * failure become a dead end) — this is the self-healing retry for that
 * exact state. Fires automatically once on mount, and offers a manual
 * retry button if that attempt also fails. */
function GeneratingWeekState({ weekId, onDone }: { weekId: string; onDone: () => void }) {
  const mutation = useMutation({
    mutationFn: () => generateActiveWeekDetail({ data: { weekId } }),
    onSuccess: onDone,
    onError: (err) => {
      console.error("[roadmap] week detail generation failed:", err);
    },
  });

  useEffect(() => {
    mutation.mutate();
    // Deliberately fires once per mount (once per time this state is
    // actually shown) — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId]);

  return (
    <div className="mt-3 pl-[1.85rem]">
      {mutation.isError ? (
        <div className="flex items-center gap-3 rounded-lg border border-sol-border bg-sol-page p-3">
          <AlertTriangle className="size-4 shrink-0 text-sol-muted" aria-hidden="true" />
          <p className="flex-1 text-[0.85rem] text-sol-secondary">
            Sol couldn't prepare this week — try again.
          </p>
          <Button size="sm" variant="outline" onClick={() => mutation.mutate()}>
            Retry
          </Button>
        </div>
      ) : (
        <SolventiaLoadingState message="Sol is preparing this week's mission…" />
      )}
    </div>
  );
}

/** One week within the focused phase. Locked weeks show only their
 * objective — no tasks, nothing interactive — so a founder knows what's
 * coming without being able to jump ahead. Active weeks are fully
 * expanded by default; completed weeks collapse to a quiet summary line
 * but can be reopened to review past work, same spirit as a done TaskRow. */
function WeekBlock({
  week,
  roadmapId,
  onToggle,
  onReplanNeeded,
  onWeekReady,
}: {
  week: Week;
  roadmapId: string;
  onToggle: (taskId: string, nextStatus: "pending" | "done", reflection?: string) => void;
  onReplanNeeded: () => Promise<void>;
  onWeekReady: () => void;
}) {
  const [expanded, setExpanded] = useState(week.status === "active");
  const doneCount = week.tasks.filter((t) => t.status === "done").length;
  const remainingCount = week.tasks.length - doneCount;
  const stillGenerating = week.status === "active" && week.tasks.length === 0 && !week.mission;

  if (week.status === "locked") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-sol-border px-4 py-3.5 opacity-70">
        <Lock className="mt-0.5 size-4 shrink-0 text-sol-muted" aria-hidden="true" />
        <div>
          <p className="text-[0.85rem] font-medium text-sol-secondary">
            Week {week.week_number} — {week.title}
          </p>
          <p className="mt-0.5 text-[0.78rem] text-sol-muted">{week.objective}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3.5",
        week.status === "active"
          ? "border-sol-violet/30 bg-sol-violet-mist/50"
          : "border-sol-border bg-sol-surface",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          {week.status === "completed" ? (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sol-champagne text-white">
              <Check className="size-3" aria-hidden="true" />
            </span>
          ) : (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-sol-violet text-[0.65rem] font-semibold text-sol-violet-deep ring-4 ring-sol-violet/15">
              {week.week_number}
            </span>
          )}
          <div>
            <p className="text-[0.85rem] font-medium text-sol-ink">
              Week {week.week_number} — {week.title}
            </p>
            {(!expanded || week.status === "completed") && !stillGenerating && (
              <p className="text-[0.72rem] text-sol-muted">
                {doneCount}/{week.tasks.length} done
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-sol-muted transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <>
          <p className="mt-2 pl-[1.85rem] text-[0.78rem] text-sol-secondary">{week.objective}</p>

          {stillGenerating && <GeneratingWeekState weekId={week.id} onDone={onWeekReady} />}

          {/* The active week's premium workspace — 64/36 on desktop: left
              is the mission plus the tasks that make it up, right is
              everything that supports the mission without being work
              itself (threshold/evidence/what-goes-wrong). A completed
              week being reviewed later doesn't need this weight — it
              falls through to the plain stacked list below instead. */}
          {!stillGenerating && week.mission && week.status === "active" && (
            <div className="mt-3 grid gap-4 pl-0 sm:pl-[1.85rem] lg:grid-cols-[1.78fr_1fr] lg:pl-0">
              <div className="flex flex-col gap-2.5 lg:pl-[1.85rem]">
                <div className="rounded-lg border border-sol-champagne/30 bg-sol-champagne-soft/40 px-3.5 py-3">
                  <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-sol-champagne-deep">
                    <Target className="size-3.5" aria-hidden="true" />
                    Mission
                  </p>
                  <p className="mt-1 text-[0.95rem] leading-relaxed text-sol-ink">{week.mission}</p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {week.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      roadmapId={roadmapId}
                      isLastInWeek={task.status !== "done" && remainingCount === 1}
                      onToggle={onToggle}
                      onReplanNeeded={onReplanNeeded}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {week.success_threshold && (
                  <div className="rounded-lg border border-sol-border bg-sol-surface px-3.5 py-3">
                    <p className="text-[0.66rem] font-semibold uppercase tracking-wide text-sol-muted">
                      This week worked if…
                    </p>
                    <p className="mt-1 text-[0.9rem] leading-relaxed text-sol-ink">
                      {week.success_threshold}
                    </p>
                  </div>
                )}
                {week.evidence_required && (
                  <div className="rounded-lg border border-sol-border bg-sol-surface px-3.5 py-3">
                    <p className="text-[0.66rem] font-semibold uppercase tracking-wide text-sol-muted">
                      Evidence to capture
                    </p>
                    <p className="mt-1 text-[0.9rem] leading-relaxed text-sol-ink">
                      {week.evidence_required}
                    </p>
                  </div>
                )}
                {week.mistakes_to_avoid && week.mistakes_to_avoid.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-wide text-sol-champagne-deep">
                      <ShieldAlert className="size-3.5" aria-hidden="true" />
                      Avoid
                    </p>
                    <div className="mt-1.5 flex flex-col gap-2">
                      {week.mistakes_to_avoid.map((m, i) => (
                        <div
                          key={i}
                          className="shrink-0 rounded-xl border border-sol-champagne/30 bg-sol-ivory px-3.5 py-3"
                        >
                          <p className="text-[0.85rem] leading-relaxed text-sol-ink">{m}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!stillGenerating && !(week.mission && week.status === "active") && (
            <div className="mt-3 flex flex-col gap-2.5 pl-0 sm:pl-[1.85rem]">
              {week.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  roadmapId={roadmapId}
                  isLastInWeek={task.status !== "done" && remainingCount === 1}
                  onToggle={onToggle}
                  onReplanNeeded={onReplanNeeded}
                />
              ))}
            </div>
          )}

          {week.status === "completed" && week.founder_reflection && (
            <div className="mt-3 rounded-lg border border-sol-border bg-sol-surface px-3.5 py-3 sm:ml-[1.85rem]">
              <p className="text-[0.66rem] font-semibold uppercase tracking-wide text-sol-muted">
                Your reflection
              </p>
              <p className="mt-1 text-[0.9rem] italic leading-relaxed text-sol-ink">
                “{week.founder_reflection}”
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
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
      className="flex items-center justify-center gap-2 rounded-xl border border-sol-violet/25 bg-sol-violet-mist/50 px-4 py-3 text-[0.85rem] font-medium text-sol-violet-deep transition-colors hover:bg-sol-violet-mist"
    >
      <Sparkles className="size-4 text-sol-violet" aria-hidden="true" />
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
    mutationFn: (vars: { taskId: string; status: "pending" | "done"; reflection?: string }) =>
      updateTaskStatus({
        data: { taskId: vars.taskId, status: vars.status, weekReflection: vars.reflection },
      }),
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
            // Weeks carry their own copy of each task (see getRoadmap) —
            // patch both so the week-tier UI updates optimistically too.
            // A newly-unlocked next week only appears after the
            // server round-trip (onSettled refetches "roadmap" below).
            roadmap_weeks: phase.roadmap_weeks.map((week) => ({
              ...week,
              roadmap_tasks: week.roadmap_tasks.map((t) =>
                t.id === vars.taskId ? { ...t, status: vars.status } : t,
              ),
            })),
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
        <div className="flex min-h-[50vh] items-center justify-center">
          <SolventiaLoadingState message="Opening your roadmap…" />
        </div>
      </DashboardShell>
    );
  }

  if (!query.data) {
    return (
      <DashboardShell hasRoadmap={false}>
        <div className="mt-10 rounded-[24px] border border-sol-border bg-sol-surface px-8 py-12 text-center">
          <MapPin className="mx-auto size-8 text-sol-champagne-deep" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-semibold text-sol-ink">No roadmap yet.</h2>
          <p className="mx-auto mt-2 max-w-md text-[0.95rem] text-sol-secondary">
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
    // Empty for a roadmap generated before the week-unlock migration — the
    // UI falls back to the flat `tasks` list above in that case (see the
    // two render sites below).
    weeks: [...phase.roadmap_weeks]
      .sort((a, b) => a.order_index - b.order_index)
      .map((week) => ({
        ...week,
        tasks: [...week.roadmap_tasks].sort((a, b) => a.order_index - b.order_index) as Task[],
      })) as Week[],
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
  const allWeeks = phasesWithTasks.flatMap((p) => p.weeks);
  // deadline_days_from_start is WEEK-relative (0-6) since just-in-time
  // generation — every week's tasks reset to day 0 when THAT week
  // unlocks, not day 0 of the whole roadmap (see roadmap-persistence
  // .server.ts). So the real "how long is this path" answer is the
  // skeleton's actual week COUNT, not a days-based estimate — that
  // stopped meaning anything the moment deadlines became per-week. Only
  // a legacy pre-JIT roadmap (allWeeks empty, flat tasks with genuinely
  // roadmap-relative days) still uses the old days-based estimate.
  const estimatedWeeks =
    allWeeks.length > 0
      ? allWeeks.length
      : Math.max(1, Math.ceil(Math.max(0, ...allTasks.map((t) => t.deadline_days_from_start)) / 7));
  const activePhase = phasesWithTasks[activeIndex];
  // "Due this week" is literally the active week's own pending tasks now
  // — under JIT generation there is only ever one unlocked week with
  // pending work at a time, so this is exact, not a days-based guess.
  const activeWeekTasks = allWeeks.find((w) => w.status === "active")?.tasks;
  const dueThisWeek = activeWeekTasks
    ? activeWeekTasks.filter((t) => t.status !== "done").length
    : allTasks.filter((t) => t.status !== "done" && t.deadline_days_from_start <= 7).length;
  const nextTask = phasesWithTasks
    .flatMap((p) => p.tasks)
    .find((t) => t.status !== "done" && t.required);

  return (
    <DashboardShell
      opportunityId={roadmap.opportunity_id}
      opportunityTitle={opportunity?.title ?? null}
      hasRoadmap
      pageTitle="Roadmap"
    >
      {/* ===== TOP: EXECUTION ROADMAP HEADER ===== */}
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sol-champagne-deep">
        Execution Roadmap
      </p>
      <h1 className="mt-2 font-display text-[clamp(1.9rem,3.4vw,2.5rem)] font-semibold text-sol-ink">
        {opportunity?.title ?? "Your Roadmap"}
      </h1>
      {/* North Star — the one-sentence "what this is building toward,"
          generated once alongside the skeleton. Absent for a roadmap
          built before this existed; the line simply doesn't render. */}
      {roadmap.north_star && (
        <p className="mt-2 max-w-2xl font-display text-[1.05rem] italic leading-snug text-sol-ink">
          {roadmap.north_star}
        </p>
      )}
      <p className="mt-2 max-w-xl text-[0.98rem] text-sol-secondary">
        {founderSummary
          ? `Built around your ${founderSummary.weeklyHours || "available"} hrs/week and ${formatCompactMoney(founderSummary.capitalAmount, founderSummary.currency)} starting capital.`
          : (opportunity?.one_liner ?? "Your personalized execution plan.")}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-sol-border bg-sol-border sm:grid-cols-4">
        {[
          { label: "Phase", value: `${effectiveCurrentIndex + 1} / ${phasesWithTasks.length}` },
          { label: "Progress", value: `${overallProgress}%` },
          { label: "This Week", value: `${dueThisWeek} task${dueThisWeek === 1 ? "" : "s"}` },
          { label: "Estimated Path", value: `~${estimatedWeeks} wks` },
        ].map((cell) => (
          <div key={cell.label} className="bg-sol-surface px-5 py-4">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-sol-muted">
              {cell.label}
            </p>
            <p className="mt-1 font-display text-[1.35rem] font-semibold text-sol-ink">
              {cell.value}
            </p>
          </div>
        ))}
      </div>

      {nextTask && (
        <div className="mt-4 flex items-center gap-2 text-[0.85rem] text-sol-secondary">
          <span className="size-1.5 shrink-0 rounded-full bg-sol-champagne" />
          Next milestone: <span className="font-medium text-sol-ink">{nextTask.what}</span>
        </div>
      )}

      {/* ===== HORIZONTAL STAGE/PHASE NAVIGATOR — one strip, every
          breakpoint. Violet = current, champagne = completed, neutral
          border/text = future. Never green. Scrolls horizontally on
          narrow screens instead of collapsing into a second, different
          mobile layout. Clicking a future phase only changes which
          phase's skeleton is previewed below — it never triggers
          generation; that only ever happens when a week actually
          unlocks (see updateTaskStatus / generateActiveWeekDetail). ===== */}
      <nav className="mt-9 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Roadmap phases">
        {phasesWithTasks.map((phase, i) => {
          const done = phase.tasks.filter((t) => t.status === "done").length;
          const isDone = phase.tasks.length > 0 && done === phase.tasks.length;
          const isTrueCurrent = i === effectiveCurrentIndex;
          const isFocused = i === activeIndex;
          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => setFocusedIndex(i)}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-full border px-4 py-2.5 text-left transition-colors",
                isFocused
                  ? "border-sol-violet bg-sol-violet-mist/60"
                  : "border-sol-border bg-sol-surface hover:border-sol-violet/30",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-semibold",
                  isDone
                    ? "border-sol-champagne bg-sol-champagne text-white"
                    : isTrueCurrent
                      ? "border-sol-violet text-sol-violet-deep ring-4 ring-sol-violet/15"
                      : "border-sol-border text-sol-muted",
                )}
              >
                {isDone ? <Check className="size-3" aria-hidden="true" /> : i + 1}
              </span>
              <span className="flex flex-col">
                <span
                  className={cn(
                    "whitespace-nowrap text-[0.85rem] font-medium leading-tight",
                    isFocused || isTrueCurrent ? "text-sol-ink" : "text-sol-secondary",
                  )}
                >
                  {phase.title}
                </span>
                {isTrueCurrent && (
                  <span className="text-[0.62rem] font-semibold uppercase tracking-wide text-sol-violet-deep">
                    Current
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ===== FOCUSED PHASE WORKSPACE + CONTEXT ===== */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_220px]">
        {activePhase && (
          <section>
            {isViewingNonCurrent && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-sol-ivory px-3 py-2 text-[0.8rem] text-sol-secondary">
                <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                Previewing a {activeIndex < effectiveCurrentIndex ? "completed" : "upcoming"} stage
                — your current stage stays marked in the navigator above.
              </div>
            )}
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl font-semibold text-sol-ink">
                {activePhase.title}
              </h2>
              <span className="text-[0.8rem] text-sol-secondary">
                {activePhase.tasks.filter((t) => t.status === "done").length}/
                {activePhase.tasks.length} done
              </span>
            </div>
            {activePhase.description && (
              <p className="mt-1.5 text-[0.92rem] text-sol-secondary">{activePhase.description}</p>
            )}
            <div className="mt-4 flex flex-col gap-2.5">
              {activePhase.weeks.length > 0
                ? activePhase.weeks.map((week) => (
                    <WeekBlock
                      key={week.id}
                      week={week}
                      roadmapId={roadmap.id}
                      onToggle={(taskId, status, reflection) =>
                        toggleTaskMutation.mutate({ taskId, status, reflection })
                      }
                      onReplanNeeded={refresh}
                      onWeekReady={refresh}
                    />
                  ))
                : activePhase.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      roadmapId={roadmap.id}
                      isLastInWeek={false}
                      onToggle={(taskId, status) => toggleTaskMutation.mutate({ taskId, status })}
                      onReplanNeeded={refresh}
                    />
                  ))}
            </div>
          </section>
        )}

        {/* ===== CONTEXT PANEL (desktop only — same content isn't worth
            the extra scroll on a narrow screen where it's already one tap
            away via Ask Sol in the header) ===== */}
        <aside className="hidden flex-col gap-4 lg:flex">
          {nextTask && (
            <div className="rounded-xl border border-sol-border bg-sol-surface p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sol-muted">
                Next Milestone
              </p>
              <p className="mt-1.5 text-[0.9rem] leading-relaxed text-sol-ink">{nextTask.what}</p>
            </div>
          )}
          <div className="rounded-xl border border-sol-border bg-sol-surface p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sol-muted">
              This Week
            </p>
            <p className="mt-1.5 text-[0.9rem] text-sol-ink">
              {dueThisWeek} task{dueThisWeek === 1 ? "" : "s"} due
            </p>
          </div>
          <AskSolStageButton />
        </aside>
      </div>
    </DashboardShell>
  );
}
