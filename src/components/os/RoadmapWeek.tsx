import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { ReviewWeekDialog } from "@/components/founder/roadmap/ReviewWeekDialog";
import type { useRoadmapText } from "@/components/founder/roadmap/text";
import {
  addProofEvidence,
  generateAssumptions,
  getProofOverview,
  type EVIDENCE_TYPES,
} from "@/lib/actions/proof";
import { retryWeek, setMissionState, type CloseWeekResult } from "@/lib/actions/roadmap";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useInvalidateFounder } from "@/lib/queries";
import type { MissionState } from "@/lib/roadmap/state";
import {
  applyMissionState,
  type MissionDTO,
  type RoadmapView,
  type WeekDTO,
} from "@/lib/roadmap/view";
import { cn } from "@/lib/utils";

import { ActionArrow, OsEyebrow, OsPoints, primaryActionClass, textActionClass } from "./os";

type RoadmapText = ReturnType<typeof useRoadmapText>;

/** A quiet bordered action for secondary steps inside a mission. */
const quietActionClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#171A27]/15 bg-white px-6 text-[1rem] font-semibold text-[#171A27] transition-colors hover:border-[#171A27]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F62D9] disabled:pointer-events-none disabled:opacity-60";

/**
 * THIS WEEK'S MISSIONS — a short list, not a board. The active mission is open (why, how, what
 * done looks like, and — when it needs proof — one plain question: what did you learn?); the
 * rest stay one calm line each. Starting and finishing are one action each; the server still
 * refuses to finish a mission that needs evidence until something real was recorded.
 */
