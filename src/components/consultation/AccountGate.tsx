import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { GoogleSignInButton } from "@/components/solventia/GoogleSignInButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { sendWelcomeEmailForNewUser } from "@/lib/actions/auth";
import { authErrorKey } from "@/lib/auth-error-messages";
import { OTP_MAX_LENGTH, sanitizeOtpInput, isOtpLengthPlausible } from "@/lib/otp";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { TextField } from "./ui";

type Mode = "signup" | "signin" | "otp";
const RESEND_COOLDOWN_SECONDS = 30;

const primaryBtn =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sol-navy px-6 text-[1rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft disabled:opacity-50";
const linkBtn =
  "text-[0.9375rem] font-semibold text-sol-violet-deep underline-offset-4 hover:underline disabled:opacity-50";

/** Inline sign-up / sign-in at the end of the consultation. Sign-up is
 * passwordless (a typed code, never a link) so the founder never leaves this
 * page; every Supabase Auth call runs from the browser client, which persists
 * the session into the cookies the server already reads. */
export function AccountGate({ onAuthenticated }: { onAuthenticated: (email: string) => void }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [otpContext, setOtpContext] = useState<{ email: string; shouldCreateUser: boolean } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<ReturnType<typeof authErrorKey> | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

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
    setErrorKey(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser,
          ...(shouldCreateUser && fullName ? { data: { full_name: fullName } } : {}),
        },
      });
      if (error) {
        console.error("[account-gate] sending code failed:", error);
        setErrorKey(authErrorKey("otp-send", error));
        return;
      }
      setOtpContext({ email: targetEmail, shouldCreateUser });
      setMode("otp");
      tickCooldown();
    } catch (err) {
      console.error("[account-gate] sending code failed:", err);
      setErrorKey(authErrorKey("otp-send", err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "signup") {
      await requestCode(email, true);
      return;
    }
    setLoading(true);
    setErrorKey(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("[account-gate] sign-in failed:", error);
        setErrorKey(authErrorKey("password", error));
        return;
      }
      queryClient.clear();
      onAuthenticated(email);
    } catch (err) {
      console.error("[account-gate] sign-in failed:", err);
      setErrorKey(authErrorKey("password", err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpContext) return;
    setLoading(true);
    setErrorKey(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: otpContext.email,
        token: code,
        type: "email",
      });
      if (error) {
        console.error("[account-gate] code verification failed:", error);
        setErrorKey(authErrorKey("otp-verify", error));
        return;
      }
      const user = data.user;
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
      setErrorKey(authErrorKey("otp-verify", err));
    } finally {
      setLoading(false);
    }
  }

  const errorText = errorKey ? t(errorKey) : null;

  if (mode === "otp" && otpContext) {
    return (
      <div className="sol-card p-6 sm:p-8" data-testid="account-gate-otp">
        <h2 className="sol-h3">{t("auth.otp.title")}</h2>
        <p className="sol-support mt-2">{t("auth.otp.body", { email: otpContext.email })}</p>
        <form onSubmit={handleVerify} className="mt-5 flex flex-col gap-4">
          <TextField
            id="gate-otp"
            testId="input-otp"
            label={t("auth.otp.label")}
            value={code}
            inputMode="numeric"
            maxLength={OTP_MAX_LENGTH}
            autoFocus
            autoComplete="one-time-code"
            placeholder={t("auth.otp.placeholder")}
            onChange={(v) => setCode(sanitizeOtpInput(v))}
          />
          {errorText && (
            <p role="alert" className="text-[0.9375rem] text-sol-warning">
              {errorText}
            </p>
          )}
          <button
            type="submit"
            className={primaryBtn}
            disabled={loading || !isOtpLengthPlausible(code)}
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {t("auth.otp.verifyResults")}
          </button>
          <div className="flex items-center justify-between">
            <button
              type="button"
              className={linkBtn}
              onClick={() => {
                setMode(otpContext.shouldCreateUser ? "signup" : "signin");
                setCode("");
                setErrorKey(null);
              }}
            >
              {t("auth.otp.differentEmail")}
            </button>
            <button
              type="button"
              className={linkBtn}
              disabled={resendCooldown > 0 || loading}
              onClick={() => requestCode(otpContext.email, otpContext.shouldCreateUser)}
            >
              {resendCooldown > 0
                ? t("auth.otp.resendIn", { s: resendCooldown })
                : t("auth.otp.resend")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="sol-card p-6 sm:p-8" data-testid="account-gate">
      <h2 className="sol-h3">
        {mode === "signup" ? t("auth.gate.createTitle") : t("auth.gate.signinTitle")}
      </h2>
      <p className="sol-support mt-2">{t("auth.gate.body")}</p>

      <div className="mt-5">
        <GoogleSignInButton redirectPath="/auth/callback?next=%2Fconsultation%3Fsubmit%3D1" />
      </div>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-sol-border" />
        <span className="text-[0.875rem] text-sol-secondary">{t("auth.or")}</span>
        <div className="h-px flex-1 bg-sol-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <TextField
            id="gate-name"
            label={t("auth.name")}
            value={fullName}
            autoComplete="name"
            placeholder={t("auth.namePlaceholder")}
            onChange={setFullName}
          />
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="gate-email" className="text-[0.9375rem] font-semibold text-sol-ink">
            {t("auth.email")}
          </label>
          <input
            id="gate-email"
            data-testid="input-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            className="h-12 w-full rounded-2xl border border-sol-border bg-sol-surface px-4 text-[1rem] text-sol-ink focus-visible:border-sol-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/30"
          />
        </div>
        {mode === "signin" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="gate-password" className="text-[0.9375rem] font-semibold text-sol-ink">
              {t("auth.password")}
            </label>
            <input
              id="gate-password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              className="h-12 w-full rounded-2xl border border-sol-border bg-sol-surface px-4 text-[1rem] text-sol-ink focus-visible:border-sol-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/30"
            />
          </div>
        )}

        {errorText && (
          <p role="alert" className="text-[0.9375rem] text-sol-warning">
            {errorText}
          </p>
        )}

        <button type="submit" className={primaryBtn} disabled={loading} data-testid="gate-submit">
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {mode === "signup" ? t("auth.sendCode") : t("auth.signinResults")}
        </button>

        <div className="flex flex-col items-center gap-2">
          {mode === "signin" && (
            <button
              type="button"
              className={linkBtn}
              disabled={!email || loading}
              onClick={() => requestCode(email, false)}
            >
              {t("auth.forgot")}
            </button>
          )}
          <button
            type="button"
            className={linkBtn}
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setErrorKey(null);
            }}
          >
            {mode === "signup" ? t("auth.haveAccount") : t("auth.newHere")}
          </button>
        </div>
      </form>
    </div>
  );
}
