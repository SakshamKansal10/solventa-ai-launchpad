import type { OnboardingAnswers, SkillLevel } from "@/lib/onboarding-types";
import { parseIndianCurrency } from "@/lib/currency";

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
    languages: string[];
  };
  skills: NormalizedSkill[];
  experienceYears: number;
  resources: {
    capitalINR: number;
    capitalBracket: string | null;
    /** Existing income (salary/business/freelance) — a distinct signal
     * from capitalINR: income implies ongoing earning capacity and
     * realistic side-income targets, not money already set aside to
     * invest. Null for founders who were never asked (students,
     * unemployed) — absence is not the same as zero. */
    annualIncomeINR: number | null;
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
    biggestMotivation: string | null;
    dailyFrustration: string | null;
  };
  constraints: {
    industryRestrictions: string[];
    relocation: string | null;
    health: string | null;
    other: string | null;
  };
  direction: {
    goals: string[];
    monthlyIncomeGoalINR: number | null;
    timeline: string | null;
  };
}

export const SKILL_LEVEL_SCORE: Record<SkillLevel, number> = {
  never_tried: 0,
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  professional: 4,
};

const INVESTMENT_BRACKET_MIDPOINT: Record<string, number> = {
  "₹0 — I have no capital right now": 0,
  "Under ₹10,000": 5_000,
  "₹10,000 – ₹50,000": 30_000,
  "₹50,000 – ₹2,00,000": 125_000,
  "More than ₹2,00,000": 300_000, // overridden by preciseCapital when present
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

const MONTHLY_INCOME_GOAL_MIDPOINT: Record<string, number> = {
  "Under ₹5,000": 3_000,
  "₹5,000 – ₹20,000": 12_500,
  "₹20,000 – ₹50,000": 35_000,
  "₹50,000 – ₹1,50,000": 100_000,
  "₹1,50,000+": 200_000,
};

const ANNUAL_INCOME_MIDPOINT: Record<string, number> = {
  "< ₹3L": 200_000,
  "₹3–5L": 400_000,
  "₹5–10L": 750_000,
  "₹10–20L": 1_500_000,
  "₹20–50L": 3_500_000,
  "₹50L+": 6_000_000,
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

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Converts the raw onboarding answers (free-text-shaped bracket labels) into
 * numeric/enum signals the deterministic scoring engine and AI prompts can
 * both consume without re-parsing bracket strings themselves.
 */
export function normalizeProfile(answers: OnboardingAnswers): NormalizedProfile {
  let capitalINR = answers.investmentBudget
    ? (INVESTMENT_BRACKET_MIDPOINT[answers.investmentBudget] ?? 0)
    : 0;
  if (answers.investmentBudget === "More than ₹2,00,000" && answers.preciseCapital) {
    const precise = parseIndianCurrency(answers.preciseCapital);
    if (precise !== null && precise > 0) capitalINR = precise;
  }

  const weeklyHours = answers.timeAvailableWeekly
    ? (WEEKLY_HOURS_MIDPOINT[answers.timeAvailableWeekly] ?? 5)
    : 5;

  const experienceYears = answers.yearsExperience
    ? (YEARS_EXPERIENCE_MIDPOINT[answers.yearsExperience] ?? 0)
    : 0;

  const monthlyIncomeGoalINR = answers.monthlyIncomeGoal
    ? (MONTHLY_INCOME_GOAL_MIDPOINT[answers.monthlyIncomeGoal] ?? null)
    : null;

  const annualIncomeINR = answers.annualIncome
    ? (ANNUAL_INCOME_MIDPOINT[answers.annualIncome] ?? null)
    : null;

  const riskAppetite = answers.riskAppetite
    ? (RISK_APPETITE_MAP[answers.riskAppetite] ?? null)
    : null;

  return {
    identity: {
      age: toNumber(answers.age),
      country: answers.country ?? null,
      state: answers.state ?? null,
      city: answers.city ?? null,
      education: answers.education ?? null,
      currentStatus: answers.currentStatus ?? null,
      languages: answers.languages ?? [],
    },
    skills: (answers.skills ?? []).map((s) => ({
      name: s.name,
      level: s.level,
      levelScore: SKILL_LEVEL_SCORE[s.level],
    })),
    experienceYears,
    resources: {
      capitalINR,
      capitalBracket: answers.investmentBudget ?? null,
      annualIncomeINR,
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
      biggestMotivation: answers.biggestMotivation ?? null,
      dailyFrustration: answers.dailyFrustration ?? null,
    },
    constraints: {
      // industryRestrictions is typed as string[] but collected via a free-text
      // textarea in the current question graph — normalize defensively either way.
      industryRestrictions: toArray(
        answers.industryRestrictions as unknown as string | string[] | undefined,
      ),
      relocation: answers.relocation ?? null,
      health: answers.healthLimitations ?? null,
      other: answers.otherConstraints ?? null,
    },
    direction: {
      goals: answers.goals ?? [],
      monthlyIncomeGoalINR,
      timeline: answers.timeline ?? null,
    },
  };
}
