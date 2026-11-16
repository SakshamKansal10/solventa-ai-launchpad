import type { QueryClient } from "@tanstack/react-query";

import { CONSULTATION_STORAGE_KEY } from "@/lib/consultation/store";
import { takeAuthNext } from "@/lib/consultation/resume";
import { sanitizeNextPath } from "@/lib/safe-redirect";

/** A founder who finished every question signed-out and then signed in: their answers survive in
 * localStorage at the submit step, and /consultation?submit=1 starts the analysis visibly — with
 * the same idempotency guard as any other submit. */
export function hasPendingSubmit(): boolean {
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

/**
 * Where a founder goes once signed in — the same for every way of signing in (the Google
 * redirect's /auth/callback, and Google's own button or One Tap on the page):
 * a finished, unanalysed consultation → /consultation?submit=1 (idea generation, never an empty
 * dashboard); else the `next` they were headed to (from the URL, else the one saved before
 * leaving for Google); else the dashboard. Returns the path to open.
 */
export function pathAfterSignIn(next: string | null | undefined, queryClient: QueryClient): string {
  // A different account may be signing in on a tab that still holds the previous one's data.
  queryClient.clear();
  const saved = takeAuthNext();
  const safeNext = sanitizeNextPath(next ?? undefined) ?? sanitizeNextPath(saved ?? undefined);
  // A pending finished consultation wins over a generic `next`, except when `next` already IS
  // the consultation resume link.
  if (hasPendingSubmit() && !(safeNext ?? "").startsWith("/consultation")) {
    return "/consultation?submit=1";
  }
  return safeNext ?? "/dashboard";
}
