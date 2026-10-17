import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { BrandMark } from "@/components/brand/Brand";
import { exchangeCodeForSession } from "@/lib/actions/auth";
import { CONSULTATION_STORAGE_KEY } from "@/lib/consultation/store";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { sanitizeNextPath } from "@/lib/safe-redirect";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: z.object({
    code: z.string().optional(),
    error_description: z.string().optional(),
    // Carried through from SignInDialog / GoogleSignInButton when the founder
    // was bounced here from a protected route (e.g. a dashboard link from an
    // email). Re-validated below — never trusted as-is.
    next: z.string().optional(),
  }),
  component: AuthCallback,
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
});

/** A founder who finished every question signed-out and then signed in with
 * Google left the page entirely (Google → back here), so the in-page submit
 * never ran. Their answers survive in localStorage at the submit step; when
 * that's the case we send them straight back to /consultation?submit=1, where
 * the now-signed-in page starts the analysis visibly — with the same
 * idempotency guard as any other submit — instead of generating invisibly
 * behind a spinner here. */
function hasPendingSubmit(): boolean {
  try {
    const raw = window.localStorage.getItem(CONSULTATION_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as {
      answers?: Record<string, unknown>;
      screenKey?: string | null;
    };
    return parsed.screenKey === "submit" && Object.keys(parsed.answers ?? {}).length > 0;
  } catch {
    return false;
  }
}

/** Every OAuth provider redirect (Google) lands here with a one-time `code`;
 * this exchanges it for a real session, then returns the founder to exactly
 * where they were headed. */
function AuthCallback() {
  const { code, error_description, next } = Route.useSearch();
  const { t } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // A provider-supplied `error_description` comes from the URL, so it is logged
  // and replaced by our own localized message — never rendered as-is.
  const [error, setError] = useState<string | null>(
    error_description ? t("auth.callback.generic") : null,
  );
  const [resuming, setResuming] = useState(false);
  const ranRef = useRef(false);

  useEffect(() => {
    if (error_description) {
      console.error("[auth-callback] provider returned an error:", error_description);
      return;
    }
    if (ranRef.current) return;
    if (!code) {
      setError(t("auth.callback.missingCode"));
      return;
    }
    ranRef.current = true;

    (async () => {
      const result = await exchangeCodeForSession({ data: { code } });
      if (!result.ok) {
        console.error("[auth-callback] code exchange failed:", result.error);
        setError(t("auth.callback.generic"));
        return;
      }
      // A different account may be completing OAuth on a tab that still holds
      // the previous account's cached data.
      queryClient.clear();

      const safeNext = sanitizeNextPath(next);
      // A pending finished consultation wins over a generic `next`, except
      // when `next` already IS the consultation resume link.
      if (hasPendingSubmit() && !(safeNext ?? "").startsWith("/consultation")) {
        setResuming(true);
        window.location.assign("/consultation?submit=1");
        return;
      }
      if (safeNext) {
        // A full navigation — `next` can carry a query string (a specific
        // consultation or week) a typed router navigate isn't built to pass.
        window.location.assign(safeNext);
        return;
      }
      navigate({ to: "/dashboard" });
    })().catch(() => setError(t("auth.callback.generic")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, error_description, next]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-sol-pearl px-6 text-center">
        <h1 className="sol-h2">{t("auth.callback.linkFailedTitle")}</h1>
        <p role="alert" className="max-w-sm text-[1.0625rem] text-sol-ink">
          {error}
        </p>
        <p className="max-w-sm text-[1rem] text-sol-secondary">
          {t("auth.callback.linkFailedBody")}
        </p>
        <a
          href="/"
          className="inline-flex h-12 items-center rounded-2xl bg-sol-navy px-6 text-[1rem] font-semibold text-white hover:bg-sol-navy-soft"
        >
          {t("auth.callback.backHome")}
        </a>
      </div>
    );
  }

  // A calm holding screen: the approved emblem, one clear line, and a slim champagne
  // line that travels while the session is confirmed (still under reduced motion).
  return (
    <div
      role="status"
      className="flex min-h-dvh flex-col items-center justify-center bg-sol-pearl px-6 text-center"
    >
      <BrandMark height={48} />
      <p className="mt-8 text-[1.25rem] font-semibold tracking-[-0.01em] text-sol-ink">
        {resuming ? t("auth.callback.resuming") : t("auth.callback.confirming")}
      </p>
      <span
        aria-hidden="true"
        className="mt-6 block h-[2px] w-44 overflow-hidden rounded-full bg-sol-ink/10"
      >
        <span className="block h-full w-1/3 rounded-full bg-sol-champagne motion-safe:animate-[sol-progress_1.6s_cubic-bezier(0.45,0,0.2,1)_infinite] motion-reduce:w-full motion-reduce:opacity-60" />
      </span>
    </div>
  );
}
