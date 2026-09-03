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
