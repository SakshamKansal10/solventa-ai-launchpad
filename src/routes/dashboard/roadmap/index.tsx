import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Briefcase,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Dumbbell,
  Flag,
  GraduationCap,
  Home,
  Laptop,
  Leaf,
  Lock,
  Loader2,
  MapPin,
  Palette,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Utensils,
  Wrench,
} from "lucide-react";
import { DashboardShell, useOpenMentor } from "@/components/dashboard/DashboardShell";
import { PageEyebrow } from "@/components/dashboard/PageEyebrow";
import { SolventiaLoadingState } from "@/components/dashboard/SolventiaLoadingState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requireAuthLoader } from "@/lib/route-guards";
import {
  generateActiveWeekDetail,
  getRoadmap,
  updateTaskStatus,
  replanRoadmap,
  type RoadmapPhaseWithTasks,
} from "@/lib/actions/roadmap";
import type { Database } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { translateDashboardText } from "@/lib/i18n/dashboard-dictionary";

export const Route = createFileRoute("/dashboard/roadmap/")({
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

/** Keyword → icon lookup for the small category badge next to the roadmap
 * title. Purely decorative visual context (no real product photos exist
 * for an idea), so a best-effort keyword match with a generic fallback is
 * enough — never worth a real classification model for this. */
const CATEGORY_ICONS: { keywords: string[]; icon: typeof Briefcase }[] = [
  { keywords: ["software", "app", "saas", "tech", "ai", "platform", "web"], icon: Laptop },
  { keywords: ["food", "restaurant", "cafe", "kitchen", "catering", "snack"], icon: Utensils },
  { keywords: ["retail", "store", "shop", "product", "goods", "ecommerce"], icon: Store },
  { keywords: ["fashion", "clothing", "design", "art", "craft"], icon: Palette },
  { keywords: ["delivery", "logistics", "transport", "supply"], icon: Truck },
  { keywords: ["fitness", "gym", "wellness", "health", "sport"], icon: Dumbbell },
  { keywords: ["education", "tutor", "course", "learning", "training"], icon: GraduationCap },
  { keywords: ["home", "furniture", "interior", "real estate", "property"], icon: Home },
  {
    keywords: [
      "repair",
      "maintenance",
      "service",
      "manufacturing",
      "desk",
      "organiser",
      "organizer",
    ],
    icon: Wrench,
  },
  { keywords: ["photography", "media", "content", "video"], icon: Camera },
  { keywords: ["farm", "agriculture", "sustainab", "eco"], icon: Leaf },
  { keywords: ["fashion accessories", "bag", "gift"], icon: ShoppingBag },
];

function CategoryIcon({ category, title }: { category: string | null; title: string | null }) {
  const haystack = `${category ?? ""} ${title ?? ""}`.toLowerCase();
  const match = CATEGORY_ICONS.find((c) => c.keywords.some((k) => haystack.includes(k)));
  const Icon = match?.icon ?? Briefcase;
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sol-violet-mist/70 text-sol-violet-deep">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

/** dependsOn is supposed to be a prior task's exact human-readable "what"
 * text (see the roadmap contract in intelligence-package.ts) — but a
 * response can still slip through with something index-shaped instead
 * (e.g. "0-0-1"). Never render that to a founder; fail closed to "no
 * visible dependency" rather than leak an internal reference. */
function isDisplayableDependency(value: string): boolean {
  return !/^\d+([.\-_]\d+)*$/.test(value.trim());
}

/** Splits a paragraph of prose into short bullet-friendly chunks —
 * numbered steps if the text already has them ("1. ... 2. ..."), otherwise
 * its sentences. Used anywhere a block of AI-written prose (mission,
 * evidence, "how", etc.) needs to render as a scannable list instead of
 * a dense paragraph. */
function splitIntoBullets(text: string): string[] {
  const numbered = text.match(/\d+[.)]\s*[^0-9]+/g);
  if (numbered && numbered.length > 1) {
    return numbered.map((s) => s.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean);
  }
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length > 1 ? sentences.slice(0, 4) : [text];
}

/** A small color-coded panel that always shows its full content — one
 * of the three fixed week callouts (worked-if / evidence / avoid), each
 * with its own accent color so the three read as distinct signal types
 * at a glance instead of three identical gray boxes. */
function InfoBox({
  icon,
  label,
  text,
  items,
  tone,
  className,
}: {
  icon: ReactNode;
  label: string;
  /** Prose to split into sentences/steps. Ignored when `items` is given. */
  text?: string;
  /** Already-discrete list items (e.g. mistakes_to_avoid) — used as-is,
   * never re-split. */
  items?: string[];
  tone: "green" | "blue" | "danger";
  className?: string;
}) {
  const bullets = items ?? splitIntoBullets(text ?? "");
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3.5",
        className,
        tone === "green" && "border-econ-green/25 bg-econ-green-soft",
        tone === "blue" && "border-blue-200 bg-blue-50",
        tone === "danger" && "border-sol-danger/25 bg-sol-danger/[0.06]",
      )}
    >
      <p
        className={cn(
          "flex items-center gap-1.5 text-[0.66rem] font-bold uppercase tracking-wide",
          tone === "green" && "text-econ-green-deep",
          tone === "blue" && "text-blue-700",
          tone === "danger" && "text-sol-danger",
        )}
      >
        {icon}
        {label}
        {items && items.length > 1 && (
          <span className="normal-case tracking-normal opacity-70">({items.length})</span>
        )}
      </p>
      <div className="mt-2 flex flex-col gap-1.5 text-[0.85rem] leading-relaxed text-sol-ink">
        {bullets.map((b, i) =>
          items ? (
            <div key={i} className="flex gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-current opacity-40" />
              {b}
            </div>
          ) : (
            <p key={i}>{b}</p>
          ),
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  index,
  roadmapId,
  isLastInWeek,
  onToggle,
  onReplanNeeded,
}: {
  task: Task;
  /** This task's 1-based position within its week — shown in the circle
   * in place of a blank checkbox, so the list reads as an ordered plan
   * rather than an unordered checklist (the circle still toggles done on
   * click, same as before, just showing "3" instead of nothing until
   * it's checked off). */
  index: number;
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
  const { locale } = useLocale();
  const tr = (s: string) => translateDashboardText(s, locale) ?? s;
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
      toast.error(tr("Sol couldn't replan your roadmap right now — try again."));
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
          <span className="text-[0.72rem] text-sol-muted">{tr("Completed")}</span>
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
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.7rem] font-semibold transition-colors",
            isDone
              ? "border-sol-champagne bg-sol-champagne text-white"
              : "border-sol-violet/40 text-sol-violet-deep hover:border-sol-violet",
          )}
          aria-label={isDone ? "Mark as not done" : "Mark complete"}
        >
          {isDone ? <Check className="size-3" aria-hidden="true" /> : index}
        </button>
        <div className="flex-1">
          {expanded && (
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-wide",
                  isDone
                    ? "bg-econ-green-soft text-econ-green-deep"
                    : "bg-sol-violet-mist text-sol-violet-deep",
                )}
              >
                {tr(isDone ? "Completed" : "In progress")} • {tr("Step")} {index}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-start justify-between gap-2 text-left"
          >
            <span className="flex flex-wrap items-center gap-2">
              <p className="line-clamp-2 text-[0.95rem] font-medium text-sol-ink">{task.what}</p>
              {!task.required && (
                <span className="rounded-full bg-sol-ivory px-2 py-0.5 text-[0.68rem] font-medium text-sol-muted">
                  {tr("Optional")}
                </span>
              )}
            </span>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-sol-violet/40 bg-white text-sol-violet-deep">
              <ChevronDown
                className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
                aria-hidden="true"
              />
            </span>
          </button>
          {!expanded && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {task.time_estimate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sol-ivory px-2 py-0.5 text-[0.76rem] text-sol-secondary">
                  <Clock className="size-3" aria-hidden="true" />
                  {task.time_estimate}
                </span>
              )}
              {task.deadline && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sol-ivory px-2 py-0.5 text-[0.76rem] text-sol-secondary">
                  <Calendar className="size-3" aria-hidden="true" />
                  {tr("Due")} {task.deadline}
                </span>
              )}
              {task.required && (
                <span className="rounded-full bg-sol-champagne-soft px-2 py-0.5 text-[0.66rem] font-semibold uppercase tracking-wide text-sol-champagne-deep">
                  {tr("Required")}
                </span>
              )}
              {!isDone && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    markDone();
                  }}
                  disabled={busy}
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-econ-green/30 bg-econ-green-soft px-2.5 py-1 text-[0.72rem] font-semibold text-econ-green-deep transition-colors hover:bg-econ-green/15"
                >
                  <Check className="size-3" aria-hidden="true" />
                  {tr("Complete")}
                </button>
              )}
            </div>
          )}
          {task.status === "blocked" && (
            <p className="mt-1 text-[0.8rem] text-sol-danger">
              {tr("Blocked — Sol has replanned what's ahead.")}
            </p>
          )}
          {task.depends_on && isDisplayableDependency(task.depends_on) && (
            <div className="mt-2 rounded-md border-l-2 border-sol-border-strong bg-sol-ivory/70 py-1.5 pl-3 pr-2 text-[0.78rem] text-sol-secondary">
              <span className="font-semibold text-sol-ink">{tr("Depends on:")}</span>{" "}
              {task.depends_on}
            </div>
          )}
          {expanded && (
            <div className="mt-4 flex flex-col gap-4 text-[0.95rem] text-sol-secondary">
              <div>
                <span className="inline-block rounded-md bg-sol-violet-mist px-2 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-sol-violet-deep">
                  {tr("Why this matters")}
                </span>
                <ul className="mt-2 flex flex-col gap-2">
                  {splitIntoBullets(task.why).map((point, i) => (
                    <li key={i} className="flex gap-2 leading-relaxed text-sol-ink">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-sol-muted" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="inline-block rounded-md bg-sol-champagne-soft px-2 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-sol-champagne-deep">
                  {tr("How")}
                </span>
                <ol className="mt-2 flex flex-col gap-2">
                  {splitIntoBullets(task.how).map((step, i) => (
                    <li key={i} className="flex gap-2 leading-relaxed text-sol-ink">
                      <span className="shrink-0 text-sol-violet-deep">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              {task.resource && (
                <div>
                  <span className="inline-block rounded-md bg-sol-violet-mist px-2 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-sol-violet-deep">
                    {tr("Resource")}
                  </span>
                  <p className="mt-2 leading-relaxed text-sol-ink">{task.resource}</p>
                </div>
              )}
              <div>
                <span className="inline-block rounded-md bg-sol-champagne-soft px-2 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-sol-champagne-deep">
                  {tr("Done when")}
                </span>
                <ul className="mt-2 flex flex-col gap-2">
                  {splitIntoBullets(task.done_when).map((point, i) => (
                    <li key={i} className="flex gap-2 leading-relaxed text-sol-ink">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-sol-muted" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {task.time_estimate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sol-ivory px-2 py-0.5 text-[0.76rem] text-sol-secondary">
                    <Clock className="size-3" aria-hidden="true" />
                    {task.time_estimate}
                  </span>
                )}
                {task.deadline && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sol-ivory px-2 py-0.5 text-[0.76rem] text-sol-secondary">
                    <Calendar className="size-3" aria-hidden="true" />
                    {tr("Due")} {task.deadline}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={markDone}
                  disabled={busy}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-4 py-2 text-[0.78rem] font-semibold transition-colors",
                    isDone
                      ? "bg-sol-ivory text-sol-muted hover:bg-sol-border"
                      : "bg-econ-green text-white shadow-sm hover:bg-econ-green-deep",
                  )}
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    !isDone && <Check className="size-3.5" aria-hidden="true" />
                  )}
                  {isDone ? tr("Mark Not Done") : tr("Mark Complete & Next")}
                  {!isDone && !busy && <ArrowRight className="size-3.5" aria-hidden="true" />}
                </button>
                {!isDone && (
                  <button
                    type="button"
                    onClick={() => setShowBlocker((v) => !v)}
                    className="self-start text-[0.82rem] font-medium text-sol-violet-deep hover:underline"
                  >
                    {tr("I'm stuck on this")}
                  </button>
                )}
              </div>
            </div>
          )}
          {showBlocker && (
            <div className="mt-3 rounded-lg border border-sol-border bg-sol-page p-3">
              <p className="text-[0.82rem] font-medium text-sol-ink">
                {tr("What got in the way?")}
              </p>
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
                    {tr(r.label)}
                  </button>
                ))}
              </div>
              <Textarea
                value={blockerNote}
                onChange={(e) => setBlockerNote(e.target.value)}
                placeholder={tr("Anything else Sol should know? (optional)")}
                className="mt-2 min-h-[60px] resize-none text-[0.9rem]"
              />
              <Button
                size="sm"
                className="mt-2"
                onClick={submitBlocked}
                disabled={!blockerReason || busy}
              >
                {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                {tr("Let Sol replan")}
              </Button>
            </div>
          )}
          {showReflectionPrompt && (
            <div className="mt-3 rounded-lg border border-sol-champagne/30 bg-sol-champagne-soft/40 p-3.5">
              <p className="text-[0.82rem] font-medium text-sol-ink">
                {tr("This finishes the week. How did it actually go?")}
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
                    {tr(r.label)}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-wide text-sol-muted">
                {tr("Anything in your way? (optional)")}
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
                    {tr(b.label)}
                  </button>
                ))}
              </div>
              <Textarea
                value={reflectionNote}
                onChange={(e) => setReflectionNote(e.target.value)}
                placeholder={tr("Anything else Sol should know? (optional)")}
                className="mt-3 min-h-[52px] resize-none text-[0.88rem]"
              />
              <div className="mt-2.5 flex items-center gap-3">
                <Button size="sm" onClick={finishWeek}>
                  {tr("Prepare Next Week")}
                  <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
                </Button>
                <button
                  type="button"
                  onClick={() => setShowReflectionPrompt(false)}
                  className="text-[0.82rem] font-medium text-sol-secondary hover:text-sol-ink"
                >
                  {tr("Cancel")}
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
  const { locale } = useLocale();
  const tr = (s: string) => translateDashboardText(s, locale) ?? s;
  const mutation = useMutation({
    mutationFn: () => generateActiveWeekDetail({ data: { weekId, locale } }),
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
            {tr("Sol couldn't prepare this week — try again.")}
          </p>
          <Button size="sm" variant="outline" onClick={() => mutation.mutate()}>
            {tr("Retry")}
          </Button>
        </div>
      ) : (
        <SolventiaLoadingState message={tr("Sol is preparing this week's mission…")} />
      )}
    </div>
  );
}

