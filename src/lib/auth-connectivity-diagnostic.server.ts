/**
 * TEMPORARY root-cause diagnostic for the sendOtp "AuthRetryableFetchError:
 * fetch failed, status 0" seen in production. Bypasses supabase-js entirely
 * and probes Supabase's REST endpoints with native fetch() directly, since
 * auth-js's AuthRetryableFetchError does not forward the original fetch
 * error's `.cause` (confirmed — production logs showed errorCause: null
 * even though the underlying fetch demonstrably failed), leaving no way to
 * see the real network-level reason through supabase-js alone.
 *
 * Gated behind AUTH_CONNECTIVITY_DIAGNOSTIC=true (see env.server.ts) —
 * inert by default. When on, sendOtp also POSTs directly to
 * /auth/v1/otp, which (like the real supabase-js call it's diagnosing)
 * sends an actual OTP email. Turn the env var back off once the root
 * cause is confirmed; this file can be deleted entirely at that point.
 *
 * Never logs: the anon key or URL in full (only booleans/hostname), the
 * full email (only masked), the full decoded JWT payload (only whether a
 * ref/project_ref field matches the expected project), passwords, OTP
 * codes, tokens, cookies, or auth headers.
 */
import { EXPECTED_SUPABASE_PROJECT_REF, currentEnvironment } from "@/lib/auth-diagnostics.server";

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

interface UrlCheck {
  urlValid: boolean;
  urlHost: string | null;
}

/** new URL() throwing, a non-https protocol, or a hostname that doesn't
 * match the expected project are three distinct, real ways this could be
 * misconfigured — collapsed into one boolean plus the (non-secret)
 * hostname for logging. */
function validateSupabaseUrl(raw: string | undefined): UrlCheck {
  const trimmed = raw?.trim();
  if (!trimmed) return { urlValid: false, urlHost: null };
  try {
    const parsed = new URL(trimmed);
    const valid =
      parsed.protocol === "https:" &&
      parsed.hostname === `${EXPECTED_SUPABASE_PROJECT_REF}.supabase.co`;
    return { urlValid: valid, urlHost: parsed.hostname };
  } catch {
    return { urlValid: false, urlHost: null };
  }
}

interface JwtCheck {
  anonKeyExists: boolean;
  anonKeyTrimmedLength: number;
  anonKeyLooksLikeJwt: boolean;
  anonKeyProjectRefMatches: boolean | null;
}

/** Decodes the JWT header/payload WITHOUT verifying a signature — this is
 * a client-side anon key anyone can already decode this same way, so
 * inspecting its shape isn't a security concern. Only ever extracts the
 * project ref for a match check; the decoded payload itself is never
 * logged or returned. */
function inspectAnonKeyJwt(raw: string | undefined): JwtCheck {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return {
      anonKeyExists: false,
      anonKeyTrimmedLength: 0,
      anonKeyLooksLikeJwt: false,
      anonKeyProjectRefMatches: null,
    };
  }
  const parts = trimmed.split(".");
  const looksLikeJwt = trimmed.startsWith("eyJ") && parts.length === 3;
  let projectRefMatches: boolean | null = null;
  if (looksLikeJwt) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<
        string,
        unknown
      >;
      const ref = (payload.ref ?? payload.project_ref) as string | undefined;
      if (ref) projectRefMatches = ref === EXPECTED_SUPABASE_PROJECT_REF;
    } catch {
      // Malformed payload — leave projectRefMatches null rather than guess.
    }
  }
  return {
    anonKeyExists: true,
    anonKeyTrimmedLength: trimmed.length,
    anonKeyLooksLikeJwt: looksLikeJwt,
    anonKeyProjectRefMatches: projectRefMatches,
  };
}

/** Pulls a short, safe message out of a Supabase REST error response body
 * without ever assuming its shape — never returns more than ~200 chars,
 * and the body itself (which could theoretically echo back request data)
 * is never logged in full. */
