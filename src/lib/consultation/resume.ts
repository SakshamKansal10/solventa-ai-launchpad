import { useEffect, useRef } from "react";

import { getConsultationDraft } from "@/lib/actions/consultation";
import { CONSULTATION_STORAGE_KEY } from "@/lib/consultation/store";

/**
 * Finishing the consultation as a guest, then signing in with Google, must end with the analysis
 * running — never on an empty dashboard (owner bug report, 2026-11-16).
 *
 * The Google round trip is a full-page redirect: AccountGate's `onAuthenticated → run()` is gone
 * by the time the founder returns, and a `?next=` inside `redirectTo` is lost whenever Supabase
 * falls back to its Site URL (a redirect URL not on its allow-list). So the intent is written to
 * localStorage before leaving, the callback reads it, and — as a safety net — any signed-in page
 * that sees a finished consultation with no analysis sends the founder back to generate it.
 */
const AUTH_NEXT_KEY = "sol-auth-next";
const AUTH_NEXT_TTL_MS = 30 * 60 * 1000;
export const RESUME_PATH = "/consultation?submit=1";

export function rememberAuthNext(path: string | null) {
  try {
    if (path) localStorage.setItem(AUTH_NEXT_KEY, JSON.stringify({ path, at: Date.now() }));
    else localStorage.removeItem(AUTH_NEXT_KEY);
  } catch {
    /* storage blocked: the safety net still resumes a finished consultation */
  }
}

/** The path saved before an OAuth redirect (once; it expires after 30 minutes). */
export function takeAuthNext(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_NEXT_KEY);
    localStorage.removeItem(AUTH_NEXT_KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number };
    return path && at && Date.now() - at < AUTH_NEXT_TTL_MS ? path : null;
  } catch {
    return null;
  }
}

/** A consultation answered to the end on this device but not yet analysed. */
export function hasFinishedLocalDraft(): boolean {
  try {
    const raw = localStorage.getItem(CONSULTATION_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as {
      answers?: Record<string, unknown>;
      screenKey?: string | null;
    };
    return parsed.screenKey === "submit" && Object.keys(parsed.answers ?? {}).length > 1;
  } catch {
    return false;
  }
}

/**
 * The safety net: signed in, no analysis yet, and a finished consultation (this device, or the
 * saved server draft) → back to its last step, where generation starts by itself.
 */
export function useResumeFinishedConsultation({
  signedIn,
  hasAnalysis,
}: {
  signedIn: boolean;
  /** null while unknown. */
  hasAnalysis: boolean | null;
}) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !signedIn || hasAnalysis !== false) return;
    done.current = true;
    if (hasFinishedLocalDraft()) {
      window.location.assign(RESUME_PATH);
      return;
    }
    getConsultationDraft()
      .then((d) => {
        if (d?.screenKey === "submit" && Object.keys(d.answers ?? {}).length > 1)
          window.location.assign(RESUME_PATH);
      })
      .catch(() => undefined);
  }, [signedIn, hasAnalysis]);
}
