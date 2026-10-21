import type { NormalizedProfile } from "@/lib/profile/normalize";
import { statedCapital, statedHours } from "@/lib/fit/model";

/**
 * A last line of defence for AI prose shown as a fact about the founder. The
 * prompts forbid these claims; this catches the ones a model makes anyway (and
 * ones stored before the rules existed) so they are never displayed:
 *
 *   hours_single   "your 35 hours a week" when they stated a range (30–40)
 *   budget_single  "you have ₹30,000" when they stated a range
 *   place          "your presence in Ambala" when they never gave that place
 *
 * Deterministic and conservative: it only flags sentences that are ABOUT the
 * founder ("you", "your") — a direction's own estimated cost or a market's
 * location is not a personal claim.
 */
export type IntegrityIssue = "hours_single" | "budget_single" | "place";

const ABOUT_FOUNDER = /\b(you|your|you're|you've)\b/i;
const HOURS = /(\d{1,3}(?:\.\d+)?)\s*(?:\+\s*)?(?:hours?|hrs?)\b/gi;
const MONEY =
  /(?:₹|\$|€|£|Rs\.?\s?|INR\s?|USD\s?)\s?(\d[\d,]*(?:\.\d+)?)(\s?(?:k|lakh|lac|crore|cr|m|million))?/gi;
const PLACE =
  /\b(?:presence|based|located|living|lives|live|stay|staying|local(?:ly)?|access)\s+(?:in|at|near|around|to)\s+([A-Z][\p{L}]+(?:\s[A-Z][\p{L}]+)?)/gu;

function amount(digits: string, suffix: string | undefined): number {
  const n = Number(digits.replace(/,/g, ""));
  const s = (suffix ?? "").trim().toLowerCase();
  if (s === "k") return n * 1_000;
  if (s === "lakh" || s === "lac") return n * 100_000;
  if (s === "crore" || s === "cr") return n * 10_000_000;
  if (s === "m" || s === "million") return n * 1_000_000;
  return n;
}

export function findIntegrityIssues(text: string, profile: NormalizedProfile): IntegrityIssue[] {
  const issues = new Set<IntegrityIssue>();
  if (!ABOUT_FOUNDER.test(text)) return [];

  const hours = statedHours(profile);
  for (const m of text.matchAll(HOURS)) {
    const n = Number(m[1]);
    const isBound = hours && (n === hours.min || n === hours.max);
    if (!isBound) issues.add("hours_single");
  }

  const cap = statedCapital(profile);
  const mentionsHaving =
    /\b(you have|you've got|your budget|available to you|you can (?:spend|invest)|your (?:capital|savings|money))\b/i;
  if (mentionsHaving.test(text)) {
    for (const m of text.matchAll(MONEY)) {
      const n = amount(m[1], m[2]);
      const isBound = cap && (n === cap.min || n === cap.max);
      if (!isBound) issues.add("budget_single");
    }
  }

  const known = [profile.identity.city, profile.identity.state, profile.identity.country]
    .filter((x): x is string => Boolean(x))
    .map((x) => x.toLowerCase());
  for (const m of text.matchAll(PLACE)) {
    const place = m[1].toLowerCase();
    if (!known.some((k) => k === place || k.includes(place) || place.includes(k)))
      issues.add("place");
  }
  return [...issues];
}

/** Keeps only the personal reasons the founder's own profile supports. */
export function keepSupportedReasons(
  reasons: string[],
  profile: NormalizedProfile | null,
): string[] {
  if (!profile) return reasons;
  return reasons.filter((r) => findIntegrityIssues(r, profile).length === 0);
}

interface PersonalProse {
  whyThisFounder: string[];
  advantages: string[];
  criticalAssumptions: string[];
  criticalAssumptionCategories: string[];
  successCriteria: string[];
  reconsiderIf: string[];
}

/** A direction's displayed prose with every unsupported personal claim removed —
 * the same filter for the English page and for what is sent to be translated,
 * so a dropped claim can't come back in Hindi. Assumptions keep their category. */
export function keepSupportedDetail<T extends PersonalProse>(
  detail: T,
  profile: NormalizedProfile | null,
): T {
  if (!profile) return detail;
  const kept = detail.criticalAssumptions
    .map((statement, i) => ({ statement, category: detail.criticalAssumptionCategories[i] }))
    .filter((a) => findIntegrityIssues(a.statement, profile).length === 0);
  return {
    ...detail,
    whyThisFounder: keepSupportedReasons(detail.whyThisFounder, profile),
    advantages: keepSupportedReasons(detail.advantages, profile),
    criticalAssumptions: kept.map((a) => a.statement),
    criticalAssumptionCategories: kept.map((a) => a.category ?? "other"),
    successCriteria: keepSupportedReasons(detail.successCriteria, profile),
    reconsiderIf: keepSupportedReasons(detail.reconsiderIf, profile),
  };
}
