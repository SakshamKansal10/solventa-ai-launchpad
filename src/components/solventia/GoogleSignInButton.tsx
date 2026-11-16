import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { rememberAuthNext } from "@/lib/consultation/resume";
import { Loader2 } from "lucide-react";
import { signInWithGoogleIdToken } from "@/lib/actions/auth";
import { pathAfterSignIn } from "@/lib/auth/after-sign-in";
import { initGoogleIdentity, loadGoogleIdentity } from "@/lib/auth/google-identity";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** Google's four-colour "G" — used unmodified, per Google's branding rules. */
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.87c2.27-2.09 3.57-5.17 3.57-8.84z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.87-3.02c-1.08.72-2.46 1.15-4.08 1.15-3.13 0-5.79-2.11-6.74-4.96H1.27v3.12C3.25 21.3 7.28 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.26 14.27a7.15 7.15 0 0 1 0-4.54V6.61H1.27a11.98 11.98 0 0 0 0 10.78l3.99-3.12z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.28 0 3.25 2.7 1.27 6.61l3.99 3.12C6.21 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  /** Just the path (e.g. "/auth/callback?next=…") — `window.location.origin`
   * is resolved inside the click handler, never at render time (reading
   * `window` while rendering crashes SSR). Any `next` value inside it has
   * already been through sanitizeNextPath by the caller, and the callback
   * re-validates it again before navigating. */
  redirectPath: string;
  className?: string;
}

/**
 * "Continue with Google" (owner, 2026-11-16). Google's own button (and One Tap) when Google's
 * script loads: Google then shows "to continue to Solventia" — the page's origin — and the ID
 * token is verified by Supabase on our server (signInWithGoogleIdToken). Until the script is
 * ready, or if it never loads (ad blockers, privacy browsers), this is the old redirect flow:
 * the whole page goes to Google via Supabase Auth, then back to /auth/callback. Either way the
 * founder lands where /auth/callback would send them (pathAfterSignIn): after the consultation,
 * idea generation (/consultation?submit=1). The fallback is styled to Google's "Sign in with
 * Google" light-theme guidelines (white fill, 1px neutral border, #1F1F1F medium-weight label,
 * unmodified four-colour G); Google's button is its pill, large, outline (white) version.
 */
export function GoogleSignInButton({ redirectPath, className }: GoogleSignInButtonProps) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Google's button: "loading" (the redirect button shows meanwhile), "ready", or "off".
  const [gis, setGis] = useState<"loading" | "ready" | "off">("loading");
  const slot = useRef<HTMLDivElement>(null);
  const finishRef = useRef<(token: string, nonce: string) => void>(() => {});
  finishRef.current = (token, nonce) => {
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const result = await signInWithGoogleIdToken({ data: { token, nonce } });
        if (!result.ok) throw new Error(result.error);
        const next = new URL(redirectPath, window.location.origin).searchParams.get("next");
        window.location.assign(pathAfterSignIn(next, queryClient));
      } catch (err) {
        console.error("[google-signin] Google ID token sign-in failed:", err);
        setError(t("auth.google.error"));
        setLoading(false);
      }
    })();
  };

  useEffect(() => {
    let live = true;
    void (async () => {
      const api = await loadGoogleIdentity();
      if (!live) return;
      if (!api || !slot.current) {
        setGis("off");
        return;
      }
      try {
        await initGoogleIdentity(api, (c, nonce) => finishRef.current(c.credential, nonce));
        if (!live || !slot.current) return;
        api.renderButton(slot.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "center",
          width: Math.min(400, Math.max(200, Math.round(slot.current.clientWidth || 320))),
          locale: locale === "hi" ? "hi" : "en",
        });
        setGis("ready");
        // One Tap: Google's own prompt, for a founder already signed in to Google.
        api.prompt();
      } catch (err) {
        console.error("[google-signin] Google's button failed; using the redirect:", err);
        if (live) setGis("off");
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      // Where to go after Google is kept on this device, not only in the URL: Supabase drops
      // a redirect it does not allow-list (falling back to its Site URL), and with it any ?next=.
      const target = new URL(redirectPath, window.location.origin);
      rememberAuthNext(target.searchParams.get("next"));
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`,
          // Always the account chooser, never a silent sign-in with whichever Google account
          // the browser last used.
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) {
        console.error("[google-signin] failed:", oauthError);
        setError(t("auth.google.error"));
        setLoading(false);
      }
      // On success the browser is already navigating to Google.
    } catch (err) {
      console.error("[google-signin] failed:", err);
      setError(t("auth.google.error"));
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={slot}
        data-testid="google-gis"
        data-state={gis}
        className={cn("flex w-full justify-center", gis === "ready" ? "min-h-12 items-center" : "")}
      />
      {loading && gis === "ready" && (
        <p role="status" className="flex items-center justify-center gap-2 text-[0.9375rem]">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t("auth.google.signingIn")}
        </p>
      )}
      {gis !== "ready" && (
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          data-testid="google-signin"
          className={cn(
            "inline-flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#747775] bg-white px-4 text-[0.9375rem] font-medium text-[#1F1F1F] transition-colors hover:bg-[#F8F9FA] focus-visible:ring-2 focus-visible:ring-sol-cobalt/40 disabled:pointer-events-none disabled:opacity-60",
            className,
          )}
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <GoogleGlyph />
          )}
          {t("auth.google.continue")}
        </button>
      )}
      {error && (
        <p role="alert" className="text-center text-[0.9375rem] text-sol-warning">
          {error}
        </p>
      )}
    </div>
  );
}
