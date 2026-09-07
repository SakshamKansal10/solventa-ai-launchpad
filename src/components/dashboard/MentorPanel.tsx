import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, X } from "lucide-react";
import mark from "@/assets/solventia-mark.png";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getMentorConversation, sendMentorMessage } from "@/lib/actions/mentor";
import { cn } from "@/lib/utils";

interface MentorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string | null;
  opportunityTitle: string | null;
}

const SUGGESTED_PROMPTS_GENERAL = [
  "What should I do today?",
  "Help me pick a direction",
  "Can we explore more opportunities?",
];
const SUGGESTED_PROMPTS_WITH_OPPORTUNITY = [
  "What should I do today?",
  "Explain my next task",
  "I'm stuck — help me think this through",
];

/** A real persistent assistant panel, not a modal — deliberately NOT built
 * on the shadcn Sheet/Radix Dialog primitive used elsewhere in this app,
 * since that always renders a fixed inset-0 bg-black/80 scrim behind it,
 * and a Radix Dialog also traps focus/scroll on the page underneath. There
 * is deliberately NO outside-click-to-close catcher either: an earlier
 * version used a `fixed inset-0` invisible button to detect outside
 * clicks, which — being full-viewport — silently intercepted every click
 * and scroll/wheel event over the dashboard behind it, not just closes.
 * Closing is only ever explicit (the X button or Escape), so the dashboard
 * stays fully clickable and scrollable the entire time the panel is open.
 * On desktop, DashboardShell shifts the main column left by the panel's
 * width so the two sit side by side with no overlap; on mobile the panel
 * is full-width by design (see className below), matching the panel's own
 * "mobile can become full-screen" spec. */
export function MentorPanel({
  open,
  onOpenChange,
  opportunityId,
  opportunityTitle,
}: MentorPanelProps) {
  const queryClient = useQueryClient();
  const conversationQuery = useQuery({
    queryKey: ["mentor-conversation", opportunityId],
    queryFn: () => getMentorConversation({ data: { opportunityId } }),
    enabled: open,
  });

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationQuery.data) {
      setLocalMessages(
        conversationQuery.data.messages.map((m) => ({ role: m.role, content: m.content })),
      );
    }
  }, [conversationQuery.data]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [localMessages, sending]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  async function handleSend(override?: string) {
    const message = (override ?? draft).trim();
    if (!message || sending) return;
    setDraft("");
    setLocalMessages((prev) => [...prev, { role: "user", content: message }]);
    setSending(true);
    try {
      const result = await sendMentorMessage({ data: { opportunityId, message } });
      setLocalMessages((prev) => [...prev, { role: "assistant", content: result.reply.message }]);
      queryClient.invalidateQueries({ queryKey: ["mentor-conversation", opportunityId] });
    } catch (err) {
      console.error("[mentor] send failed:", err);
      setLocalMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sol couldn't respond just now — try again in a moment." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          // Slides in via transform (GPU-composited, never janky) rather
          // than literally animating width 0->420 — animating to an
          // intrinsic/breakpoint-driven width in Framer Motion needs an
          // "auto" measurement trick that's prone to layout jumps,
          // especially combined with `fixed` positioning. This delivers
          // the same "panel grows in from the right, fades up" feel
          // without that risk.
          initial={{ x: "100%", opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0.6 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-[#DED4EF] bg-sol-surface shadow-[-24px_0_60px_-30px_oklch(0.245_0.055_268_/_0.35)] lg:w-[360px] min-[1440px]:w-[420px]"
        >
          <div className="flex items-center justify-between border-b border-sol-violet-mist bg-sol-violet-ultralight px-6 py-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-sol-champagne to-sol-violet">
                <img src={mark} alt="" width={298} height={436} className="h-4 w-auto" />
              </span>
              <div className="leading-tight">
                <p className="font-display text-[1.05rem] font-semibold text-dashboard-heading">
                  Ask Sol
                </p>
                <p className="text-[0.72rem] text-dashboard-muted">Your founder assistant</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="flex size-8 items-center justify-center rounded-full text-dashboard-muted transition-colors hover:bg-secondary hover:text-dashboard-heading"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
            {conversationQuery.isLoading ? (
              <p className="text-sm text-dashboard-muted">Loading your conversation…</p>
            ) : localMessages.length === 0 ? (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-[0.95rem] font-medium leading-snug text-dashboard-heading">
                    {opportunityTitle
                      ? `Working with you on ${opportunityTitle}.`
                      : "Working with you on your business search."}
                  </p>
                  <p className="mt-1.5 text-[0.82rem] leading-relaxed text-dashboard-muted">
                    {opportunityTitle
                      ? "Sol knows your profile, this opportunity, and your roadmap progress."
                      : "Sol knows your full profile and progress so far."}
                  </p>
                </div>

                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-dashboard-muted">
                    What can I help with?
                  </p>
                  <div className="mt-2.5 flex flex-col gap-2">
                    {(opportunityId
                      ? SUGGESTED_PROMPTS_WITH_OPPORTUNITY
                      : SUGGESTED_PROMPTS_GENERAL
                    ).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        disabled={sending}
                        className="rounded-xl border border-sol-border px-4 py-2.5 text-left text-[0.9rem] font-medium text-dashboard-body transition-colors hover:border-sol-violet/40 hover:bg-sol-violet-mist/40 disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {localMessages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed",
                      m.role === "user"
                        ? "ml-auto bg-dashboard-heading text-background"
                        : "bg-secondary text-dashboard-body",
                    )}
                  >
                    {m.content}
                  </div>
                ))}
                {sending && (
                  <div className="flex items-center gap-2 text-dashboard-muted">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    <span className="text-[0.8rem]">Sol is thinking…</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-end gap-2 border-t border-border/60 px-4 py-4">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Sol something specific…"
              className="min-h-[44px] flex-1 resize-none"
            />
            <Button size="icon" onClick={() => handleSend()} disabled={sending || !draft.trim()}>
              <Send className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
