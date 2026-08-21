import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
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
  /** Just the path (e.g. "/auth/callback") — `window.location.origin` is
   * resolved here, inside the click handler, never at render time. Reading
   * `window` while building a prop in a parent's render body crashes SSR
   * (React falls back to client-only rendering for the whole page to
   * recover from it) since `window` doesn't exist server-side. */
  redirectPath: string;
  className?: string;
}

/** A real OAuth trigger, not a decorative button — clicking this redirects
 * the whole page to Google's own consent screen via Supabase Auth, then
 * back to /auth/callback to complete the session. */
export function GoogleSignInButton({ redirectPath, className }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}${redirectPath}` },
      });
      if (oauthError) {
        console.error("[google-signin] failed:", oauthError);
        setError("Couldn't start Google sign-in — try again.");
        setLoading(false);
      }
      // On success the browser is already navigating to Google; nothing left to do here.
    } catch (err) {
      console.error("[google-signin] failed:", err);
      setError("Couldn't start Google sign-in — try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-[0.88rem] font-medium text-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-60",
          className,
        )}
      >
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <GoogleGlyph />}
        Continue with Google
      </button>
      {error && <p className="text-center text-[0.78rem] text-destructive">{error}</p>}
    </div>
  );
}