async function safeErrorMessageFrom(response: Response): Promise<string | null> {
  try {
    const text = await response.clone().text();
    if (!text) return null;
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      const message = (json.msg ?? json.message ?? json.error_description ?? json.error) as
        string | undefined;
      return message ? message.slice(0, 200) : null;
    } catch {
      return text.slice(0, 200);
    }
  } catch {
    return null;
  }
}

export interface ConnectivityDiagnosticResult {
  urlValid: boolean;
  urlHost: string | null;
  anonKeyExists: boolean;
  anonKeyLooksLikeJwt: boolean;
  anonKeyProjectRefMatches: boolean | null;
  nativeSettingsStatus: number | null;
  nativeSettingsError: string | null;
  nativeOtpStatus: number | null;
  nativeOtpError: string | null;
}

/** The actual probe: GET /auth/v1/settings (should always succeed with a
 * valid URL+key, proves basic Vercel-to-Supabase reachability with zero
 * side effects), then POST /auth/v1/otp (the exact endpoint signInWithOtp
 * itself calls — proves whether the OTP endpoint specifically is reachable
 * and accepts this key, independent of supabase-js). */
export async function runNativeConnectivityProbe(
  supabaseUrlRaw: string | undefined,
  anonKeyRaw: string | undefined,
  email: string,
): Promise<ConnectivityDiagnosticResult> {
  const { urlValid, urlHost } = validateSupabaseUrl(supabaseUrlRaw);
  const { anonKeyExists, anonKeyLooksLikeJwt, anonKeyProjectRefMatches } =
    inspectAnonKeyJwt(anonKeyRaw);

  const result: ConnectivityDiagnosticResult = {
    urlValid,
    urlHost,
    anonKeyExists,
    anonKeyLooksLikeJwt,
    anonKeyProjectRefMatches,
    nativeSettingsStatus: null,
    nativeSettingsError: null,
    nativeOtpStatus: null,
    nativeOtpError: null,
  };

  const supabaseUrl = supabaseUrlRaw?.trim();
  const anonKey = anonKeyRaw?.trim();
  if (!urlValid || !supabaseUrl || !anonKey) {
    console.error(
      "AUTH_CONNECTIVITY_DIAGNOSTIC",
      JSON.stringify({
        stage: "precondition_failed",
        environment: currentEnvironment(),
        urlValid,
        urlHost,
        anonKeyExists,
        timestamp: new Date().toISOString(),
      }),
    );
    return result;
  }

  try {
    const settingsRes = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    result.nativeSettingsStatus = settingsRes.status;
    if (!settingsRes.ok) result.nativeSettingsError = await safeErrorMessageFrom(settingsRes);
  } catch (err) {
    result.nativeSettingsError =
      err instanceof Error ? `${err.name}: ${err.message}` : "unknown fetch error";
  }

  console.info(
    "AUTH_CONNECTIVITY_DIAGNOSTIC",
    JSON.stringify({
      stage: "native_settings_probe",
      environment: currentEnvironment(),
      urlHost,
      status: result.nativeSettingsStatus,
      error: result.nativeSettingsError,
      timestamp: new Date().toISOString(),
    }),
  );

  try {
    const otpRes = await fetch(`${supabaseUrl}/auth/v1/otp`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        "x-client-info": "solventia-auth-diagnostic",
      },
      body: JSON.stringify({ email, create_user: true }),
    });
    result.nativeOtpStatus = otpRes.status;
    if (!otpRes.ok) result.nativeOtpError = await safeErrorMessageFrom(otpRes);
  } catch (err) {
    result.nativeOtpError =
      err instanceof Error ? `${err.name}: ${err.message}` : "unknown fetch error";
  }

  console.info(
    "AUTH_CONNECTIVITY_DIAGNOSTIC",
    JSON.stringify({
      stage: "native_otp_probe",
      environment: currentEnvironment(),
      urlHost,
      email: maskEmail(email),
      status: result.nativeOtpStatus,
      error: result.nativeOtpError,
      timestamp: new Date().toISOString(),
    }),
  );

  return result;
}