export function RoadmapWeek({
  view,
  week,
  text,
  opportunityId,
  isCurrent,
  nextWeekNumber,
  focus,
  onWeekChanged,
  onBackToNow,
}: {
  view: RoadmapView;
  week: WeekDTO;
  text: RoadmapText;
  opportunityId: string;
  /** Whether this is the founder's active week (vs a completed one being read back). */
  isCurrent: boolean;
  nextWeekNumber: number | null;
  /** A mission the page asked to bring forward (opened and scrolled to; started if asked). */
  focus: { id: string; nonce: number; start: boolean } | null;
  onWeekChanged: (result: CloseWeekResult) => void;
  onBackToNow: () => void;
}) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFounder();
  const [review, setReview] = useState(false);
  const roadmapKey = qk.roadmap(view.roadmap.id);

  const setState = useMutation({
    mutationFn: (v: { taskId: string; state: MissionState }) =>
      setMissionState({ data: { taskId: v.taskId, state: v.state } }),
    // Optimistic: the row responds instantly; the server confirms or we roll back.
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: roadmapKey });
      const previous = queryClient.getQueryData<RoadmapView | null>(roadmapKey);
      if (previous)
        queryClient.setQueryData(roadmapKey, applyMissionState(previous, v.taskId, v.state));
      return { previous };
    },
    onError: (err, _v, ctx) => {
      console.error("[roadmap] mission update failed:", err);
      if (ctx?.previous) queryClient.setQueryData(roadmapKey, ctx.previous);
      toast.error(
        err instanceof Error && err.message.includes("EVIDENCE_REQUIRED")
          ? t("rm.mission.needEvidenceError")
          : t("rm.mission.error"),
      );
    },
    onSettled: () => {
      void invalidate();
    },
  });

  const retry = useMutation({
    mutationFn: () => retryWeek({ data: { weekId: week.id, locale } }),
    onSuccess: async (res) => {
      await invalidate();
      if (res.result === "in_progress") toast.message(t("rm.gen.inProgress"));
    },
    onError: (err) => {
      console.error("[roadmap] week retry failed:", err);
      toast.error(t("rm.gen.retryError"));
    },
  });

  const locked = week.state === "completed" || !isCurrent;
  // The one mission that starts open: whatever is in progress, otherwise the first required
  // mission still waiting, otherwise the first one left.
  const activeId =
    week.missions.find((m) => m.state === "in_progress")?.id ??
    week.missions.find((m) => m.state === "not_started" && m.required)?.id ??
    week.missions.find((m) => m.state !== "completed")?.id ??
    null;
  const pad = String(week.number).padStart(2, "0");
  const adaptation = text.detail.adaptationNote(week.adaptationNote);

  return (
    <section
      className="flex flex-col gap-8"
      data-testid="week-tab"
      data-week-state={week.state}
      aria-labelledby="week-missions-h"
      id="week-missions"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-t border-[#171A27]/10 pt-10">
        <div className="flex flex-col gap-2">
          <OsEyebrow tone="champagne">
            {isCurrent ? t("os.rm.missions") : t("os.rm.viewingWeek", { n: pad })}
          </OsEyebrow>
          <h2
            id="week-missions-h"
            className="font-os text-[clamp(1.5rem,1.15rem+1vw,2.1rem)] font-medium uppercase leading-[1.02] tracking-[-0.02em] text-[#171A27]"
            data-testid="week-title"
          >
            {text.weekTitle(week.id, week.title)}
          </h2>
        </div>
        <div className="flex items-center gap-6">
          {week.hasDetail && (
            <p
              className="text-[1.0625rem] font-semibold text-[#171A27]"
              data-testid="week-progress"
            >
              {t("os.rm.progress", { x: week.progress.completed, y: week.progress.total })}
            </p>
          )}
          {!isCurrent && (
            <button type="button" onClick={onBackToNow} className={textActionClass}>
              {t("os.rm.backToNow")}
              <ActionArrow />
            </button>
          )}
        </div>
      </div>

      {adaptation && (
        <div
          className="flex flex-col gap-2 border-l-2 border-[#B8924F] pl-5"
          data-testid="adaptation-note"
        >
          <OsEyebrow tone="champagne">{t("os.rm.changed")}</OsEyebrow>
          <p className="max-w-[62ch] text-[1.125rem] leading-relaxed text-[#171A27]">
            {adaptation}
          </p>
        </div>
      )}

      {week.state === "generating_next" ? (
        <div className="flex flex-col items-start gap-4" data-testid="week-generating">
          {week.generationStatus === "failed" ? (
            <>
              <p className="text-[1.375rem] font-semibold text-[#171A27]">
                {t("rm.gen.failedTitle", { n: pad })}
              </p>
              <p className="max-w-[60ch] text-[1.0625rem] text-[#2A2F3B]">
                {t("rm.gen.failedBody")}
              </p>
              <button
                type="button"
                className={primaryActionClass}
                onClick={() => retry.mutate()}
                disabled={retry.isPending}
                data-testid="retry-week"
              >
                {retry.isPending && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
                {t("rm.gen.retry")}
              </button>
            </>
          ) : (
            <>
              <p className="flex items-center gap-3 text-[1.375rem] font-semibold text-[#171A27]">
                <Loader2 className="size-5 animate-spin text-[#2F62D9]" aria-hidden="true" />
                {t("rm.gen.preparingTitle", { n: pad })}
              </p>
              <p role="status" className="max-w-[60ch] text-[1.0625rem] text-[#2A2F3B]">
                {t("rm.gen.preparingBody")}
              </p>
            </>
          )}
        </div>
      ) : week.state === "locked" ? (
        <p className="text-[1.125rem] text-[#2A2F3B]">{t("os.rm.locked")}</p>
      ) : (
        <>
          {week.state === "ready_to_close" && isCurrent && (
            <div
              className="flex flex-col items-start gap-4 rounded-[24px] border border-[#B8924F]/50 bg-[#FBF8F2] p-6 sm:p-8"
              data-testid="ready-to-close"
            >
              <p className="font-os text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] font-medium uppercase leading-[1.02] tracking-[-0.02em] text-[#171A27]">
                {t("os.rm.ready.title")}
              </p>
              <p className="max-w-[56ch] text-[1.0625rem] text-[#2A2F3B]">
                {t("os.rm.ready.body")}
              </p>
              <button
                type="button"
                className={primaryActionClass}
                onClick={() => setReview(true)}
                data-testid="review-week"
              >
                {t("rm.week.review")}
                <ActionArrow />
              </button>
            </div>
          )}
          <ol
            className="flex flex-col border-t border-[#171A27]/10"
            aria-label={t("rm.missions.aria")}
          >
            {week.missions.map((m, i) => (
              <li key={m.id}>
                <MissionRow
                  mission={m}
                  index={i}
                  text={text.detail.mission(m.id)}
                  opportunityId={opportunityId}
                  weekId={week.id}
                  busy={setState.isPending && setState.variables?.taskId === m.id}
                  locked={locked}
                  defaultOpen={m.id === activeId && !locked}
                  focus={focus?.id === m.id ? focus : null}
                  onState={(state) => setState.mutate({ taskId: m.id, state })}
                />
              </li>
            ))}
          </ol>
        </>
      )}

      {isCurrent && week.state === "ready_to_close" && (
        <ReviewWeekDialog
          open={review}
          onOpenChange={setReview}
          week={week}
          nextWeekNumber={nextWeekNumber}
          onDone={(result) => {
            void invalidate();
            onWeekChanged(result);
          }}
        />
      )}
    </section>
  );
}

interface MissionText {
  title?: string;
  why?: string;
  doneWhen?: string;
  timeEstimate?: string;
  steps?: string[];
}

function MissionRow({
  mission,
  index,
  text,
  opportunityId,
  weekId,
  busy,
  locked,
  defaultOpen,
  focus,
  onState,
}: {
  mission: MissionDTO;
  index: number;
  text?: MissionText;
  opportunityId: string;
  weekId: string;
  busy: boolean;
  /** A completed week's missions are read-only history. */
  locked: boolean;
  defaultOpen: boolean;
  /** Set (with a fresh nonce) whenever the page brings this mission forward. */
  focus: { nonce: number; start: boolean } | null;
  onState: (state: MissionState) => void;
}) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLElement>(null);
  const bodyId = useId();
  const title = text?.title ?? mission.title;
  const steps = (text?.steps && text.steps.length > 0 ? text.steps : mission.steps).slice(0, 4);
  const time = text?.timeEstimate ?? mission.timeEstimate;
  const done = mission.state === "completed";
  const inProgress = mission.state === "in_progress";
  const needsEvidence = mission.evidenceRequired && mission.evidenceCount === 0;
  const pad = String(index + 1).padStart(2, "0");
  const completedOn = mission.completedAt
    ? new Date(mission.completedAt).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
        day: "numeric",
        month: "short",
      })
    : null;

  // Brought forward (the hero's action, or a link to this mission): open it and scroll it into
  // view; the hero's "Start mission" also starts it if it is still waiting.
  useEffect(() => {
    if (focus === null) return;
    setOpen(true);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focus.start && mission.state === "not_started" && !locked) onState("in_progress");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  const primary = (() => {
    if (locked || done) return null;
    if (mission.state === "not_started")
      return (
        <button
          type="button"
          className={primaryActionClass}
          disabled={busy}
          data-testid="mission-primary"
          onClick={() => {
            onState("in_progress");
            setOpen(true);
          }}
        >
          {t("rm.mission.start")}
          <ActionArrow />
        </button>
      );
    if (!open)
      return (
        <button
          type="button"
          className={quietActionClass}
          data-testid="mission-primary"
          onClick={() => setOpen(true)}
        >
          {t("rm.mission.continue")}
        </button>
      );
    return (
      <button
        type="button"
        className={primaryActionClass}
        disabled={busy || needsEvidence}
        data-testid="mission-complete"
        title={needsEvidence ? t("os.rm.learn.needed") : undefined}
        onClick={() => onState("completed")}
      >
        {t("rm.mission.markComplete")}
        <Check className="size-5" aria-hidden="true" />
      </button>
    );
  })();

  return (
    <article
      ref={ref}
      data-testid="mission-card"
      data-state={mission.state}
      data-evidence={mission.evidenceCount}
      data-open={open}
      aria-label={title}
      className="scroll-mt-28 border-b border-[#171A27]/10"
    >
      <div className="flex items-center gap-4 py-5 sm:gap-6 sm:py-6">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full font-os text-[0.9375rem] font-medium",
            done && "bg-[#B8924F] text-white",
            inProgress && "border-2 border-[#B8924F] text-[#171A27]",
            !done && !inProgress && "border border-[#171A27]/20 text-[#3C4250]",
          )}
        >
          {done ? <Check className="size-5" strokeWidth={2.5} /> : pad}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="[font-family:inherit]">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={bodyId}
              data-testid="mission-toggle"
              className={cn(
                "block w-full text-left text-[1.1875rem] font-semibold leading-snug focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2F62D9] sm:text-[1.3125rem]",
                done ? "text-[#454B59]" : "text-[#171A27]",
              )}
            >
              {title}
            </button>
          </h3>
          <p className="mt-1 flex flex-wrap gap-x-2 text-[0.9375rem] font-medium text-[#454B59]">
            {time && <span>{time}</span>}
            {!mission.required && <span>· {t("common.optional")}</span>}
            {inProgress && !open && (
              <span className="text-[#7A5B2B]">· {t("rm.mission.in_progress")}</span>
            )}
            {done && (
              <span className="text-[#7A5B2B]">
                ·{" "}
                {completedOn
                  ? t("rm.mission.completedOn", { date: completedOn })
                  : t("rm.mission.completed")}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={`${title} — ${open ? t("rm.mission.collapse") : t("rm.mission.expand")}`}
            tabIndex={-1}
            className="flex size-10 items-center justify-center rounded-full text-[#171A27] hover:bg-[#171A27]/[0.05]"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn("size-5 transition-transform duration-300", open && "rotate-180")}
            />
          </button>
        </div>
      </div>

      {open && (
        <div id={bodyId} className="flex flex-col gap-7 pb-8 pl-0 sm:pl-[4.25rem]">
          <dl className="grid max-w-[64ch] gap-6" data-testid="mission-details">
            <div className="flex flex-col gap-1.5">
              <dt className="text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250]">
                {t("rm.mission.whyShort")}
              </dt>
              <dd className="text-[1.0625rem] leading-relaxed text-[#2A2F3B]">
                {text?.why ?? mission.why}
              </dd>
            </div>
            {steps.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <dt className="text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250]">
                  {t("rm.mission.do")}
                </dt>
                <dd>
                  <OsPoints points={steps} />
                </dd>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <dt className="text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#7A5B2B]">
                {t("os.rm.doneWhen")}
              </dt>
              <dd className="text-[1.0625rem] font-semibold leading-snug text-[#171A27]">
                {text?.doneWhen ?? mission.doneWhen}
              </dd>
            </div>
          </dl>

          {/* Once the mission is under way, the one question that turns it into evidence. */}
          {mission.evidenceRequired && inProgress && !locked && (
            <LearningCapture mission={mission} opportunityId={opportunityId} weekId={weekId} />
          )}

          {!locked && (
            <div className="flex flex-col items-start gap-3">
              <div className="flex flex-wrap items-center gap-4">
                {primary}
                {done && (
                  <button
                    type="button"
                    className={textActionClass}
                    disabled={busy}
                    data-testid="mission-reopen"
                    onClick={() => onState("in_progress")}
                  >
                    {t("rm.mission.reopen")}
                  </button>
                )}
              </div>
              {needsEvidence && inProgress && (
                <p
                  className="text-[0.9375rem] font-medium text-[#454B59]"
                  data-testid="mission-evidence-hint"
                >
                  {t("os.rm.learn.needed")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

type EvidenceType = (typeof EVIDENCE_TYPES)[number];
const KINDS = [
  "interview",
  "quote",
  "payment",
  "observation",
] as const satisfies readonly EvidenceType[];
const SIGNALS = ["supports", "neutral", "contradicts"] as const;

/**
 * "What did you learn?" — the one question that turns a conversation into evidence. Saved
 * against this mission (and the assumption it tests), so the founder never manages a database;
 * the first time, the founder's assumptions are set up exactly as the Proof workspace does.
 */
function LearningCapture({
  mission,
  opportunityId,
  weekId,
}: {
  mission: MissionDTO;
  opportunityId: string;
  weekId: string;
}) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFounder();
  const [adding, setAdding] = useState(mission.evidenceCount === 0);
  const [summary, setSummary] = useState("");
  const [who, setWho] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("interview");
  const [signal, setSignal] = useState<(typeof SIGNALS)[number]>("supports");
  const fieldId = useId();

  const save = useMutation({
    mutationFn: async () => {
      const load = () =>
        queryClient.fetchQuery({
          queryKey: qk.proof(opportunityId),
          queryFn: () => getProofOverview({ data: { opportunityId } }),
        });
      let overview = await load();
      if (!overview.available) throw new Error("PROOF_UNAVAILABLE");
      if (overview.assumptions.length === 0) {
        await generateAssumptions({ data: { opportunityId, locale } });
        await queryClient.invalidateQueries({ queryKey: qk.proof(opportunityId) });
        overview = await load();
      }
      const assumption =
        overview.assumptions.find((a) => a.category === mission.assumptionCategory) ??
        overview.assumptions[0];
      if (!assumption) throw new Error("NO_ASSUMPTION");
      return addProofEvidence({
        data: {
          opportunityId,
          assumptionId: assumption.id,
          evidenceType: kind,
          summary: summary.trim(),
          signal,
          sourcePerson: who.trim() || undefined,
          taskId: mission.id,
          weekId,
        },
      });
    },
    onSuccess: async () => {
      setSummary("");
      setWho("");
      setAdding(false);
      toast.success(t("os.rm.learn.saved"));
      await invalidate();
    },
    onError: (err) => {
      console.error("[roadmap] saving a learning failed:", err);
      toast.error(t("os.rm.learn.error"));
    },
  });

  if (!adding)
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2" data-testid="mission-learning">
        <p className="flex items-center gap-2 text-[1.0625rem] font-semibold text-[#171A27]">
          <Check className="size-5 text-[#B8924F]" aria-hidden="true" />
          {t("os.rm.learn.count", { n: mission.evidenceCount })}
        </p>
        <button type="button" className={textActionClass} onClick={() => setAdding(true)}>
          {t("os.rm.learn.another")}
        </button>
      </div>
    );

  const chip =
    "inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[#171A27]/15 bg-white px-4 text-[0.9375rem] font-semibold text-[#171A27] transition-colors peer-checked:border-[#0B1F3B] peer-checked:bg-[#0B1F3B] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#2F62D9]";

  return (
    <form
      className="flex max-w-[44rem] flex-col gap-5 rounded-[24px] border border-[#171A27]/10 bg-white p-5 sm:p-7"
      data-testid="mission-learning"
      onSubmit={(e) => {
        e.preventDefault();
        if (summary.trim() && !save.isPending) save.mutate();
      }}
    >
      <label htmlFor={`${fieldId}-what`} className="flex flex-col gap-3">
        <span className="font-os text-[1.375rem] font-medium uppercase leading-none tracking-[-0.01em] text-[#171A27]">
          {t("os.rm.learn.title")}
        </span>
      </label>
      <textarea
        id={`${fieldId}-what`}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={3}
        maxLength={2000}
        required
        placeholder={t("os.rm.learn.placeholder")}
        data-testid="learning-summary"
        className="w-full resize-y rounded-2xl border border-[#171A27]/15 bg-[#FCFAF7] px-4 py-3 text-[1.0625rem] leading-relaxed text-[#171A27] placeholder:text-[#5B6170] focus-visible:border-[#2F62D9] focus-visible:outline-none disabled:opacity-60"
      />
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250]">
          {t("os.rm.learn.kind")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <label key={k}>
              <input
                type="radio"
                name={`${fieldId}-kind`}
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="peer sr-only"
              />
              <span className={chip}>{t(`os.rm.learn.kind.${k}` as const)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250]">
          {t("os.rm.learn.signal")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {SIGNALS.map((s) => (
            <label key={s}>
              <input
                type="radio"
                name={`${fieldId}-signal`}
                value={s}
                checked={signal === s}
                onChange={() => setSignal(s)}
                className="peer sr-only"
              />
              <span className={chip}>{t(`os.rm.learn.${s}` as const)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-2">
        <span className="text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250]">
          {t("os.rm.learn.who")}
        </span>
        <input
          type="text"
          value={who}
          onChange={(e) => setWho(e.target.value)}
          maxLength={120}
          className="min-h-12 w-full max-w-[24rem] rounded-2xl border border-[#171A27]/15 bg-[#FCFAF7] px-4 text-[1.0625rem] text-[#171A27] focus-visible:border-[#2F62D9] focus-visible:outline-none disabled:opacity-60"
        />
      </label>
      <div>
        <button
          type="submit"
          className={quietActionClass}
          disabled={!summary.trim() || save.isPending}
          data-testid="learning-save"
        >
          {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {t("os.rm.learn.save")}
        </button>
      </div>
    </form>
  );
}

/**
 * WHAT COMES NEXT — progressive disclosure. Next week in one line (it opens when this one is
 * done), then the whole plan as quiet phase rows that open to their weeks. Finished weeks can be
 * read back; nothing ahead competes with this week.
 */
export function RouteAhead({
  view,
  text,
  currentWeek,
  onOpenWeek,
}: {
  view: RoadmapView;
  text: RoadmapText;
  currentWeek: WeekDTO | null;
  onOpenWeek: (n: number) => void;
}) {
  const { t } = useLocale();
  const next = currentWeek ? view.weeks.find((w) => w.number === currentWeek.number + 1) : null;
  return (
    <section
      className="flex flex-col gap-14 border-t border-[#171A27]/10 pt-10"
      aria-labelledby="plan-h"
    >
      {next && (
        <div className="flex flex-col gap-3" data-testid="route-next">
          <OsEyebrow>
            {t("os.rm.nextWeek")} · {t("os.rm.week", { n: String(next.number).padStart(2, "0") })}
          </OsEyebrow>
          <p className="max-w-[30ch] font-os text-[clamp(1.4rem,1.15rem+0.8vw,1.85rem)] font-medium uppercase leading-[1.04] tracking-[-0.02em] text-[#171A27]">
            {text.weekTitle(next.id, next.title)}
          </p>
          <p className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-[#2A2F3B]">
            {text.weekObjective(next.id, next.objective)}
          </p>
          <p className="text-[0.9375rem] font-medium text-[#454B59]">{t("os.rm.nextOpens")}</p>
        </div>
      )}
      <div className="flex flex-col gap-5">
        <h2
          id="plan-h"
          className="text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250] [font-family:inherit]"
        >
          {t("os.rm.fullPlan")}
        </h2>
        <ol className="flex flex-col border-t border-[#171A27]/10">
          {view.phases.map((p) => (
            <PhaseRow
              key={p.id}
              view={view}
              phaseId={p.id}
              text={text}
              currentWeekId={currentWeek?.id ?? null}
              onOpenWeek={onOpenWeek}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}

function PhaseRow({
  view,
  phaseId,
  text,
  currentWeekId,
  onOpenWeek,
}: {
  view: RoadmapView;
  phaseId: string;
  text: RoadmapText;
  currentWeekId: string | null;
  onOpenWeek: (n: number) => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const phase = view.phases.find((p) => p.id === phaseId)!;
  const weeks = view.weeks.filter((w) => w.phaseId === phase.id);
  const span = phase.range
    ? phase.range.first === phase.range.last
      ? t("os.rm.week", { n: phase.range.first })
      : t("os.rm.weeks", { a: phase.range.first, b: phase.range.last })
    : null;
  const state = phase.state === "completed" ? "done" : phase.state === "current" ? "now" : "later";
  return (
    <li className="border-b border-[#171A27]/10" data-testid="route-phase" data-state={state}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F62D9] sm:gap-6"
      >
        <span
          className={cn(
            "w-[4.5rem] shrink-0 text-[0.875rem] font-semibold uppercase tracking-[0.12em]",
            state === "later" ? "text-[#3C4250]" : "text-[#7A5B2B]",
          )}
        >
          {t(`os.rm.phase.${state}` as const)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[1.1875rem] font-semibold leading-snug text-[#171A27] sm:text-[1.25rem]">
            {text.phaseTitle(phase.id, phase.title)}
          </span>
          {span && (
            <span className="mt-0.5 block text-[0.9375rem] font-medium text-[#454B59]">{span}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-[#171A27] transition-transform duration-300",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div id={bodyId} className="flex flex-col gap-4 pb-6 sm:pl-[6rem]">
          {phase.description && (
            <p className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-[#2A2F3B]">
              {phase.description}
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {weeks.map((w) => {
              const readable = w.state === "completed" || w.id === currentWeekId;
              return (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1"
                >
                  <span className="text-[1rem] text-[#171A27]">
                    <span className="mr-2 font-semibold text-[#3C4250]">
                      {String(w.number).padStart(2, "0")}
                    </span>
                    {text.weekTitle(w.id, w.title)}
                  </span>
                  {readable && (
                    <button
                      type="button"
                      className={textActionClass}
                      onClick={() => onOpenWeek(w.number)}
                    >
                      {t("os.rm.phase.open", { n: w.number })}
                      <ActionArrow />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}
