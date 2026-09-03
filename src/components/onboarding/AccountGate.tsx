import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { GoogleSignInButton } from "@/components/solventia/GoogleSignInButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { sendWelcomeEmailForNewUser } from "@/lib/actions/auth";
import {
  getOtpSendErrorMessage,
  getOtpVerifyErrorMessage,
  getPasswordSignInErrorMessage,
} from "@/lib/auth-error-messages";
import { OTP_MAX_LENGTH, sanitizeOtpInput, isOtpLengthPlausible } from "@/lib/otp";

interface AccountGateProps {
  onAuthenticated: (email: string) => void;
}

type Mode = "signup" | "signin" | "otp";

const RESEND_COOLDOWN_SECONDS = 30;

/** Inline (not a dialog) sign-up/sign-in used at the end of the
 * consultation — the founder just finished a real personal disclosure, so
 * routing them through a modal on top of it feels like a bait-and-switch.
 * Keeps the same page, same breath.
 *
 * Signup is fully passwordless (a code, never a password) — Supabase's
 * password-signup email-confirmation is a clickable link with no natural
 * "you're almost done" UI state, which is exactly what produced the old
 * bug here (a success message rendered as a red error). A short code the
 * founder types on THIS page has no such awkward middle state, and
 * doubles as the answer to "I forgot my password": request a code
 * instead — no separate reset flow to build or explain.
 *
 * Every Supabase Auth call here (password sign-in, OTP send, OTP verify)
 * runs directly against the browser Supabase client — never through a
 * TanStack server function. A production diagnostic proved Vercel's
 * server runtime cannot reach Supabase Auth at all (even an
 * unauthenticated settings GET failed), while the browser has never had
 * that problem; @supabase/ssr's browser client persists the resulting
 * session into cookies the server already reads, so nothing else in the
 * app needs to change for this session to be visible on the next
 * request. */
export function AccountGate({ onAuthenticated }: AccountGateProps) {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [otpContext, setOtpContext] = useState<{ email: string; shouldCreateUser: boolean } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
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

  async function requestCode(targetEmail: string, shouldCreateUser: boolean) {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser,
          ...(shouldCreateUser && fullName ? { data: { full_name: fullName } } : {}),
        },
      });
      if (otpError) {
        console.error("[account-gate] sending code failed:", otpError);
        setError(getOtpSendErrorMessage(otpError));
        return;
      }
      setOtpContext({ email: targetEmail, shouldCreateUser });
      setMode("otp");
      tickCooldown();
    } catch (err) {
      console.error("[account-gate] sending code failed:", err);
      setError(getOtpSendErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupOrSigninSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "signup") {
      await requestCode(email, true);
      return;
    }
    // Password sign-in — kept working for accounts created before this
    // passwordless flow existed. New accounts never set a password at all.
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.error("[account-gate] sign-in failed:", signInError);
        setError(getPasswordSignInErrorMessage(signInError));
        return;
      }
      queryClient.clear();
      onAuthenticated(email);
    } catch (err) {
      console.error("[account-gate] sign-in failed:", err);
      setError(getPasswordSignInErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpContext) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: otpContext.email,
        token: code,
        type: "email",
      });
      if (verifyError) {
        console.error("[account-gate] code verification failed:", verifyError);
        setError(getOtpVerifyErrorMessage(verifyError));
        return;
      }

      // A brand-new account's very first sign-in lands within the same
      // instant it was created — an existing account returning via "sign
      // in with a code" was created long before this moment.
      const user = verifyData.user;
      if (user?.email && user.created_at && user.last_sign_in_at) {
        const justCreated =
          Math.abs(new Date(user.last_sign_in_at).getTime() - new Date(user.created_at).getTime()) <
          10_000;
        if (justCreated) {
          void sendWelcomeEmailForNewUser({
            data: { email: user.email, fullName: fullName || undefined },
          });
        }
      }

      queryClient.clear();
      onAuthenticated(otpContext.email);
    } catch (err) {
      console.error("[account-gate] code verification failed:", err);
      setError(getOtpVerifyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (mode === "otp" && otpContext) {
    return (
      <div className="w-full rounded-[1.75rem] border border-border/70 bg-card/90 px-6 py-8 text-left shadow-[0_30px_80px_-45px_oklch(0.245_0.055_268_/_0.22)] backdrop-blur-xl sm:px-8">
        <p className="font-display text-[1.15rem] font-semibold text-primary">
          Check your email for a code
        </p>
        <p className="mt-1.5 text-[0.85rem] leading-relaxed text-muted-foreground">
          We sent a verification code to{" "}
          <span className="font-medium text-foreground">{otpContext.email}</span>. Enter it below to
          continue.
        </p>

        <form onSubmit={handleVerify} className="mt-5 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gate-otp">Verification code</Label>
            <Input
              id="gate-otp"
              autoFocus
              autoComplete="one-time-code"
              maxLength={OTP_MAX_LENGTH}
              required
              value={code}
              onChange={(e) => setCode(sanitizeOtpInput(e.target.value))}
              placeholder="Enter your code"
              className="text-center text-[1.3rem] font-semibold tracking-[0.4em]"
            />
          </div>

          {error && <p className="text-[0.82rem] text-destructive">{error}</p>}

          <PremiumButton
            type="submit"
            tone="solid"
            shape="rounded"
            size="lg"
            className="mt-1 w-full"
            disabled={loading || !isOtpLengthPlausible(code)}
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Verify & see my results
          </PremiumButton>

          <div className="flex items-center justify-between text-[0.82rem]">
            <button
              type="button"
              onClick={() => {
                setMode(otpContext.shouldCreateUser ? "signup" : "signin");
                setCode("");
                setError(null);
              }}
              className="text-muted-foreground hover:text-primary"
            >
              Use a different email
            </button>
            <button
              type="button"
              disabled={resendCooldown > 0 || loading}
              onClick={() => requestCode(otpContext.email, otpContext.shouldCreateUser)}
              className="font-medium text-primary disabled:text-muted-foreground"
            >
              {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
            </button>
          </div>
        </form>
      </div>
    );
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

      <form onSubmit={handleSignupOrSigninSubmit} className="flex flex-col gap-3.5">
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
        {mode === "signin" && (
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
        )}

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
          {mode === "signup" ? "Send me a code" : "Sign in & see my results"}
        </PremiumButton>

        <div className="flex flex-col items-center gap-2">
          {mode === "signin" && (
            <button
              type="button"
              disabled={!email || loading}
              onClick={() => requestCode(email, false)}
              className="text-center text-[0.82rem] text-muted-foreground hover:text-primary disabled:opacity-50"
            >
              Forgot your password? Sign in with a code instead
            </button>
          )}
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
        </div>
      </form>
    </div>
  );
}
