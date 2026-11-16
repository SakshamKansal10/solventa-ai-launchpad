/**
 * Per-founder daily limits (go-live step 4) — the part the browser also needs: what a limit
 * error looks like, so each screen can say it in plain words instead of "something went wrong".
 */
export type LimitKind = "consultation" | "roadmap" | "askSol";

const PREFIX = "DAILY_LIMIT:";

export function dailyLimitError(kind: LimitKind, limit: number): Error {
  return new Error(`${PREFIX}${kind}:${limit}`);
}

/** The limit behind an error thrown by a server function, if that is what it was. */
export function parseDailyLimit(err: unknown): { kind: LimitKind; limit: number } | null {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const m = /DAILY_LIMIT:(consultation|roadmap|askSol):(\d+)/.exec(message);
  return m ? { kind: m[1] as LimitKind, limit: Number(m[2]) } : null;
}

/** Midnight in India (UTC+5:30, no daylight saving) at or before `now`, as an ISO string. */
export function startOfIndianDay(now: Date = new Date()): string {
  const IST = 330 * 60_000;
  const local = new Date(now.getTime() + IST);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - IST).toISOString();
}
