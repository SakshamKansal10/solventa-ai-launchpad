import { getCurrencyForCountry, parseCurrencyAmount } from "@/lib/country-currency";
import {
  bracketCount,
  formatBracketLabel,
  formatAmount,
  getBrackets,
  TEAM_SIZE_IDS,
  TEAM_SIZE_VALUES,
} from "@/lib/consultation/brackets";
import type { ConsultationAnswers } from "@/lib/consultation/model";
import { parseAge } from "@/lib/consultation/model";
import { HOURS_MIDPOINT, optionKey, SECTOR_DOMAIN_IDS } from "@/lib/consultation/options";
import { MESSAGES } from "@/lib/i18n";
import type { NormalizedProfile, NormalizedSkill, RiskLevel } from "@/lib/profile/normalize";
import type { SkillLevel } from "@/lib/onboarding-types";

/** Canonical English label for an option id — the AI prompt and the stored
 * profile are always English regardless of the language the founder answered in. */
export function enLabel(group: string, id: string | undefined | null): string | null {
  if (!id) return null;
  return MESSAGES.en[optionKey(group, id)] ?? null;
}

function enLabels(group: string, ids: string[] | undefined): string[] {
  return (ids ?? []).map((id) => enLabel(group, id)).filter((l): l is string => Boolean(l));
}

const LEGACY_STATUS_LABEL: Record<
  string,
  NonNullable<NormalizedProfile["identity"]["currentStatus"]>
> = {
  school_student: "School Student",
  college_student: "College Student",
  working_professional: "Working Professional",
  business_owner: "Business Owner",
  freelancer: "Freelancer",
  career_break: "Career Break",
  not_working: "Unemployed",
  other: "Other",
};

const EDUCATION_LABEL: Record<string, string> = {
  below_10: "Below 10th",
  tenth: "10th Pass",
  twelfth: "12th Pass",
  diploma: "Diploma",
  bachelors: "Bachelor's Degree",
  masters: "Master's Degree",
  doctorate: "Doctorate",
};

const RISK_MAP: Record<string, RiskLevel> = {
  conservative: "cautious",
  balanced: "balanced",
  meaningful: "experimental",
  high: "experimental",
};

const TEAM_TO_LEGACY: Record<string, string> = {
  solo: "Solo",
  open_cofounder: "With a co-founder",
  small_team: "With a small team",
  has_team: "With a small team",
  no_preference: "Not sure yet",
};

const SKILL_TO_LEGACY_LEVEL: Record<string, SkillLevel> = {
  basic: "beginner",
  working: "comfortable",
  advanced: "advanced",
  professional: "advanced",
};

/** Effective strength of a claimed skill. A skill that has only been studied,
 * never used on a real project, counts for half a level less — this is the
 * mechanism that stops a long list of beginner tick-boxes from anchoring the
 * recommendation. A professional skill is real use by definition. */
export function skillLevelScore(
  level: string | null,
  usedInReal: boolean,
): { levelScore: number; legacyLevel: SkillLevel } {
  const base = { basic: 1, working: 2, advanced: 3, professional: 3 }[level ?? "basic"] ?? 1;
  const levelScore = level === "professional" || usedInReal ? base : Math.max(0.5, base - 0.5);
  return { levelScore, legacyLevel: SKILL_TO_LEGACY_LEVEL[level ?? "basic"] ?? "beginner" };
}

const SALES_LABEL = "I enjoy it";
const SALES_OK_LABEL = "I can do it if needed";

