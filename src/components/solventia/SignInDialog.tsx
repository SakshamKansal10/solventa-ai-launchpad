import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumButton } from "./PremiumButton";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getOtpSendErrorMessage,
  getOtpVerifyErrorMessage,
  getPasswordSignInErrorMessage,
} from "@/lib/auth-error-messages";
import { OTP_MAX_LENGTH, sanitizeOtpInput, isOtpLengthPlausible } from "@/lib/otp";

const RESEND_COOLDOWN_SECONDS = 30;

interface SignInDialogProps {
  trigger: ReactNode;
  /** Sanitized, same-origin destination to return to after signing in
   * (e.g. a dashboard deep link from an email) — falls back to
   * "/dashboard" when absent. Never trusted as-is by this component; the
   * caller (Header, via sanitizeNextPath) is responsible for validating
   * it before it ever reaches here. */
  nextPath?: string | null;
  /** Lets a caller force this dialog open (e.g. Header auto-opening it
   * when the URL carries a `next` redirect target) instead of only ever
   * opening via its own trigger. Uncontrolled — manages its own open
   * state — when omitted. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SignInDialog({ trigger, nextPath, open, onOpenChange }: SignInDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const googleRedirectPath = nextPath
    ? `/auth/callback?next=${encodeURIComponent(nextPath)}`
    : "/auth/callback";

  function tickCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function finishSignIn() {
    // A different account may be signing in on a tab that still has a
    // previous account's cached data — never show it to the new user.
    queryClient.clear();
    setDialogOpen(false);
    if (nextPath) {
      // nextPath can carry its own query string (e.g. a specific
      // consultation id) — a full navigation via the browser handles that
      // correctly without needing it to be a typed, known-at-build-time
      // route, unlike the router's own `navigate({ to })`.
      window.location.assign(nextPath);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.error("[sign-in] failed:", signInError);
        setError(getPasswordSignInErrorMessage(signInError));
        return;
      }
      finishSignIn();
    } catch (err) {
      console.error("[sign-in] failed:", err);
      setError(getPasswordSignInErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function requestCode() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (otpError) {
        console.error("[sign-in] sending code failed:", otpError);
        setError(getOtpSendErrorMessage(otpError));
        return;
      }
      setMode("otp");
      tickCooldown();
    } catch (err) {
      console.error("[sign-in] sending code failed:", err);
      setError(getOtpSendErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (verifyError) {
        console.error("[sign-in] code verification failed:", verifyError);
        setError(getOtpVerifyErrorMessage(verifyError));
        return;
      }
      finishSignIn();
    } catch (err) {
      console.error("[sign-in] code verification failed:", err);
      setError(getOtpVerifyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(next) => {
        setDialogOpen(next);
        if (!next) {
          setMode("password");
          setCode("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-2xl border-border/70 bg-card sm:max-w-[400px]">
        {mode === "otp" ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-primary">
                Check your email for a code
              </DialogTitle>
              <DialogDescription>
                We sent a verification code to <span className="text-foreground">{email}</span>.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleVerify} className="mt-2 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="signin-otp">Verification code</Label>
                <Input
                  id="signin-otp"
                  autoFocus
                  autoComplete="one-time-code"
                  maxLength={OTP_MAX_LENGTH}
                  required
                  value={code}
                  onChange={(e) => setCode(sanitizeOtpInput(e.target.value))}
                  placeholder="Enter your code"
                  className="text-center text-[1.2rem] font-semibold tracking-[0.4em]"
                />
              </div>
              {error && <p className="text-[0.82rem] text-destructive">{error}</p>}
              <PremiumButton
                type="submit"
                tone="solid"
                shape="rounded"
                size="sm"
                className="mt-2 w-full"
                disabled={loading || !isOtpLengthPlausible(code)}
              >
                {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Verify & sign in
              </PremiumButton>
              <div className="flex items-center justify-between text-[0.8rem]">
                <button
                  type="button"
                  onClick={() => {
                    setMode("password");
                    setCode("");
                    setError(null);
                  }}
                  className="text-muted-foreground hover:text-primary"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={requestCode}
                  className="font-medium text-primary disabled:text-muted-foreground"
                >
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-primary">Welcome back</DialogTitle>
              <DialogDescription>
                {nextPath
                  ? "Sign in to pick up exactly where you left off."
                  : "Sign in to continue building with Solventia."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2">
              <GoogleSignInButton redirectPath={googleRedirectPath} />
            </div>
            <div className="my-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[0.75rem] text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-[0.82rem] text-destructive">{error}</p>}
              <PremiumButton
                type="submit"
                tone="solid"
                shape="rounded"
                size="sm"
                className="mt-2 w-full"
                disabled={loading}
              >
                {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Sign In
              </PremiumButton>
              <button
                type="button"
                disabled={!email || loading}
                onClick={requestCode}
                className="text-center text-[0.8rem] text-muted-foreground hover:text-primary disabled:opacity-50"
              >
                Forgot your password? Sign in with a code instead
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
