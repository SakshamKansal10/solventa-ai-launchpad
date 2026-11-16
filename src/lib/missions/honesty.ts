import type { MissionEntry } from "./workspace";

/**
 * Logs that look too neat (part 4, feature 2): every answer the same, or several conversations
 * saved within minutes of each other. Never an accusation and never a block — the page shows a
 * gentle prompt from Sol asking for one detail from each conversation.
 */
export function looksTooNeat(entries: readonly MissionEntry[]): boolean {
  const logs = entries.filter((e) => e.kind === "interview");
  if (logs.length < 3) return false;
  const answers = new Set(logs.map((l) => String(l.data.answer ?? "")));
  const words = logs.map((l) => String(l.data.words ?? "").trim());
  const times = logs
    .map((l) => Date.parse(l.createdAt))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const quick = times.length >= 3 && times[times.length - 1] - times[0] < 10 * 60_000;
  const noDetail = words.filter((w) => w.length < 12).length >= Math.ceil(logs.length / 2);
  return (answers.size === 1 && noDetail) || quick;
}
