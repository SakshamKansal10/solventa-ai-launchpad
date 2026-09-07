import type { NormalizedProfile } from "@/lib/profile/normalize";
import type { FounderGenome } from "@/lib/profile/founder-genome";
import { SKILL_CATEGORIES } from "@/lib/onboarding-types";
import { getAnnualIncomeBrackets, getMonthlyIncomeGoalBrackets } from "@/lib/country-currency";

export type AmbitionBand = "A" | "B" | "C" | "D" | "E";

export const AMBITION_BAND_LABEL: Record<AmbitionBand, string> = {
  A: "Micro / Side Income",
  B: "Sustainable Solo Business",
  C: "High-Income Professional Venture",
  D: "Scalable Startup",
  E: "Venture-Scale / High-Complexity",
};

export type AmbitionReasonCode =
  | "HIGH_TECHNICAL_DEPTH"
  | "HIGH_OPPORTUNITY_COST"
  | "STRONG_CAPITAL"
  | "LIMITED_TIME"
  | "BEGINNER_EXECUTION"
  | "HIGH_LEADERSHIP"
  | "LOW_INITIAL_CAPITAL"
  | "STRONG_MARKET_ACCESS";

export interface AmbitionCalibration {
  band: AmbitionBand;
  /** 0-100, the weighted composite the band is bucketed from. */
  score: number;
  reasonCodes: AmbitionReasonCode[];
  /** Bumped only if the weighting formula itself changes — lets stored
   * rows from an older formula be told apart from current ones without
   * silently mixing incomparable scores. */
  scoringVersion: number;
}

export const AMBITION_SCORING_VERSION = 1;

function clamp01to100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

const EDUCATION_ORDER = [
  "Below 10th",
  "10th Pass",
  "12th Pass",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate",
];

/** Education COMPLETION level only — never which specific school/college.
 * There is deliberately no institution-prestige lookup anywhere in this
 * file: a founder from an unranked institution with real skills and
 * experience can and should outscore one from a famous one who has
 * neither. "Other" (vocational/trade certifications etc.) scores as
 * neutral rather than low — it isn't lower on the ladder, just off it. */
function educationStrengthScore(profile: NormalizedProfile): number {
  const idx = EDUCATION_ORDER.indexOf(profile.identity.education ?? "");
  if (idx === -1) return 50;
  return clamp01to100((idx / (EDUCATION_ORDER.length - 1)) * 100);
}

const TECHNICAL_CATEGORIES = [
  "Technology",
  "AI and Automation",
  "Engineering",
  "Data and Analytics",
];

/** Depth specifically in technical skill categories — distinct from the
 * Founder Genome's broader "Skill Leverage" (which counts every skill
 * category equally). A founder with five advanced design/content skills
 * and zero technical ones should not read as "high technical depth"
 * just because they're generally skilled. */
function technicalDepthScore(profile: NormalizedProfile): number {
  const technicalSkills = profile.skills.filter((s) => {
    const category = SKILL_CATEGORIES.find((c) =>
      c.skills.some((sk) => sk.toLowerCase() === s.name.toLowerCase()),
    );
    return category && TECHNICAL_CATEGORIES.includes(category.label);
  });
  if (technicalSkills.length === 0) return 12;
  const avgLevel =
    technicalSkills.reduce((sum, s) => sum + s.levelScore, 0) / (technicalSkills.length * 3);
  return clamp01to100(avgLevel * 70 + Math.min(technicalSkills.length, 5) * (30 / 5));
}

function experienceScore(profile: NormalizedProfile): number {
  return clamp01to100((profile.experienceYears / 12) * 100);
}

const LEADERSHIP_SCORE: Record<string, number> = {
  "Very comfortable": 100,
  "Somewhat comfortable": 65,
  "Prefer not to": 25,
  Untested: 40,
};

function leadershipScore(profile: NormalizedProfile): number {
  return LEADERSHIP_SCORE[profile.workStyle.leadership ?? ""] ?? 40;
}

/** Position within this founder's OWN currency brackets — never a raw
 * amount, which would unfairly read a founder in a high-denomination
 * currency as automatically more ambitious. */
function bracketPosition(brackets: { label: string }[], label: string | null): number {
  if (!label) return 40;
  const idx = brackets.findIndex((b) => b.label === label);
  if (idx === -1) return 40;
  return clamp01to100((idx / Math.max(1, brackets.length - 1)) * 100);
}

function earningPotentialScore(profile: NormalizedProfile): number {
  const brackets = getAnnualIncomeBrackets(profile.identity.currency);
  const label = brackets.find((b) => b.value === profile.resources.annualIncomeAmount)?.label;
  return bracketPosition(brackets, label ?? null);
}

