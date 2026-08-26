import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-border bg-background p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/60 px-6 py-5">
          <SheetTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="size-4 text-[oklch(0.55_0.16_292.7)]" aria-hidden="true" />
            Ask Sol
          </SheetTitle>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          {conversationQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your conversation…</p>
          ) : localMessages.length === 0 ? (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-[0.95rem] font-medium leading-snug text-primary">
                  {opportunityTitle
                    ? `Working with you on ${opportunityTitle}.`
                    : "Working with you on your business search."}
                </p>
                <p className="mt-1.5 text-[0.82rem] leading-relaxed text-muted-foreground">
                  {opportunityTitle
                    ? "Sol knows your profile, this opportunity, and your roadmap progress."
                    : "Sol knows your full profile and progress so far."}
                </p>
              </div>

              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
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
                      className="rounded-xl border border-border px-4 py-2.5 text-left text-[0.85rem] font-medium text-foreground transition-colors hover:border-[oklch(0.606_0.19_292.7_/_0.4)] hover:bg-[oklch(0.606_0.19_292.7_/_0.04)] disabled:opacity-50"
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
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.88rem] leading-relaxed",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground",
                  )}
                >
                  {m.content}
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 text-muted-foreground">
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
      </SheetContent>
    </Sheet>
  );
}
