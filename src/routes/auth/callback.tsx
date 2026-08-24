import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { exchangeCodeForSession } from "@/lib/actions/auth";
import { completeConsultation, getLatestBusinessDna } from "@/lib/actions/profile";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: z.object({
    code: z.string().optional(),
    error_description: z.string().optional(),
  }),
  component: AuthCallback,
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
});

const ONBOARDING_STORAGE_KEY = "solventia-onboarding-v1";

/** Google sign-in redirects the whole page away to Google and back —
 * unlike email sign-up/sign-in, which never leaves this page, so
 * `runSubmission` in CompletionScreen never gets to run. The consultation
 * answers survive the round trip in localStorage (onboarding-store.tsx
 * already persists them there); this picks that up and finishes the
 * submission here instead, but only if there's no Business DNA yet — a
 * returning user signing in from the homepage must never get a duplicate
 * one generated from stale localStorage. */
async function resumePendingConsultation(onStatus: (text: string) => void): Promise<void> {
  const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!raw) return;

  let answers: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(raw) as { answers?: Record<string, unknown> };
    answers = parsed.answers ?? null;
  } catch {
    return;
  }
  if (!answers || Object.keys(answers).length === 0) return;

  const existing = await getLatestBusinessDna();
  if (existing) return;

  onStatus("Building your Business DNA and finding opportunities…");
  await completeConsultation({ data: { answers } });
}

/** Every Supabase auth email (signup confirmation, password recovery,
 * magic link) and every OAuth provider (Google) points here with a
 * one-time `code` — this exchanges it for a real session. Without this
 * route the link/redirect just looks broken. */
function AuthCallback() {
  const { code, error_description } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(error_description ?? null);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [statusText, setStatusText] = useState("Confirming your account…");
  const ranRef = useRef(false);

  useEffect(() => {
    if (error_description || ranRef.current) return;
    if (!code) {
      setError("This confirmation link is missing its code. Try requesting a new one.");
      return;
    }
    ranRef.current = true;

    (async () => {
      const result = await exchangeCodeForSession({ data: { code } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Same reasoning as the email sign-in paths — a different account
      // may be completing OAuth on a tab that still has stale cached data.
      queryClient.clear();

      try {
        await resumePendingConsultation(setStatusText);
      } catch (err) {
        // The session is real, but the analysis isn't — routing to
        // /dashboard here would strand the user on the empty "no match
        // yet" state with no way back to a retry. Their answers are still
        // in localStorage (never cleared on failure), so resuming the
        // consultation from /consultation will pick up right here.
        console.error("[auth-callback] resuming consultation failed:", err);
        setAnalysisFailed(true);
        return;
      }

      navigate({ to: "/dashboard" });
    })().catch(() => setError("Something went wrong confirming your account."));
  }, [code, error_description, navigate, queryClient]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="font-display text-xl font-semibold text-primary">
          This link didn&rsquo;t work.
        </p>
        <p className="max-w-sm text-[0.9rem] text-muted-foreground">{error}</p>
        <PremiumButton tone="solid" shape="rounded" size="sm" href="/">
          Back to Homepage
        </PremiumButton>
      </div>
    );
  }

  if (analysisFailed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="font-display text-xl font-semibold text-primary">
          Sol couldn&rsquo;t complete your analysis.
        </p>
        <p className="max-w-sm text-[0.9rem] text-muted-foreground">
          Your account is set up and your consultation answers are safely saved. Retry the analysis
          to get your opportunities and roadmap.
        </p>
        <PremiumButton tone="solid" shape="rounded" size="sm" href="/consultation">
          Retry Analysis
        </PremiumButton>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center gap-2 bg-background text-muted-foreground">
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      {statusText}
    </div>
  );
}
