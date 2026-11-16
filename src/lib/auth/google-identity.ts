/**
 * Google Identity Services (owner, 2026-11-16): Google's own "Continue with Google" button and One
 * Tap, so Google's consent names Solventia — the page's origin — instead of "to continue to
 * <project>.supabase.co" (the redirect flow goes through Supabase's domain). Same Google OAuth
 * client as the Supabase Google provider; its ID token is verified by Supabase
 * (signInWithGoogleIdToken). If Google's script cannot load (an ad blocker, a privacy browser,
 * no network to Google), the caller keeps the old redirect flow.
 */

/** The web client of the Supabase Google provider. Public by design (it is in every sign-in URL);
 * VITE_GOOGLE_CLIENT_ID overrides it. */
export const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ||
  "1010411082234-fi2mc8qj1meloqmi05qv8t719fjtmref.apps.googleusercontent.com";

const GIS_SRC = "https://accounts.google.com/gsi/client";
/** Longer than this and the redirect button stays: the founder is never kept waiting on Google. */
const LOAD_TIMEOUT_MS = 5_000;

export interface GoogleCredential {
  credential: string;
}
interface GoogleIdApi {
  initialize(config: Record<string, unknown>): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  prompt(listener?: (n: unknown) => void): void;
  cancel(): void;
}
type GoogleWindow = Window & { google?: { accounts?: { id?: GoogleIdApi } } };

let loading: Promise<GoogleIdApi | null> | null = null;

/** Loads Google's script once per page; null if it cannot (blocked, offline, too slow). */
export function loadGoogleIdentity(): Promise<GoogleIdApi | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const ready = () => (window as GoogleWindow).google?.accounts?.id ?? null;
  if (ready()) return Promise.resolve(ready());
  loading ??= new Promise<GoogleIdApi | null>((resolve) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    const timer = window.setTimeout(() => resolve(ready()), LOAD_TIMEOUT_MS);
    script.onload = () => {
      window.clearTimeout(timer);
      resolve(ready());
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      loading = null; // a later attempt may succeed (back online)
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** A fresh nonce: the raw value goes to Supabase, its SHA-256 (hex) to Google, which puts it in
 * the ID token — Supabase checks the two match, so a token cannot be replayed (Supabase docs,
 * "Sign in with Google", Google pre-built). */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

/** The one credential handler on the page (Google allows one `initialize` per page; the last
 * mounted button owns it). */
let handler: ((c: GoogleCredential) => void) | null = null;
let initializedWith: string | null = null;

/** Initializes Google's sign-in for this page with a fresh nonce; returns the raw nonce. */
export async function initGoogleIdentity(
  api: GoogleIdApi,
  onCredential: (c: GoogleCredential, rawNonce: string) => void,
): Promise<string> {
  const nonce = await makeNonce();
  handler = (c) => onCredential(c, nonce.raw);
  initializedWith = nonce.raw;
  api.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (c: GoogleCredential) => handler?.(c),
    nonce: nonce.hashed,
    // Never a silent sign-in with whichever account the browser last used.
    auto_select: false,
    cancel_on_tap_outside: true,
    context: "signin",
    ux_mode: "popup",
    itp_support: true,
    use_fedcm_for_prompt: true,
  });
  return initializedWith;
}
