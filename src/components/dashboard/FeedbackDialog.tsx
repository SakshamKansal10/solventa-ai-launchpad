import { useState, type FormEvent, type ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { submitFeedback } from "@/lib/actions/feedback";

export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function reset() {
    setMessage("");
    setError(null);
    setSent(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await submitFeedback({ data: { message } });
      setSent(true);
    } catch (err) {
      console.error("[feedback] submit failed:", err);
      setError("Couldn't send that just now — try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="rounded-2xl border-border/70 bg-card sm:max-w-[440px]">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-2xl text-primary">
                <Check className="size-5 text-primary" aria-hidden="true" />
                Thanks for the note
              </DialogTitle>
              <DialogDescription>
                Sol's team reads every message — we'll take it from here.
              </DialogDescription>
            </DialogHeader>
            <PremiumButton
              tone="solid"
              shape="rounded"
              size="sm"
              className="mt-2 w-full"
              onClick={() => onOpenChange(false)}
            >
              Done
            </PremiumButton>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-primary">
                Share feedback
              </DialogTitle>
              <DialogDescription>
                A bug, a rough edge, an idea for what Solventia should do next — tell us.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="feedback-message">Your message</Label>
                <Textarea
                  id="feedback-message"
                  autoFocus
                  required
                  minLength={1}
                  maxLength={4000}
                  rows={5}
                  placeholder="What's on your mind?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              {error && <p className="text-[0.82rem] text-destructive">{error}</p>}
              <PremiumButton
                type="submit"
                tone="solid"
                shape="rounded"
                size="sm"
                className="w-full"
                disabled={loading || !message.trim()}
              >
                {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Send feedback
              </PremiumButton>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