function incomeAmbitionScore(profile: NormalizedProfile): number {
  const brackets = getMonthlyIncomeGoalBrackets(profile.identity.currency);
  const label = brackets.find((b) => b.value === profile.direction.monthlyIncomeGoalAmount)?.label;
  return bracketPosition(brackets, label ?? null);
}

/** Real, demonstrated capacity to actually execute — not self-reported
 * confidence. Already running a business/freelance practice is real
 * proof; a long skills list with no rated depth is not. */
function executionAbilityScore(profile: NormalizedProfile): number {
  const ratedSkills = profile.skills.filter((s) => s.levelScore >= 2).length;
  const skillComponent = clamp01to100(ratedSkills * 12);
  const experienceComponent = clamp01to100((profile.experienceYears / 8) * 100);
  const businessBonus = profile.identity.currentBusiness ? 20 : 0;
  return clamp01to100(skillComponent * 0.45 + experienceComponent * 0.35 + businessBonus);
}

/**
 * Deterministic pre-AI ambition calibration — a transparent weighted
 * combination of real profile signals, computed once per consultation
 * and stored alongside the Founder Genome. Never inferred from a single
 * field (e.g. institution or capital alone), and never treats
 * institution NAME as a status signal (see educationStrengthScore).
 * This is CONTEXT handed to the AI ("generate opportunities compatible
 * with this founder's band and constraints"), never an instruction to
 * always maximize ambition — see intelligence-package.ts.
 */
export function computeAmbitionCalibration(
  profile: NormalizedProfile,
  genome: FounderGenome,
): AmbitionCalibration {
  const dim = (key: string) => genome.dimensions.find((d) => d.key === key)?.score ?? 50;

  const technicalDepth = technicalDepthScore(profile);
  const professionalExperience = experienceScore(profile);
  const leadership = leadershipScore(profile);
  const marketAccess = clamp01to100((dim("commercial") + dim("market")) / 2);
  const capital = dim("resources");
  const weeklyTime = dim("time");
  const riskAppetite = dim("risk");
  const earningPotential = earningPotentialScore(profile);
  const incomeAmbition = incomeAmbitionScore(profile);
  const executionAbility = executionAbilityScore(profile);
  const educationStrength = educationStrengthScore(profile);

  const score = clamp01to100(
    technicalDepth * 0.14 +
      professionalExperience * 0.09 +
      leadership * 0.07 +
      marketAccess * 0.09 +
      capital * 0.12 +
      weeklyTime * 0.07 +
      riskAppetite * 0.06 +
      earningPotential * 0.09 +
      incomeAmbition * 0.07 +
      executionAbility * 0.1 +
      educationStrength * 0.1,
  );

  const band: AmbitionBand =
    score >= 85 ? "E" : score >= 65 ? "D" : score >= 45 ? "C" : score >= 25 ? "B" : "A";

  const reasonCodes: AmbitionReasonCode[] = [];
  if (technicalDepth >= 70) reasonCodes.push("HIGH_TECHNICAL_DEPTH");
  if (earningPotential >= 70 && profile.identity.currentStatus === "Working Professional") {
    reasonCodes.push("HIGH_OPPORTUNITY_COST");
  }
  if (capital >= 70) reasonCodes.push("STRONG_CAPITAL");
  if (capital <= 25) reasonCodes.push("LOW_INITIAL_CAPITAL");
  if (weeklyTime <= 30) reasonCodes.push("LIMITED_TIME");
  if (executionAbility <= 30) reasonCodes.push("BEGINNER_EXECUTION");
  if (leadership >= 70) reasonCodes.push("HIGH_LEADERSHIP");
  if (marketAccess >= 70) reasonCodes.push("STRONG_MARKET_ACCESS");

  return { band, score, reasonCodes, scoringVersion: AMBITION_SCORING_VERSION };
}

/** The exact context string handed to the AI — deliberately phrased as
 * scale compatibility, never "always be more ambitious." */
export function formatAmbitionContextForPrompt(calibration: AmbitionCalibration): string {
  const label = AMBITION_BAND_LABEL[calibration.band];
  const reasons =
    calibration.reasonCodes.length > 0 ? calibration.reasonCodes.join(", ") : "none dominant";
  return `Ambition calibration (deterministic, pre-computed — never re-derive this yourself): Band ${calibration.band} — ${label} (score ${calibration.score}/100). Contributing signals: ${reasons}. Generate opportunities whose scale is compatible with this band AND this founder's stated hard constraints — do not default every founder to a small side-income idea, and do not propose venture-scale/high-complexity ideas for a founder whose band and constraints don't support them.`;
}
