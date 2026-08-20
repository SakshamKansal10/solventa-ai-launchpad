import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { GoogleSignInButton } from "@/components/solventia/GoogleSignInButton";
import { signIn, signUp } from "@/lib/actions/auth";

interface AccountGateProps {
  onAuthenticated: (email: string) => void;
}

/** Inline (not a dialog) sign-up/sign-in used at the end of the
 * consultation — the founder just finished a real personal disclosure, so
 * routing them through a modal on top of it feels like a bait-and-switch.
 * Keeps the same page, same breath. */
export function AccountGate({ onAuthenticated }: AccountGateProps) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const result = await signUp({
          data: {
            email,
            password,
            fullName: fullName || undefined,
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (result.needsEmailConfirmation) {
          setError("Check your email to confirm your account, then sign in below.");
          setMode("signin");
          return;
        }
      } else {
        const result = await signIn({ data: { email, password } });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      // Testing multiple personas in one tab (sign up → consultation →
      // sign up again as someone else) would otherwise leave the previous
      // account's dashboard/opportunity data sitting in the query cache.
      queryClient.clear();
      onAuthenticated(email);
    } catch (err) {
      console.error("[account-gate] auth failed:", err);
      setError("Something went wrong. Your answers are safe — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-[1.75rem] border border-border/70 bg-card/90 px-6 py-8 text-left shadow-[0_30px_80px_-45px_oklch(0.245_0.055_268_/_0.22)] backdrop-blur-xl sm:px-8">
      <p className="font-display text-[1.15rem] font-semibold text-primary">
        {mode === "signup"
          ? "Create your account to see your results"
          : "Sign in to see your results"}
      </p>
      <p className="mt-1.5 text-[0.85rem] leading-relaxed text-muted-foreground">
        Everything you just shared stays saved to your account — Sol builds on it every time you
        come back.
      </p>

      <div className="mt-5">
        <GoogleSignInButton redirectPath="/auth/callback" />
      </div>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[0.75rem] text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {mode === "signup" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gate-name">Name (optional)</Label>
            <Input
              id="gate-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gate-email">Email</Label>
          <Input
            id="gate-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gate-password">Password</Label>
          <Input
            id="gate-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        {error && <p className="text-[0.82rem] text-destructive">{error}</p>}

        <PremiumButton
          type="submit"
          tone="solid"
          shape="rounded"
          size="lg"
          className="mt-1 w-full"
          disabled={loading}
        >
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {mode === "signup" ? "Create account & see my results" : "Sign in & see my results"}
        </PremiumButton>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
          }}
          className="text-center text-[0.82rem] text-muted-foreground hover:text-primary"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </form>
    </div>
  );
}
