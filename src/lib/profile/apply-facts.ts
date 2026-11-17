import { getBrackets } from "@/lib/consultation/brackets";
import type { ConsultationAnswers } from "@/lib/consultation/model";
import { HOURS_IDS, WORK_DAY_IDS } from "@/lib/consultation/options";
import { getCurrencyForCountry } from "@/lib/country-currency";

/**
 * New facts a founder told Ask Sol about themselves (owner, 2026-11-17, Job M), as a change to
 * their consultation answers. Only what Sol could read for sure is a field; everything else
 * (people, goals, constraints: "my partner is a chef") is a note, passed to generation as the
 * founder's own words. The old answers are never edited: applying returns a NEW answer set.
 */
export interface FactPatch {
  /** What they can now put in, in their currency (e.g. 200000 for "₹2 lakh"). */
  capitalAmount?: number | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  weeklyHours?: (typeof HOURS_IDS)[number] | null;
  workDays?: (typeof WORK_DAY_IDS)[number][] | null;
  /** Skills they now have (names, as they said them). */
  addSkills?: string[] | null;
  /** Facts with no answer field, in the founder's own words. */
  notes?: string[] | null;
}

/** Keeps only well-formed fields (the model's output is never trusted as-is). */
export function cleanFactPatch(raw: unknown): FactPatch {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const text = (v: unknown) =>
    typeof v === "string" && v.trim() && v.trim().length <= 120 ? v.trim() : null;
  const out: FactPatch = {};
  if (
    typeof p.capitalAmount === "number" &&
    Number.isFinite(p.capitalAmount) &&
    p.capitalAmount >= 0
  )
    out.capitalAmount = Math.round(p.capitalAmount);
  for (const k of ["city", "state", "country"] as const) {
    const v = text(p[k]);
    if (v) out[k] = v;
  }
  if (typeof p.weeklyHours === "string" && (HOURS_IDS as readonly string[]).includes(p.weeklyHours))
    out.weeklyHours = p.weeklyHours as FactPatch["weeklyHours"];
  if (Array.isArray(p.workDays)) {
    const days = p.workDays.filter((d): d is string =>
      (WORK_DAY_IDS as readonly string[]).includes(d as string),
    );
    if (days.length) out.workDays = days as FactPatch["workDays"];
  }
  if (Array.isArray(p.addSkills)) {
    const skills = p.addSkills
      .map(text)
      .filter((s): s is string => Boolean(s))
      .slice(0, 8);
    if (skills.length) out.addSkills = skills;
  }
  if (Array.isArray(p.notes)) {
    const notes = p.notes
      .map((n) => (typeof n === "string" && n.trim() ? n.trim().slice(0, 300) : null))
      .filter((n): n is string => Boolean(n))
      .slice(0, 5);
    if (notes.length) out.notes = notes;
  }
  return out;
}

export function isEmptyPatch(p: FactPatch): boolean {
  return Object.keys(p).length === 0;
}

/** The capital tier an amount falls in (and the exact amount when it is the open top tier). */
export function capitalAnswer(
  amount: number,
  country: string | undefined,
): { capitalBracket: number; capitalPrecise?: string } {
  const tiers = getBrackets("capital", getCurrencyForCountry(country).code);
  let index = tiers.findIndex(
    (t) =>
      (t.zero && amount === 0) ||
      (!t.zero && (t.min === null || amount >= t.min) && (t.max === null || amount < t.max)),
  );
  if (index < 0) index = tiers.length - 1;
  return index === tiers.length - 1
    ? { capitalBracket: index, capitalPrecise: String(amount) }
    : { capitalBracket: index };
}

/** A NEW answer set: the old answers with the new facts applied. */
export function applyFactPatch(old: ConsultationAnswers, patch: FactPatch): ConsultationAnswers {
  const next: ConsultationAnswers = structuredClone(old);
  if (patch.country) next.country = patch.country;
  if (patch.state) next.state = patch.state;
  if (patch.city) next.city = patch.city;
  if (typeof patch.capitalAmount === "number") {
    const c = capitalAnswer(patch.capitalAmount, next.country);
    next.capitalBracket = c.capitalBracket;
    if (c.capitalPrecise) next.capitalPrecise = c.capitalPrecise;
    else delete next.capitalPrecise;
  }
  if (patch.weeklyHours) next.weeklyHours = patch.weeklyHours;
  if (patch.workDays?.length) next.workDays = [...patch.workDays];
  if (patch.addSkills?.length) {
    const have = new Set((next.skills ?? []).map((s) => s.name.toLowerCase()));
    next.skills = [
      ...(next.skills ?? []),
      ...patch.addSkills
        .filter((n) => !have.has(n.toLowerCase()))
        // A skill they just told Sol about: working level, not yet used for real (the honest default).
        .map((name) => ({ name, level: "working" as const, usedInReal: false })),
    ];
  }
  if (patch.notes?.length) {
    const constraints = new Set(next.constraints ?? []);
    constraints.delete("none");
    constraints.add("other");
    next.constraints = [...constraints];
    const said = `Latest update from the founder: ${patch.notes.join(". ")}`;
    next.constraintsOther = next.constraintsOther?.trim()
      ? `${next.constraintsOther.trim()}. ${said}`
      : said;
  }
  return next;
}
