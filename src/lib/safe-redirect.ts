/**
 * Only ever accepts a same-origin, in-app path (optionally with a query
 * string/hash) — used to round-trip a founder back to the exact place
 * they were trying to reach (a protected dashboard route, or a deep link
 * from an email) after they sign in. Never accepts a full URL, a
 * protocol-relative URL ("//evil.com"), or anything else that could send
 * a freshly-authenticated session off this site — resolving against a
 * fixed dummy origin and confirming the origin didn't change is the most
 * reliable check; naive prefix checks miss backslash/control-character
 * tricks browsers still normalize before following a redirect.
 */
export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/")) return null;
  const DUMMY_ORIGIN = "https://solventia.internal";
  try {
    const resolved = new URL(raw, DUMMY_ORIGIN);
    if (resolved.origin !== DUMMY_ORIGIN) return null;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return null;
  }
}
