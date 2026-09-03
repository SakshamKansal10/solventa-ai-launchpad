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

const RESEND_COOLDOWN_SECONDS = 30;

export function SignInDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    setOpen(false);
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
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
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
                We sent a 6-digit code to <span className="text-foreground">{email}</span>.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleVerify} className="mt-2 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="signin-otp">6-digit code</Label>
                <Input
                  id="signin-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
                  placeholder="123456"
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
                disabled={loading || code.length < 6}
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
              <DialogDescription>Sign in to continue building with Solventia.</DialogDescription>
            </DialogHeader>
            <div className="mt-2">
              <GoogleSignInButton redirectPath="/auth/callback" />
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