/** The single week the main workspace renders (see focusedWeek in
 * RoadmapPage) — a plain "Tasks for week N" list, no chrome around it,
 * since there's never more than one week on screen at a time any more
 * (see the Week Flow panel for where the rest live). A completed week
 * being reviewed keeps the same clean shape, plus its founder reflection
 * at the bottom. */
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
  const { locale } = useLocale();
  const tr = (s: string) => translateDashboardText(s, locale) ?? s;
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const doneCount = week.tasks.filter((t) => t.status === "done").length;
  const pendingCount = week.tasks.length - doneCount;
  const remainingCount = pendingCount;
  const stillGenerating = week.status === "active" && week.tasks.length === 0 && !week.mission;
  const hasMoreDetails =
    week.status === "active" &&
    (week.success_threshold || week.evidence_required || (week.mistakes_to_avoid?.length ?? 0) > 0);
  const visibleTasks = week.tasks.filter((t) =>
    filter === "all" ? true : filter === "done" ? t.status === "done" : t.status !== "done",
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[1.3rem] font-bold text-sol-ink">
            {tr("Tasks for week")} {week.week_number}
            <span className="rounded-full bg-sol-ivory px-2 py-0.5 text-[0.7rem] font-semibold text-sol-muted">
              {week.tasks.length} {tr("total")}
            </span>
          </h2>
          {week.objective && (
            <p className="mt-1.5 text-[0.85rem] leading-relaxed text-sol-secondary">
              {week.objective}
            </p>
          )}
        </div>
        {!stillGenerating && week.tasks.length > 0 && (
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-sol-border bg-sol-surface p-1">
            {(
              [
                ["all", tr("All"), week.tasks.length],
                ["pending", tr("Pending"), pendingCount],
                ["done", tr("Completed"), doneCount],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-full px-3 py-1 text-[0.76rem] font-medium transition-colors",
                  filter === value
                    ? "bg-sol-ink text-white"
                    : "text-sol-secondary hover:bg-sol-ivory",
                )}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      {stillGenerating && <GeneratingWeekState weekId={week.id} onDone={onWeekReady} />}

      {!stillGenerating && (
        <div className="flex flex-col gap-3">
          {visibleTasks.length === 0 && (
            <p className="rounded-xl border border-dashed border-sol-border px-4 py-6 text-center text-[0.85rem] text-sol-muted">
              {tr("Nothing here.")}
            </p>
          )}
          {visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              index={week.tasks.findIndex((t) => t.id === task.id) + 1}
              task={task}
              roadmapId={roadmapId}
              isLastInWeek={task.status !== "done" && remainingCount === 1}
              onToggle={onToggle}
              onReplanNeeded={onReplanNeeded}
            />
          ))}
        </div>
      )}

      {!stillGenerating && hasMoreDetails && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {week.success_threshold && (
            <InfoBox
              icon={<CheckCircle2 className="size-3.5" aria-hidden="true" />}
              label={tr("This week worked if…")}
              text={week.success_threshold}
              tone="green"
            />
          )}
          {week.evidence_required && (
            <InfoBox
              icon={<Flag className="size-3.5" aria-hidden="true" />}
              label={tr("Evidence to capture")}
              text={week.evidence_required}
              tone="blue"
            />
          )}
          {week.mistakes_to_avoid && week.mistakes_to_avoid.length > 0 && (
            <InfoBox
              icon={<AlertTriangle className="size-3.5" aria-hidden="true" />}
              label={tr("Avoid")}
              items={week.mistakes_to_avoid}
              tone="danger"
              // Spans both columns — its list is usually longer than the
              // other two, so pairing it beside one of them cramps it.
              className="sm:col-span-2"
            />
          )}
        </div>
      )}

      {week.status === "completed" && week.founder_reflection && (
        <div className="rounded-lg border border-sol-border bg-sol-surface px-4 py-3.5">
          <p className="text-[0.66rem] font-semibold uppercase tracking-wide text-sol-muted">
            {tr("Your reflection")}
          </p>
          <p className="mt-2 text-[0.9rem] italic leading-relaxed text-sol-ink">
            “{week.founder_reflection}”
          </p>
        </div>
      )}
    </div>
  );
}

