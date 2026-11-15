import { parseAge, type ConsultationAnswers } from "@/lib/consultation/model";
import type { NormalizedProfile } from "@/lib/profile/normalize";

import { statedCapital, statedHours, type FitFactorKey } from "./model";

/**
 * Sharper fit: ask what is missing (redesign-v2 part 4, feature 5). A fit factor reads "Not known
 * yet" only because a profile answer is empty; these are exactly those answers, so Directions can
 * ask two to four short questions for them and the fit recalculates from the answers (it is
 * derived on every read — see assessFit).
 */
export type GapField = "access" | "capital" | "skills" | "hours" | "scale";

/** The factor each answer feeds, in the order the questions are asked (heaviest factor first). */
export const GAP_FACTOR: Record<GapField, FitFactorKey> = {
  access: "access",
  capital: "resources",
  skills: "capability",
  hours: "time",
  scale: "goals",
};
const ORDER: GapField[] = ["access", "capital", "skills", "hours", "scale"];

/** How many short questions each answer takes: skills is a pick plus a level for each. */
const QUESTION_COST: Record<GapField, number> = {
  access: 1,
  capital: 1,
  skills: 2,
  hours: 1,
  scale: 1,
};
export const MAX_QUESTIONS = 4;

/** The empty answers that leave a fit factor unknown, at most four questions' worth. */
export function missingFitFields(profile: NormalizedProfile): GapField[] {
  const missing: Record<GapField, boolean> = {
    access: profile.v2
      ? profile.v2.access.length === 0 && !profile.v2.accessNone
      : profile.resources.assets.length === 0,
    capital: statedCapital(profile) === null,
    skills: profile.skills.length === 0,
    hours: statedHours(profile) === null,
    // Goals are unknown only when neither the scale nor the risk answer is there.
    scale:
      (!profile.v2?.ambition.scaleId || profile.v2.ambition.scaleId === "not_sure") &&
      (profile.risk?.appetite ?? null) === null,
  };
  const out: GapField[] = [];
  let questions = 0;
  for (const f of ORDER) {
    if (!missing[f]) continue;
    if (questions + QUESTION_COST[f] > MAX_QUESTIONS) continue;
    out.push(f);
    questions += QUESTION_COST[f];
  }
  return out;
}

/**
 * Two answers that do not usually go together — shown to the founder to correct, never silently
 * fixed and never used to judge them. Only clear mismatches: a wrong profile skews every fit.
 */
export type Contradiction =
  | { code: "age_status"; age: number; status: string }
  | { code: "age_education"; age: number; education: string }
  | { code: "education_status"; education: string; status: string };

const DEGREES = ["bachelors", "masters", "doctorate"];
const POSTGRAD = ["masters", "doctorate"];

export function findContradictions(a: ConsultationAnswers): Contradiction[] {
  const out: Contradiction[] = [];
  const age = parseAge(a.age);
  const status = a.status ?? null;
  const education = a.education ?? null;
  if (age !== null && status) {
    const mismatch =
      (status === "school_student" && age >= 21) ||
      (status === "college_student" && age < 15) ||
      (status === "working_professional" && age < 16);
    if (mismatch) out.push({ code: "age_status", age, status });
  }
  if (age !== null && education) {
    const mismatch =
      (age < 18 && DEGREES.includes(education)) || (age < 20 && POSTGRAD.includes(education));
    if (mismatch) out.push({ code: "age_education", age, education });
  }
  if (education === "below_10" && status === "college_student")
    out.push({ code: "education_status", education, status });
  return out;
}
