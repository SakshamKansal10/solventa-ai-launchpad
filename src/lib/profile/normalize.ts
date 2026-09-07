import type { OnboardingAnswers, SkillLevel } from "@/lib/onboarding-types";
import {
  getAnnualIncomeBrackets,
  getCurrencyForCountry,
  getInvestmentBrackets,
  getMonthlyIncomeGoalBrackets,
  parseCurrencyAmount,
} from "@/lib/country-currency";

export type RiskLevel = "cautious" | "balanced" | "experimental";

export interface NormalizedSkill {
  name: string;
  level: SkillLevel;
  levelScore: number;
}

export interface NormalizedProfile {
  identity: {
    age: number | null;
    country: string | null;
    state: string | null;
    city: string | null;
    education: string | null;
    currentStatus: OnboardingAnswers["currentStatus"] | null;
    /** The elaborated text when currentStatus === "Other" — without this,
     * picking "Other" reached the AI as the bare word "Other" with zero
     * elaboration. Null whenever currentStatus isn't "Other". */
    currentStatusDetail: string | null;
    languages: string[];
    /** Business Owner / Freelancer branch only — null for every other
     * founder, not "no revenue". */
    currentBusiness: { revenueBracket: string | null; customers: string | null } | null;
    /** ISO 4217, derived from country — INR when country is unset (the
     * product's original, still-dominant market). Every monetary value in
     * this profile (and every opportunity fit-signal it's compared
     * against) is in THIS currency; nothing is ever converted between
     * currencies, so comparisons stay valid without needing FX rates. */
    currency: string;
    currencySymbol: string;
  };
  skills: NormalizedSkill[];
  experienceYears: number;
  resources: {
    capitalAmount: number;
    capitalBracket: string | null;
    /** Existing income (salary/business/freelance) — a distinct signal
     * from capitalAmount: income implies ongoing earning capacity and
     * realistic side-income targets, not money already set aside to
     * invest. Null for founders who were never asked (students,
     * unemployed) — absence is not the same as zero. */
    annualIncomeAmount: number | null;
    assets: string[];
    internetQuality: string | null;
    transportation: string | null;
  };
  time: {
    weeklyHours: number;
    weeklyHoursBracket: string | null;
  };
  workStyle: {
    location: string | null;
    type: string | null;
    leadership: string | null;
    salesComfort: string | null;
    soloOrTeam: string | null;
  };
  risk: {
    appetite: RiskLevel | null;
  };
  motivation: {
    /** Structured chips (MOTIVATION_OPTIONS), with "Other" replaced by its
     * elaboration when selected. */
    biggestMotivation: string[];
    dailyFrustration: string[];
  };
  constraints: {
    industryRestrictions: string[];
    relocation: string | null;
    /** Structured chips (CONSTRAINT_OPTIONS), "Other" elaborated. */
    other: string[];
  };
  direction: {
    goals: string[];
    monthlyIncomeGoalAmount: number | null;
    timeline: string | null;
    /** Employee branch only — null for every other founder. */
    willingToLeaveJob: string | null;
  };
}

export const SKILL_LEVEL_SCORE: Record<SkillLevel, number> = {
  never_tried: 0,
  beginner: 1,
  comfortable: 2,
  advanced: 3,
};

const WEEKLY_HOURS_MIDPOINT: Record<string, number> = {
  "Under 5 hrs": 3,
  "5–10 hrs": 7.5,
  "10–20 hrs": 15,
  "20+ hrs": 25,
  "Full-time": 45,
};

const YEARS_EXPERIENCE_MIDPOINT: Record<string, number> = {
  "Under 1 year": 0.5,
  "1–3 years": 2,
  "3–5 years": 4,
  "5–10 years": 7,
  "10+ years": 12,
};

