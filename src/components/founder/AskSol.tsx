import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Send, Sparkles, X } from "lucide-react";

import { BrandMark } from "@/components/brand/Brand";
import {
  getMentorConversation,
  sendMentorMessage,
  type FactUpdateOffer,
} from "@/lib/actions/mentor";
import { parseDailyLimit } from "@/lib/limits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";
import { qk } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { SolText } from "./SolText";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
  /** New facts Sol understood: the offer to find new directions with them (Job M). */
  offer?: FactUpdateOffer | null;
}

/** The conversation itself. Rendered inside a docked aside (≥1280px, where it
 * resizes the page grid and covers nothing) or a Sheet drawer (smaller).
 * Conversations persist per opportunity, so each direction has its own thread. */
export type AskSolRoute = "dashboard" | "opportunity" | "roadmap" | "proof";

export function AskSolPanel({
  opportunityId,
  opportunityTitle,
  hasRoadmap,
  route = "dashboard",
  assumptionTitle = null,
  initialQuestion = null,
  onQuestionConsumed,
  weekNumber = null,
  phaseTitle = null,
  missionTitle = null,
  onClose,
}: {
  opportunityId: string | null;
  opportunityTitle: string | null;
  hasRoadmap: boolean;
  /** Which part of the product the founder is in — suggestions follow it. */
  route?: AskSolRoute;
  /** The assumption currently open in Proof, when there is one. */
  assumptionTitle?: string | null;
  /** A question handed over by a button elsewhere ("Ask Sol what this changes"). */
  initialQuestion?: string | null;
  onQuestionConsumed?: () => void;
  /** Current roadmap context, when one exists — shown in the header so the
   * founder can see Sol already knows where they are (spec CF). */
  weekNumber?: number | null;
  phaseTitle?: string | null;
  missionTitle?: string | null;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const conversation = useQuery({
    queryKey: qk.mentor(opportunityId),
    queryFn: () => getMentorConversation({ data: { opportunityId } }),
  });

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversation.data) {
      const offers = conversation.data.factUpdates ?? [];
      setMessages(
        conversation.data.messages.map((m) => ({
          role: m.role,
          content: m.content,
          offer: offers.find((o) => o.assistantMessageId === m.id) ?? null,
        })),
      );
    }
  }, [conversation.data]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  async function send(text?: string) {
    const message = (text ?? draft).trim();
    // Not before the earlier conversation has loaded: it would replace the message just sent.
    if (!message || sending || conversation.isLoading) return;
    setDraft("");
    setLastFailed(null);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setSending(true);
    try {
      const result = await sendMentorMessage({ data: { opportunityId, message, locale } });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply.message, offer: result.factUpdate },
      ]);
      void queryClient.invalidateQueries({ queryKey: qk.mentor(opportunityId) });
    } catch (err) {
      console.error("[ask-sol] send failed:", err);
      const limit = parseDailyLimit(err);
      // At the daily limit there is nothing to retry today: say so, without a retry.
      if (!limit) setLastFailed(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: limit ? t("v2.limit.askSol", { n: limit.limit }) : t("askSol.error"),
          failed: !limit,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  // A question handed over from elsewhere is sent once the thread has loaded —
  // sending earlier would be overwritten when the saved conversation arrives.
  const handedOver = useRef<string | null>(null);
  useEffect(() => {
    if (!initialQuestion || conversation.isLoading || handedOver.current === initialQuestion)
      return;
    handedOver.current = initialQuestion;
    void send(initialQuestion);
    onQuestionConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion, conversation.isLoading]);

  const prompts: readonly MessageKey[] = !opportunityId
    ? ["askSol.prompt.today", "askSol.prompt.pick"]
    : route === "proof"
      ? [
          "askSol.prompt.changes",
          "askSol.prompt.nextTest",
          "askSol.prompt.weakest",
          "askSol.prompt.stuck",
        ]
      : route === "roadmap" && hasRoadmap
        ? [
            "askSol.prompt.today",
            "askSol.prompt.explain",
            "askSol.prompt.interviews",
            "askSol.prompt.proof",
          ]
        : route === "opportunity"
          ? [
              "askSol.prompt.fit",
              "askSol.prompt.risks",
              "askSol.prompt.firstTest",
              "askSol.prompt.stuck",
            ]
          : hasRoadmap
            ? [
                "askSol.prompt.today",
                "askSol.prompt.explain",
                "askSol.prompt.proof",
                "askSol.prompt.stuck",
              ]
            : ["askSol.prompt.today", "askSol.prompt.proof", "askSol.prompt.stuck"];

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="ask-sol-panel">
      <div className="flex items-start justify-between gap-3 border-b border-sol-border bg-sol-surface px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-sol-border bg-sol-pearl">
            <BrandMark height={20} />
          </span>
          <div className="min-w-0 leading-tight">
            <h2 className="text-[1.25rem] font-semibold text-sol-ink">
              <SolText text={t("askSol.title")} />
            </h2>
            {/* The context stack a founder actually sees Sol already knows —
                each line present only when real (spec CF): opportunity,
                then week/phase, then the mission in progress. Never a
                generic tagline once there's real context to show instead. */}
            {opportunityTitle ? (
              <div className="mt-1 flex flex-col gap-0.5" data-testid="ask-sol-context">
                <p className="truncate text-[0.9375rem] font-semibold text-sol-ink">
                  {opportunityTitle}
                </p>
                {weekNumber != null && (
                  <p className="truncate text-[0.9375rem] text-sol-secondary">
                    {t("common.weekN", { n: String(weekNumber) })}
                    {phaseTitle ? ` · ${phaseTitle}` : ""}
                  </p>
                )}
                {missionTitle && (
                  <p className="truncate text-[0.9375rem] text-sol-secondary">{missionTitle}</p>
                )}
                {assumptionTitle && (
                  <p
                    className="truncate text-[0.9375rem] text-sol-secondary"
                    data-testid="ask-sol-assumption"
                  >
                    <SolText text={t("askSol.assumptionLine", { title: assumptionTitle })} />
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[0.9375rem] text-sol-secondary">
                <SolText text={t("askSol.tagline")} />
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("askSol.close")}
          data-testid="ask-sol-close"
          className="flex size-10 items-center justify-center rounded-full text-sol-secondary hover:bg-sol-ivory hover:text-sol-ink"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5" aria-live="polite">
        {/* The welcome and the prompts show at once; earlier messages, if any, load in
            behind them — the panel never sits on a bare loading line. */}
        {conversation.isLoading || messages.length === 0 ? (
          <div className="flex flex-col gap-6">
            <div>
              <p
                className="text-[1.25rem] font-semibold leading-snug text-sol-ink"
                data-testid="ask-sol-welcome"
              >
                <SolText text={t("askSol.welcome.title")} />
              </p>
              <p className="mt-1.5 text-[1rem] leading-relaxed text-sol-secondary">
                <SolText text={t("askSol.welcome.body")} />
              </p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-sol-secondary">
                {opportunityTitle
                  ? t("askSol.workingOn", { title: opportunityTitle })
                  : t("askSol.workingGeneral")}
              </p>
              {conversation.isLoading && (
                <p className="mt-2 flex items-center gap-2 text-[0.9375rem] text-sol-secondary">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <SolText text={t("askSol.loading")} />
                </p>
              )}
            </div>
            <div>
              <p className="text-[0.9375rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                <SolText text={t("askSol.help")} />
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {prompts.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void send(t(key))}
                    disabled={sending || conversation.isLoading}
                    className="min-h-12 rounded-2xl border border-sol-border px-4 py-2.5 text-left text-[1rem] font-medium text-sol-ink transition-colors hover:border-sol-cobalt/50 hover:bg-sol-cobalt-soft/50 disabled:opacity-50"
                  >
                    <SolText text={t(key)} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {messages.map((m, i) => (
              <li
                key={i}
                className={cn(
                  "max-w-[88%] rounded-2xl px-4 py-3 text-[1rem] leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-sol-navy text-white"
                    : m.failed
                      ? "bg-sol-warning-soft text-sol-ink"
                      : "bg-sol-ivory text-sol-ink",
                )}
              >
                <span className="sr-only">
                  {m.role === "user" ? t("askSol.you") : <SolText text={t("askSol.sol")} />}:{" "}
                </span>
                {m.failed ? <span role="alert">{m.content}</span> : m.content}
                {m.offer && !m.offer.applied && (
                  <FindNewDirections offer={m.offer} hasRoadmap={hasRoadmap} />
                )}
                {m.failed && lastFailed && i === messages.length - 1 && (
                  <button
                    type="button"
                    className="mt-2 block font-semibold text-sol-cobalt-deep underline-offset-4 hover:underline"
                    onClick={() => {
                      setMessages((prev) => prev.slice(0, -2));
                      void send(lastFailed);
                    }}
                  >
                    <SolText text={t("askSol.retry")} />
                  </button>
                )}
              </li>
            ))}
            {sending && (
              <li className="flex items-center gap-2 text-sol-secondary">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span className="text-[0.9375rem]">
                  <SolText text={t("askSol.thinking")} />
                </span>
              </li>
            )}
          </ul>
        )}
      </div>

      <form
        className="flex items-end gap-2 border-t border-sol-border px-4 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="ask-sol-input" className="sr-only">
          <SolText text={t("askSol.placeholder")} />
        </label>
        <textarea
          id="ask-sol-input"
          data-testid="ask-sol-input"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={t("askSol.placeholder")}
          className="min-h-12 flex-1 resize-none rounded-2xl border border-sol-border bg-sol-surface px-4 py-3 text-[1rem] text-sol-ink focus-visible:border-sol-cobalt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-cobalt/30"
        />
        <button
          type="submit"
          disabled={sending || conversation.isLoading || !draft.trim()}
          aria-label={t("askSol.send")}
          data-testid="ask-sol-send"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sol-navy text-white hover:bg-sol-navy-soft disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
        </button>
      </form>
    </div>
  );
}

/**
 * Under a reply where Sol understood new facts about the founder (Job M): the question and ONE
 * button. Nothing changes without this tap; with a roadmap, the founder is told first that it
 * stays. The tap opens the generation screen, which runs it as the founder's only job.
 */
function FindNewDirections({ offer, hasRoadmap }: { offer: FactUpdateOffer; hasRoadmap: boolean }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [tapped, setTapped] = useState(false);
  return (
    <div
      className="mt-3 flex flex-col items-start gap-2.5 border-t border-sol-border pt-3"
      data-testid="sol-facts"
    >
      {/* What Sol understood, in one line — then the question. */}
      <p className="text-sol-ink" data-testid="sol-facts-summary">
        {offer.summary}
      </p>
      <p className="font-semibold text-sol-ink">{t("sol.facts.ask")}</p>
      {hasRoadmap && (
        <p className="text-[0.9375rem] text-sol-secondary" data-testid="sol-facts-roadmap">
          {t("sol.facts.roadmapNote")}
        </p>
      )}
      <button
        type="button"
        disabled={tapped}
        data-testid="sol-find-directions"
        onClick={() => {
          if (tapped) return;
          setTapped(true);
          void navigate({
            to: "/dashboard/directions/finding",
            search: { kind: "refresh", update: offer.id, start: true },
          });
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sol-navy px-4 text-[1rem] font-semibold text-white hover:bg-sol-navy-soft disabled:opacity-60"
      >
        {tapped ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="size-4" aria-hidden="true" />
        )}
        {t("sol.facts.cta")}
      </button>
    </div>
  );
}