export function normalizeV2(a: ConsultationAnswers): NormalizedProfile {
  const currency = getCurrencyForCountry(a.country);
  const capitalTiers = getBrackets("capital", currency.code);
  const incomeTiers = getBrackets("income", currency.code);
  const turnoverTiers = getBrackets("turnover", currency.code);
  const minIncomeTiers = getBrackets("minIncome", currency.code);
  const label = (
    kind: Parameters<typeof getBrackets>[0],
    tiers: ReturnType<typeof getBrackets>,
    i?: number,
  ) => (i === undefined || !tiers[i] ? null : formatBracketLabel(tiers[i], currency.code, "en"));

  // ---- capital ----
  let capitalAmount =
    typeof a.capitalBracket === "number" ? (capitalTiers[a.capitalBracket]?.value ?? 0) : 0;
  const topTier = capitalTiers.length - 1;
  if (a.capitalBracket === topTier && a.capitalPrecise) {
    const precise = parseCurrencyAmount(a.capitalPrecise, currency.code);
    if (precise !== null && precise > 0) capitalAmount = precise;
  }

  // ---- position ----
  const statusId = a.status ?? "";
  const isBusinessOwner = statusId === "business_owner";
  const isEmployed = statusId === "working_professional" || statusId === "freelancer";
  const incomeTier =
    isEmployed && typeof a.annualIncomeBracket === "number" ? a.annualIncomeBracket : null;
  const annualIncomeAmount = incomeTier !== null ? (incomeTiers[incomeTier]?.value ?? null) : null;

  const turnoverTier =
    isBusinessOwner && typeof a.bizTurnoverBracket === "number" ? a.bizTurnoverBracket : null;
  const teamTier =
    isBusinessOwner && typeof a.bizTeamBracket === "number" ? a.bizTeamBracket : null;
  const business = isBusinessOwner
    ? {
        sector: enLabel("domains", a.bizSector),
        turnoverAmount: turnoverTier !== null ? (turnoverTiers[turnoverTier]?.value ?? null) : null,
        turnoverTier,
        turnoverLabel: label("turnover", turnoverTiers, turnoverTier ?? undefined),
        teamSize: teamTier !== null ? (TEAM_SIZE_VALUES[teamTier] ?? null) : null,
        teamTier,
        teamLabel: teamTier !== null ? enLabel("team_size", TEAM_SIZE_IDS[teamTier]) : null,
      }
    : null;

  // ---- skills ----
  const skills: NormalizedSkill[] = (a.skills ?? [])
    .filter((s) => s.level !== null)
    .map((s) => {
      const { levelScore, legacyLevel } = skillLevelScore(s.level, s.usedInReal);
      return {
        name: s.name,
        level: legacyLevel,
        levelScore,
        declaredLevel: s.level ?? undefined,
        usedInReal: s.level === "professional" ? true : s.usedInReal,
      };
    });

  // ---- execution evidence → experience proxy (never fabricated silently) ----
  const executionIds = (a.executionSignals ?? []).filter((x) => x !== "none_yet");
  const age = parseAge(a.age);
  const workingYears =
    isEmployed || isBusinessOwner ? Math.max(0, Math.min(15, (age ?? 22) - 22)) * 0.6 : 0;
  const experienceYears =
    Math.round(Math.min(20, workingYears + executionIds.length * 1.2) * 10) / 10;

  // ---- roles / comfort mapping so deterministic scorers keep working ----
  const roles = a.roles ?? [];
  const soldBefore =
    executionIds.includes("sold_customers") || executionIds.includes("ran_business");
  const managedBefore =
    executionIds.includes("managed_team") || executionIds.includes("ran_business");
  const leadership =
    roles.includes("leading") && managedBefore
      ? "Very comfortable"
      : roles.includes("leading") || managedBefore
        ? "Somewhat comfortable"
        : null;
  const salesComfort =
    roles.includes("selling") && soldBefore
      ? SALES_LABEL
      : roles.includes("selling") || soldBefore
        ? SALES_OK_LABEL
        : null;

  const educationLabel =
    a.education === "other" && a.educationOther
      ? a.educationOther
      : a.education
        ? (EDUCATION_LABEL[a.education] ?? null)
        : null;

  const constraintIds = (a.constraints ?? []).filter((c) => c !== "none");
  const hardConstraints = [
    ...enLabels(
      "constraints",
      constraintIds.filter((c) => c !== "other"),
    ),
    ...(constraintIds.includes("other") && a.constraintsOther?.trim()
      ? [a.constraintsOther.trim()]
      : []),
  ];

  const minIncomeTier = typeof a.minIncomeBracket === "number" ? a.minIncomeBracket : null;
  const minimumMonthlyIncome =
    minIncomeTier !== null ? (minIncomeTiers[minIncomeTier]?.value ?? null) : null;

  const stageLabel = enLabel("status", a.status);

  return {
    identity: {
      age,
      country: a.country ?? null,
      state: a.state ?? null,
      city: a.city ?? null,
      education: educationLabel,
      currentStatus: LEGACY_STATUS_LABEL[statusId] ?? null,
      currentStatusDetail: statusId === "other" ? (a.statusOther ?? null) : null,
      languages: a.languages ?? [],
      currentBusiness: isBusinessOwner
        ? { revenueBracket: business?.turnoverLabel ?? null, customers: null }
        : statusId === "freelancer"
          ? { revenueBracket: null, customers: null }
          : null,
      currency: currency.code,
      currencySymbol: currency.symbol,
    },
    skills,
    experienceYears,
    resources: {
      capitalAmount,
      capitalBracket: label("capital", capitalTiers, a.capitalBracket),
      annualIncomeAmount,
      assets: enLabels("access", a.access).filter((l) => l !== "None of these"),
      internetQuality: null,
      transportation: null,
    },
    time: {
      weeklyHours: a.weeklyHours
        ? (HOURS_MIDPOINT[a.weeklyHours as keyof typeof HOURS_MIDPOINT] ?? 5)
        : 5,
      weeklyHoursBracket: enLabel("hours", a.weeklyHours),
    },
    workStyle: {
      location: null,
      type: null,
      leadership,
      salesComfort,
      soloOrTeam: a.teamPreference ? (TEAM_TO_LEGACY[a.teamPreference] ?? null) : null,
    },
    risk: { appetite: a.riskTolerance ? (RISK_MAP[a.riskTolerance] ?? null) : null },
    motivation: {
      // Soft signals: what keeps them going and what interests them. Never a
      // reason to anchor on an industry (see formatProfileForPrompt).
      biggestMotivation: a.commitment ? [enLabel("commitment", a.commitment) ?? a.commitment] : [],
      dailyFrustration: enLabels("interests", a.interests),
    },
    constraints: {
      industryRestrictions: enLabels(
        "refuse",
        (a.refuse ?? []).filter((r) => r !== "none"),
      ),
      relocation: enLabel("relocation", a.relocation),
      other: hardConstraints,
    },
    direction: {
      goals: [enLabel("hope", a.hope), enLabel("scale", a.scale)].filter((g): g is string =>
        Boolean(g),
      ),
      // Retired on purpose: a "what monthly income would feel like a win"
      // target anchored high-potential founders downward. The minimum income
      // they NEED is a constraint (v2.ambition.minimumMonthlyIncome), not a target.
      monthlyIncomeGoalAmount: null,
      timeline: enLabel("horizon", a.horizon),
      willingToLeaveJob: null,
    },
    v2: {
      status: stageLabel,
      education: {
        level: educationLabel,
        major: a.major === "other" ? (a.majorOther ?? null) : enLabel("major", a.major),
        institution: a.institutionName ?? null,
        studyYear: enLabel("study_year", a.studyYear),
      },
      domains: enLabels(
        "domains",
        (a.domains ?? []).filter((d) => d !== "none"),
      ),
      executionSignals: enLabels("execution", executionIds),
      access: enLabels(
        "access",
        (a.access ?? []).filter((x) => x !== "none"),
      ),
      capitalTier: typeof a.capitalBracket === "number" ? a.capitalBracket : null,
      capitalTierCount: bracketCount("capital"),
      position: {
        annualIncomeTier: incomeTier,
        annualIncomeTierCount: bracketCount("income"),
        annualIncomeLabel: label("income", incomeTiers, incomeTier ?? undefined),
        business,
      },
      execution: {
        riskTolerance: enLabel("risk", a.riskTolerance),
        roles: enLabels("roles", roles),
        teamPreference: enLabel("team", a.teamPreference),
      },
      commitment: enLabel("commitment", a.commitment),
      interests: enLabels("interests", a.interests),
      hardConstraints,
      ambition: {
        scale: enLabel("scale", a.scale),
        scaleId: a.scale ?? null,
        horizon: enLabel("horizon", a.horizon),
        minimumMonthlyIncome,
        minimumMonthlyIncomeLabel: label("minIncome", minIncomeTiers, minIncomeTier ?? undefined),
        hope: enLabel("hope", a.hope),
      },
    },
  };
}

/** Exposed for tests / display helpers. */
export { formatAmount, SECTOR_DOMAIN_IDS };
