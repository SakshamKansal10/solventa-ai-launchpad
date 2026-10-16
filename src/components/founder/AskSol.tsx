import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, X } from "lucide-react";

import mark from "@/assets/solventia-mark.png";
import { getMentorConversation, sendMentorMessage } from "@/lib/actions/mentor";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";
import { qk } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
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
      setMessages(conversation.data.messages.map((m) => ({ role: m.role, content: m.content })));
    }
  }, [conversation.data]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  async function send(text?: string) {
    const message = (text ?? draft).trim();
    if (!message || sending) return;
    setDraft("");
    setLastFailed(null);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setSending(true);
    try {
      const result = await sendMentorMessage({ data: { opportunityId, message, locale } });
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply.message }]);
      void queryClient.invalidateQueries({ queryKey: qk.mentor(opportunityId) });
    } catch (err) {
      console.error("[ask-sol] send failed:", err);
      setLastFailed(message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("askSol.error"), failed: true },
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
      <div className="flex items-start justify-between gap-3 border-b border-sol-border bg-sol-violet-soft/50 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sol-champagne to-sol-violet">
            <img src={mark} alt="" width={298} height={436} className="h-5 w-auto" />
          </span>
          <div className="min-w-0 leading-tight">
            <h2 className="font-display text-[1.25rem] font-semibold text-sol-ink">
              {t("askSol.title")}
            </h2>
            {/* The context stack a founder actually sees Sol already knows —
                each line present only when real (spec CF): opportunity,
                then week/phase, then the mission in progress. Never a
                generic tagline once there's real context to show instead. */}
            {opportunityTitle ? (
              <div className="mt-1 flex flex-col gap-0.5" data-testid="ask-sol-context">
                <p className="truncate text-[0.875rem] font-semibold text-sol-ink">
                  {opportunityTitle}
                </p>
                {weekNumber != null && (
                  <p className="truncate text-[0.875rem] text-sol-secondary">
                    {t("common.weekN", { n: String(weekNumber) })}
                    {phaseTitle ? ` · ${phaseTitle}` : ""}
                  </p>
                )}
                {missionTitle && (
                  <p className="truncate text-[0.875rem] text-sol-secondary">{missionTitle}</p>
                )}
                {assumptionTitle && (
                  <p
                    className="truncate text-[0.875rem] text-sol-secondary"
                    data-testid="ask-sol-assumption"
                  >
                    {t("askSol.assumptionLine", { title: assumptionTitle })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[0.875rem] text-sol-secondary">{t("askSol.tagline")}</p>
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
        {conversation.isLoading ? (
          <p className="text-[1rem] text-sol-secondary">{t("askSol.loading")}</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-[1.0625rem] font-semibold leading-snug text-sol-ink">
                {opportunityTitle
                  ? t("askSol.workingOn", { title: opportunityTitle })
                  : t("askSol.workingGeneral")}
              </p>
              <p className="mt-1.5 text-[1rem] leading-relaxed text-sol-secondary">
                {opportunityTitle ? t("askSol.knows") : t("askSol.knowsGeneral")}
              </p>
            </div>
            <div>
              <p className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                {t("askSol.help")}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {prompts.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void send(t(key))}
                    disabled={sending}
                    className="min-h-12 rounded-2xl border border-sol-border px-4 py-2.5 text-left text-[1rem] font-medium text-sol-ink transition-colors hover:border-sol-violet/50 hover:bg-sol-violet-soft/50 disabled:opacity-50"
                  >
                    {t(key)}
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
                  {m.role === "user" ? t("askSol.you") : t("askSol.sol")}:{" "}
                </span>
                {m.failed ? <span role="alert">{m.content}</span> : m.content}
                {m.failed && lastFailed && i === messages.length - 1 && (
                  <button
                    type="button"
                    className="mt-2 block font-semibold text-sol-violet-deep underline-offset-4 hover:underline"
                    onClick={() => {
                      setMessages((prev) => prev.slice(0, -2));
                      void send(lastFailed);
                    }}
                  >
                    {t("askSol.retry")}
                  </button>
                )}
              </li>
            ))}
            {sending && (
              <li className="flex items-center gap-2 text-sol-secondary">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span className="text-[0.9375rem]">{t("askSol.thinking")}</span>
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
          {t("askSol.placeholder")}
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
          className="min-h-12 flex-1 resize-none rounded-2xl border border-sol-border bg-sol-surface px-4 py-3 text-[1rem] text-sol-ink focus-visible:border-sol-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/30"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
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
