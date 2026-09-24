/**
 * Client-safe (no .server suffix — imported from browser components)
 * error-message mapping for the OTP/password flows, which now call
 * Supabase Auth directly from the browser (see AccountGate.tsx,
 * SignInDialog.tsx) rather than through a TanStack server function.
 * Never logs anything itself — callers decide whether to console.error
 * the raw error for their own debugging; this module only ever turns a
 * Supabase AuthError into one of a small set of calm, specific messages.
 */

interface AuthErrorLike {
  status?: number;
  message?: string;
}

function isRateLimited(error: AuthErrorLike): boolean {
  return error.status === 429 || (error.message ?? "").toLowerCase().includes("rate limit");
}

export function getOtpSendErrorMessage(error: unknown): string {
  const e = (error ?? {}) as AuthErrorLike;
  if (isRateLimited(e)) return "Too many attempts. Please wait before trying again.";
  return "Could not send code. Please try again.";
}

export function getOtpVerifyErrorMessage(error: unknown): string {
  const e = (error ?? {}) as AuthErrorLike;
  if (isRateLimited(e)) return "Too many attempts. Please wait before trying again.";
  return "That code is incorrect or has expired.";
}

export function getPasswordSignInErrorMessage(error: unknown): string {
  const e = (error ?? {}) as AuthErrorLike;
  if (isRateLimited(e)) return "Too many attempts. Please wait before trying again.";
  return "Invalid email or password.";
}

/** Message KEYS for the same three cases, so components can render them in the
 * reader's language. The English functions above remain the canonical text
 * (and what the tests pin); these only choose which localized key applies. */
export type AuthErrorKey =
  "auth.error.rate" | "auth.error.sendCode" | "auth.error.verify" | "auth.error.password";

export function authErrorKey(
  kind: "otp-send" | "otp-verify" | "password",
  error: unknown,
): AuthErrorKey {
  const e = (error ?? {}) as AuthErrorLike;
  if (isRateLimited(e)) return "auth.error.rate";
  if (kind === "otp-send") return "auth.error.sendCode";
  if (kind === "otp-verify") return "auth.error.verify";
  return "auth.error.password";
}
