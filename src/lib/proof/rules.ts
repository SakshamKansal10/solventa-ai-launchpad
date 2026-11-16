import { z } from "zod";

import type { MissionEntry } from "@/lib/missions/workspace";
import type { AssumptionStatus } from "./links";

/**
 * Proof that updates itself (redesign-v2 part 4): an assumption names the mission that checks it
 * and a success rule in data. Its status is derived in code from what the founder logged there —
 * the AI never sets a status and the founder never picks "Supported".
 *
 * Example: {"metric":"interviews.answer","equals":"yes","threshold":3,"outOf":4} — supported once
 * 3 of the 4 interviews say yes; not supported once 3 can no longer be reached.
 */
export const successRuleSchema = z.object({
  metric: z.literal("interviews.answer"),
  equals: z.enum(["yes", "no"]),
  threshold: z.number().int().min(1).max(50),
  outOf: z.number().int().min(1).max(50),
});
export type SuccessRule = z.infer<typeof successRuleSchema>;

export interface RuleProgress {
  status: AssumptionStatus;
  logged: number;
  matching: number;
  notSure: number;
  threshold: number;
  outOf: number;
}

export function deriveRuleStatus(
  rule: SuccessRule,
  entries: readonly MissionEntry[],
): RuleProgress {
  const logs = entries.filter((e) => e.kind === "interview");
  const answer = (e: MissionEntry) => String(e.data.answer ?? "");
  const logged = logs.length;
  const matching = logs.filter((e) => answer(e) === rule.equals).length;
  const notSure = logs.filter((e) => answer(e) === "unsure").length;
  const base = { logged, matching, notSure, threshold: rule.threshold, outOf: rule.outOf };
  if (logged === 0) return { ...base, status: "not_tested" };
  if (matching >= rule.threshold) return { ...base, status: "supported" };
  // Even if every remaining interview matched, the threshold is out of reach.
  if (matching + Math.max(0, rule.outOf - logged) < rule.threshold)
    return {
      ...base,
      status: logged >= rule.outOf && notSure * 2 > logged ? "inconclusive" : "contradicted",
    };
  if (logged >= rule.outOf && notSure * 2 > logged) return { ...base, status: "inconclusive" };
  return { ...base, status: "testing" };
}

export function readSuccessRule(raw: unknown): SuccessRule | null {
  const r = successRuleSchema.safeParse(raw);
  return r.success && r.data.threshold <= r.data.outOf ? r.data : null;
}