const RISK_APPETITE_MAP: Record<string, RiskLevel> = {
  "Very cautious": "cautious",
  Balanced: "balanced",
  "Comfortable experimenting": "experimental",
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

/** Replaces the literal chip "Other" with its elaborated free-text detail
 * — but ONLY when "Other" is actually still selected. Without the guard,
 * a founder who once selected "Other", typed something, then deselected
 * it and picked a normal chip instead would still silently send the old
 * elaboration to the AI, since the detail field itself is never cleared
 * (its question is just no longer shown — see resolveSteps). */
function withOtherElaborated(chips: string[], otherDetail: string | undefined): string[] {
  if (!chips.includes("Other")) return chips.filter((c) => c !== "Other");
  const rest = chips.filter((c) => c !== "Other");
  return otherDetail ? [...rest, otherDetail] : rest;
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function bracketValue(brackets: { label: string; value: number }[], label: string | undefined) {
  if (!label) return null;
  return brackets.find((b) => b.label === label)?.value ?? null;
}

/**
 * Converts the raw onboarding answers (free-text-shaped bracket labels) into
 * numeric/enum signals the deterministic scoring engine and AI prompts can
 * both consume without re-parsing bracket strings themselves.
 */
export function normalizeProfile(answers: OnboardingAnswers): NormalizedProfile {
  const currency = getCurrencyForCountry(answers.country);
  const investmentBrackets = getInvestmentBrackets(currency.code);
  const annualIncomeBrackets = getAnnualIncomeBrackets(currency.code);
  const monthlyIncomeGoalBrackets = getMonthlyIncomeGoalBrackets(currency.code);
  const topInvestmentBracketLabel = investmentBrackets[investmentBrackets.length - 1]?.label;

  let capitalAmount = bracketValue(investmentBrackets, answers.investmentBudget) ?? 0;
  if (answers.investmentBudget === topInvestmentBracketLabel && answers.preciseCapital) {
    const precise = parseCurrencyAmount(answers.preciseCapital, currency.code);
    if (precise !== null && precise > 0) capitalAmount = precise;
  }

  const weeklyHours = answers.timeAvailableWeekly
    ? (WEEKLY_HOURS_MIDPOINT[answers.timeAvailableWeekly] ?? 5)
    : 5;

  const experienceYears = answers.yearsExperience
    ? (YEARS_EXPERIENCE_MIDPOINT[answers.yearsExperience] ?? 0)
    : 0;

  const monthlyIncomeGoalAmount = bracketValue(
    monthlyIncomeGoalBrackets,
    answers.monthlyIncomeGoal,
  );

  const annualIncomeAmount = bracketValue(annualIncomeBrackets, answers.annualIncome);

  const riskAppetite = answers.riskAppetite
    ? (RISK_APPETITE_MAP[answers.riskAppetite] ?? null)
    : null;

  return {
    identity: {
      age: toNumber(answers.age),
      country: answers.country ?? null,
      state: answers.state ?? null,
      city: answers.city ?? null,
      education:
        answers.education === "Other" && answers.educationOther
          ? answers.educationOther
          : (answers.education ?? null),
      currentStatus: answers.currentStatus ?? null,
      currentStatusDetail:
        answers.currentStatus === "Other" ? (answers.currentStatusOther ?? null) : null,
      languages: answers.languages ?? [],
      currentBusiness:
        answers.currentStatus === "Business Owner" || answers.currentStatus === "Freelancer"
          ? {
              revenueBracket: answers.currentBusinessRevenue ?? null,
              customers: answers.currentBusinessCustomers?.length
                ? answers.currentBusinessCustomers.join(", ")
                : null,
            }
          : null,
      currency: currency.code,
      currencySymbol: currency.symbol,
    },
    skills: (answers.skills ?? []).map((s) => ({
      name: s.name,
      level: s.level,
      levelScore: SKILL_LEVEL_SCORE[s.level],
    })),
    experienceYears,
    resources: {
      capitalAmount,
      capitalBracket: answers.investmentBudget ?? null,
      annualIncomeAmount,
      assets: answers.assets ?? [],
      internetQuality: answers.internetQuality ?? null,
      transportation: answers.transportation ?? null,
    },
    time: {
      weeklyHours,
      weeklyHoursBracket: answers.timeAvailableWeekly ?? null,
    },
    workStyle: {
      location: answers.workLocation ?? null,
      type: answers.workType ?? null,
      leadership: answers.leadership ?? null,
      salesComfort: answers.salesComfort ?? null,
      soloOrTeam: answers.soloOrTeam ?? null,
    },
    risk: {
      appetite: riskAppetite,
    },
    motivation: {
      biggestMotivation: withOtherElaborated(
        toArray(answers.biggestMotivation as unknown as string | string[] | undefined),
        answers.biggestMotivationOther,
      ),
      dailyFrustration: withOtherElaborated(
        toArray(answers.dailyFrustration as unknown as string | string[] | undefined).filter(
          (v) => v !== "Nothing specific comes to mind",
        ),
        answers.dailyFrustrationOther,
      ),
    },
    constraints: {
      // Collected as multi-choice chips; toArray() stays defensive for any
      // older persisted answers still shaped as a single free-text string
      // from before that change. "Other" is replaced by its elaborated
      // detail only when still selected (see withOtherElaborated) — the
      // literal word "Other" is not useful to send to the AI on its own.
      industryRestrictions: withOtherElaborated(
        toArray(answers.industryRestrictions as unknown as string | string[] | undefined),
        answers.industryRestrictionsOther,
      ),
      relocation: answers.relocation ?? null,
      other: withOtherElaborated(
        toArray(answers.otherConstraints as unknown as string | string[] | undefined).filter(
          (v) => v !== "None of these",
        ),
        answers.otherConstraintsOther,
      ),
    },
    direction: {
      goals: answers.goals ?? [],
      monthlyIncomeGoalAmount,
      timeline: answers.timeline ?? null,
      willingToLeaveJob:
        answers.currentStatus === "Working Professional"
          ? (answers.willingToLeaveJob ?? null)
          : null,
    },
  };
}
