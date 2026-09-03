/**
 * Production-safe diagnostics for the auth server actions (signIn, sendOtp,
 * verifyOtpCode). Exists because every one of those actions used to catch
 * a Supabase error and return only `error.message` to the client — which,
 * for a genuine network-level failure (Node's fetch throwing because the
 * request to Supabase never got a response), is the single unhelpful
 * string "fetch failed" with the actual cause (DNS failure, TLS error,
 * timeout, connection refused, a paused project, ...) silently dropped.
 * These helpers log that real cause server-side (visible in Vercel Logs)
 * while the user only ever sees a short, safe, classified message.
 *
 * Never logs: password, OTP code, full email address, full Supabase key,
 * Authorization headers, cookies, access/refresh tokens. Only presence
 * booleans, safe-masked values, and error metadata (name/message/status/
 * code/cause/stack) — none of which can contain a secret on their own for
 * the errors this module handles (Supabase AuthErrors and Node fetch
 * failures don't embed credentials in their message/stack).
 */

/** The project ref this app is expected to be pointed at — given directly
 * by the project owner for this diagnostic, not a secret (it's the public
 * subdomain segment of the Supabase project URL, visible to anyone who
 * sees a request to it). Used only to confirm SUPABASE_URL wasn't quietly
 * pointed at a different (e.g. stale/wrong-environment) project. */
const EXPECTED_SUPABASE_PROJECT_REF = "dcnurhuxgdzxruqsgjgx";

function currentEnvironment(): string {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
}

/** First character + domain only — enough to spot "obviously wrong" input
 * in a log line without ever storing a real address. */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

/** Call at the very start of every auth server action handler — before
 * any Supabase call — so a failure that happens before Supabase even
 * responds (e.g. the fetch never completing) still has this line in the
 * logs to compare against. */
export function logAuthActionStart(action: string, context?: { email?: string }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const viteSupabaseUrl = process.env.VITE_SUPABASE_URL;
  const viteSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  console.info(
    "AUTH_ACTION_START",
    JSON.stringify({
      action,
      environment: currentEnvironment(),
      email: context?.email ? maskEmail(context.email) : undefined,
      supabaseUrlExists: Boolean(supabaseUrl),
      supabaseUrlStartsWithHttps: supabaseUrl?.startsWith("https://") ?? false,
      supabaseUrlMatchesExpectedProject:
        supabaseUrl?.includes(EXPECTED_SUPABASE_PROJECT_REF) ?? false,
      supabaseAnonKeyExists: Boolean(supabaseAnonKey),
      viteSupabaseUrlExists: Boolean(viteSupabaseUrl),
      viteSupabaseAnonKeyExists: Boolean(viteSupabaseAnonKey),
      timestamp: new Date().toISOString(),
    }),
  );
}

export type AuthErrorCategory =
  | "AUTH_NETWORK_UNREACHABLE" // the request to Supabase itself failed (fetch threw)
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_RATE_LIMITED"
  | "AUTH_INVALID_CODE" // wrong/expired OTP
  | "AUTH_CONFIG_ERROR" // env vars missing/malformed — should be rare, caught earlier
  | "AUTH_UNKNOWN";

interface ClassifiedAuthError {
  category: AuthErrorCategory;
  /** Short, safe, specific-enough-to-be-useful message shown to the user
   * — never the raw provider error text. */
  userMessage: string;
}

/** Supabase AuthError shape (both the thrown-exception form and the
 * `{ data, error }` returned form use the same class) — typed loosely
 * since we only ever read metadata fields off it, never assume presence. */
interface AuthErrorLike {
  name?: string;
  message?: string;
  status?: number;
  code?: string;
  cause?: unknown;
  stack?: string;
}

function classify(error: AuthErrorLike): ClassifiedAuthError {
  const message = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();

  // Node's global fetch (undici) throws exactly this message when the
  // request never got a response at all — DNS failure, TLS error,
  // timeout, connection refused, or the Supabase project being paused.
  // Supabase-js itself wraps the same failure as AuthRetryableFetchError,
  // whose .message is also literally "fetch failed".
  if (message.includes("fetch failed") || error.name === "AuthRetryableFetchError") {
    return {
      category: "AUTH_NETWORK_UNREACHABLE",
      userMessage:
        "Unable to contact the authentication service right now. Please try again in a moment.",
    };
  }
  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return { category: "AUTH_INVALID_CREDENTIALS", userMessage: "Invalid email or password." };
  }
  if (
    code.includes("otp") ||
    message.includes("token has expired") ||
    message.includes("invalid otp") ||
    message.includes("invalid token")
  ) {
    return {
      category: "AUTH_INVALID_CODE",
      userMessage: "That code is incorrect or has expired — request a new one and try again.",
    };
  }
  if (error.status === 429 || code.includes("rate_limit") || message.includes("rate limit")) {
    return {
      category: "AUTH_RATE_LIMITED",
      userMessage: "Too many attempts — please wait a moment and try again.",
    };
  }
  if (message.includes("missing or invalid server environment variable")) {
    return {
      category: "AUTH_CONFIG_ERROR",
      userMessage: "Authentication is temporarily unavailable. Please try again shortly.",
    };
  }
  return {
    category: "AUTH_UNKNOWN",
    userMessage: "Something went wrong signing you in. Please try again.",
  };
}

/** Call from every catch block AND from every `if (error) { ... }` branch
 * on a Supabase auth response — logs full, safe diagnostic detail
 * server-side and returns the short, classified message to show the user.
 * Always returns a string; never throws. */
export function classifyAndLogAuthError(action: string, error: unknown): string {
  const errorLike: AuthErrorLike =
    error && typeof error === "object"
      ? (error as AuthErrorLike)
      : { message: typeof error === "string" ? error : String(error) };

  const classified = classify(errorLike);

  console.error(
    "AUTH_ACTION_ERROR",
    JSON.stringify({
      action,
      environment: currentEnvironment(),
      category: classified.category,
      errorName: errorLike.name ?? null,
      errorMessage: errorLike.message ?? null,
      errorStatus: errorLike.status ?? null,
      errorCode: errorLike.code ?? null,
      // A raw fetch failure's real cause (ENOTFOUND, ECONNREFUSED, a TLS
      // error, an AbortError from a timeout, ...) lives here — this is
      // the one field that actually explains a bare "fetch failed".
      errorCause: errorLike.cause ? String(errorLike.cause) : null,
      stack: errorLike.stack ?? null,
      timestamp: new Date().toISOString(),
    }),
  );

  return classified.userMessage;
}