/** The right-rail counterpart to hiding every other week from the main
 * workspace (see focusedWeek in RoadmapPage) — a vertical stepper of
 * every week in the current stage, so "how many weeks are left" and
 * "what's coming" stay visible even though only one week's full content
 * is ever on screen at a time. Clicking a completed week reviews it in
 * the main workspace in place of the current week; clicking the current
 * week (or the back link that appears while reviewing) returns to it.
 * Locked weeks are shown but not clickable — nothing to look at yet. */
function WeekFlowPanel({
  weeks,
  focusedWeekId,
  onSelectWeek,
}: {
  weeks: Week[];
  focusedWeekId: string | null;
  onSelectWeek: (weekId: string | null) => void;
}) {
  const { locale } = useLocale();
  const tr = (s: string) => translateDashboardText(s, locale) ?? s;
  const sorted = [...weeks].sort((a, b) => a.order_index - b.order_index);
  const doneWeeks = sorted.filter((w) => w.status === "completed").length;
  const weeksLeft = sorted.length - doneWeeks;

  return (
    <div className="rounded-xl border border-sol-border bg-sol-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.68rem] font-bold uppercase tracking-wide text-sol-muted">
          {tr("Week Flow")}
        </p>
        <span className="rounded-full bg-sol-violet-mist px-2 py-0.5 text-[0.72rem] font-bold text-sol-violet-deep">
          {doneWeeks} / {sorted.length}
        </span>
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-sol-border">
        <div
          className="h-full rounded-full bg-sol-violet transition-[width]"
          style={{ width: `${sorted.length > 0 ? (doneWeeks / sorted.length) * 100 : 0}%` }}
        />
      </div>
      <p className="mt-2 text-[0.72rem] text-sol-muted">
        {weeksLeft > 0
          ? `~${weeksLeft} ${tr(weeksLeft === 1 ? "week left in this stage" : "weeks left in this stage")}`
          : tr("This stage is complete.")}
      </p>
      <div className="mt-3 flex flex-col gap-1">
        {sorted.map((week) => {
          const isFocused = week.id === focusedWeekId;
          const isDone = week.status === "completed";
          const isLocked = week.status === "locked";
          const isActive = week.status === "active";
          return (
            <button
              key={week.id}
              type="button"
              disabled={isLocked}
              onClick={() => onSelectWeek(week.status === "active" ? null : week.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                isLocked ? "cursor-default opacity-60" : "hover:bg-sol-ivory",
                isFocused && "bg-sol-violet-mist/60 hover:bg-sol-violet-mist/60",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-[0.72rem] font-bold",
                  isDone
                    ? "border-sol-champagne bg-sol-champagne text-white"
                    : isActive
                      ? "border-sol-violet bg-sol-violet text-white"
                      : "border-sol-border bg-sol-ivory text-sol-muted",
                )}
              >
                {isDone ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : isLocked ? (
                  <Lock className="size-3" aria-hidden="true" />
                ) : (
                  week.week_number
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-[0.82rem] font-semibold",
                    isFocused ? "text-sol-violet-deep" : "text-sol-ink",
                  )}
                >
                  {tr("Week")} {week.week_number}
                </span>
                <span className="block truncate text-[0.72rem] text-sol-muted">{week.title}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** useOpenMentor() reads a context that only exists inside <DashboardShell>'s
 * own subtree — it must be called from a component rendered as DashboardShell's
 * child, never from RoadmapPage itself (RoadmapPage is what creates
 * DashboardShell, so it renders one level above that provider). */
function AskSolStageButton() {
  const openMentor = useOpenMentor();
  const { locale } = useLocale();
  const tr = (s: string) => translateDashboardText(s, locale) ?? s;
  return (
    <button
      type="button"
      onClick={openMentor}
      className="flex items-center justify-center gap-2 rounded-xl border border-sol-violet/25 bg-sol-violet-mist/50 px-4 py-3 text-[0.85rem] font-medium text-sol-violet-deep transition-colors hover:bg-sol-violet-mist"
    >
      <Sparkles className="size-4 text-sol-violet" aria-hidden="true" />
      {tr("Ask Sol about this stage")}
    </button>
  );
}

function RoadmapPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["roadmap"], queryFn: () => getRoadmap({ data: {} }) });
  // Which week the main workspace shows — null means "the current active
  // week" (the default, and the only thing on screen until it's done).
  // Set only by deliberately clicking a completed week in the Week Flow
  // panel to review past work.
  const [reviewWeekId, setReviewWeekId] = useState<string | null>(null);
  const { locale } = useLocale();
  const tr = (s: string) => translateDashboardText(s, locale) ?? s;

  // "No active roadmap row yet" now arrives as one of two genuinely
  // different shapes (see getRoadmap): `{ needsBuild }` means there IS a
  // real opportunity to build for — the founder just hasn't triggered (or
  // finished) generation yet — and must never render as a dead end; only
  // a bare `null` means there is truly nothing to build (no consultation
  // completed at all).
  const needsBuild = query.data && "needsBuild" in query.data ? query.data.needsBuild : null;

  useEffect(() => {
    if (!needsBuild) return;
    navigate({
      to: "/dashboard/roadmap/building",
      search: { opportunityId: needsBuild.opportunityId },
      replace: true,
    });
  }, [needsBuild, navigate]);

  // Optimistic task completion — the checkbox, progress bar, and stage
  // status must all update the instant the founder clicks, not after a
  // round trip. The mutation still persists and still rolls back on a
  // real failure; the founder just never has to wait to see it happen.
  // Built explicitly rather than extracted from typeof query.data — the
  // server function's return type unions needsBuild/null/full-data
  // branches, and this is only ever the full-data shape (the one
  // getQueryData/setQueryData actually manipulate for optimistic updates).
  type RoadmapQueryData = {
    roadmap: Database["public"]["Tables"]["roadmaps"]["Row"];
    opportunity: { title: string; one_liner: string } | null;
    phases: RoadmapPhaseWithTasks[];
    founderSummary: { weeklyHours: number; capitalAmount: number; currency: string } | null;
  };
  const toggleTaskMutation = useMutation({
    mutationFn: (vars: { taskId: string; status: "pending" | "done"; reflection?: string }) =>
      updateTaskStatus({
        data: {
          taskId: vars.taskId,
          status: vars.status,
          weekReflection: vars.reflection,
          locale,
        },
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
      toast.error(tr("Couldn't update that task — try again."));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["roadmap"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  if (query.isLoading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <SolventiaLoadingState message={tr("Opening your roadmap…")} />
        </div>
      </DashboardShell>
    );
  }

  if (!query.data || "needsBuild" in query.data) {
    if (query.data && "needsBuild" in query.data) {
      // The redirect effect above is already navigating to the building
      // flow — this is just the brief loading frame before that lands,
      // never a dead end (there IS a real opportunity to build for).
      return (
        <DashboardShell>
          <div className="flex min-h-[50vh] items-center justify-center">
            <SolventiaLoadingState message={tr("Opening your roadmap…")} />
          </div>
        </DashboardShell>
      );
    }
    // Genuinely nothing to build — no consultation completed yet. The
    // only honest empty state left: findOpportunityNeedingRoadmap (see
    // getRoadmap) already covers every other case with needsBuild above.
    return (
      <DashboardShell hasRoadmap={false}>
        <div className="mt-10 rounded-[24px] border border-sol-border bg-sol-surface px-8 py-12 text-center">
          <MapPin className="mx-auto size-8 text-sol-champagne-deep" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-bold text-sol-ink">
            {tr("No roadmap yet.")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[0.95rem] text-sol-secondary">
            {tr(
              "Complete a consultation and Sol will build a roadmap around your strongest direction.",
            )}
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">{tr("Go to Dashboard")}</Link>
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

  const activePhase = phasesWithTasks[effectiveCurrentIndex];
  // The single week the main workspace actually renders — the phase's
  // current active week by default, or whichever completed week the
  // founder deliberately picked in the Week Flow panel to review. Never
  // both, and never the full list — that's the whole point of this.
  const currentWeekInPhase = activePhase?.weeks.find((w) => w.status === "active") ?? null;
  // A past stage being previewed via the stage rail has no active week at
  // all (every week in it is completed) — default to its last completed
  // week instead of the locked-message fallback, so previewing a finished
  // stage shows real past work, not a dead end.
  const completedWeeksInPhase = activePhase?.weeks.filter((w) => w.status === "completed") ?? [];
  const defaultFocusWeek =
    currentWeekInPhase ?? completedWeeksInPhase[completedWeeksInPhase.length - 1] ?? null;
  const focusedWeek = reviewWeekId
    ? (activePhase?.weeks.find((w) => w.id === reviewWeekId) ?? defaultFocusWeek)
    : defaultFocusWeek;
  const nextTask = phasesWithTasks
    .flatMap((p) => p.tasks)
    .find((t) => t.status !== "done" && t.required);

  return (
    <DashboardShell
      opportunityId={roadmap.opportunity_id}
      opportunityTitle={opportunity?.title ?? null}
      hasRoadmap
    >
      {/* ===== TOP: EXECUTION ROADMAP HEADER ===== */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <CategoryIcon
            category={opportunity?.category ?? null}
            title={opportunity?.title ?? null}
          />
          <div>
            {focusedWeek && (
              <PageEyebrow>
                {tr("Roadmap")} · {tr("Week")} {focusedWeek.week_number} {tr("of")}{" "}
                {activePhase?.weeks.length ?? focusedWeek.week_number}
              </PageEyebrow>
            )}
            <h1 className="font-display text-[clamp(1.6rem,2.8vw,2.1rem)] font-bold text-sol-ink">
              {opportunity?.title ?? tr("Your Roadmap")}
            </h1>
          </div>
        </div>
        <Link
          to="/dashboard/roadmap/progress"
          className="mt-6 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sol-violet px-3.5 py-1.5 text-[0.75rem] font-semibold text-white shadow-sm transition-colors hover:bg-sol-violet-deep"
        >
          <BarChart3 className="size-8" aria-hidden="true" />
          {tr("View Progress")}
        </Link>
      </div>

      {nextTask && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-sol-border bg-sol-surface px-4 py-3">
          <span className="shrink-0 rounded-full bg-sol-violet-mist px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-wide text-sol-violet-deep">
            {tr("Up next")}
          </span>
          <span className="text-[0.85rem] text-sol-ink">{nextTask.what}</span>
        </div>
      )}

      {/* ===== FOCUSED PHASE WORKSPACE + CONTEXT ===== */}
      <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_220px]">
        {activePhase && (
          <section>
            <div className="flex flex-col gap-3.5">
              {activePhase.weeks.length > 0 ? (
                focusedWeek ? (
                  <>
                    {currentWeekInPhase && focusedWeek.id !== currentWeekInPhase.id && (
                      <button
                        type="button"
                        onClick={() => setReviewWeekId(null)}
                        className="flex items-center gap-1.5 self-start text-[0.78rem] font-medium text-sol-violet-deep hover:underline"
                      >
                        <ArrowLeft className="size-3.5" aria-hidden="true" />
                        {tr("Back to current week")}
                      </button>
                    )}
                    <WeekBlock
                      key={focusedWeek.id}
                      week={focusedWeek}
                      roadmapId={roadmap.id}
                      onToggle={(taskId, status, reflection) =>
                        toggleTaskMutation.mutate({ taskId, status, reflection })
                      }
                      onReplanNeeded={refresh}
                      onWeekReady={refresh}
                    />
                  </>
                ) : (
                  <p className="text-[0.85rem] text-sol-secondary">
                    {tr("Every week in this stage is locked until an earlier one finishes.")}
                  </p>
                )
              ) : (
                activePhase.tasks.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    index={i + 1}
                    task={task}
                    roadmapId={roadmap.id}
                    isLastInWeek={false}
                    onToggle={(taskId, status) => toggleTaskMutation.mutate({ taskId, status })}
                    onReplanNeeded={refresh}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {/* ===== CONTEXT PANEL (desktop only — same content isn't worth
            the extra scroll on a narrow screen where it's already one tap
            away via Ask Sol in the header) ===== */}
        <aside className="hidden flex-col gap-4 lg:flex">
          {activePhase && activePhase.weeks.length > 0 && (
            <WeekFlowPanel
              weeks={activePhase.weeks}
              focusedWeekId={focusedWeek?.id ?? null}
              onSelectWeek={setReviewWeekId}
            />
          )}
          {nextTask && (
            <div className="rounded-xl border border-sol-border bg-sol-surface p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sol-muted">
                {tr("Next Milestone")}
              </p>
              <p className="mt-1.5 text-[0.9rem] leading-relaxed text-sol-ink">{nextTask.what}</p>
            </div>
          )}
          <AskSolStageButton />
        </aside>
      </div>
    </DashboardShell>
  );
}
