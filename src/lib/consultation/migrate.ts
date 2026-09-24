import type { OnboardingAnswers } from "@/lib/onboarding-types";
import { getBrackets } from "./brackets";
import { getCurrencyForCountry, parseCurrencyAmount } from "@/lib/country-currency";
import type { ConsultationAnswers, SkillEntry } from "./model";

/**
 * Best-effort conversion of a pre-rebuild (v1) consultation into the v2 answer
 * shape. It exists ONLY to pre-fill Settings → Edit Founder Profile from a
 * founder's last completed consultation: `normalizeProfile` still reads v1
 * rows through its original, untouched path, so nothing already generated is
 * ever reinterpreted. Anything with no honest v2 equivalent is simply left
 * blank for the founder to answer, never guessed.
 */

const STATUS: Record<string, string> = {
  "School Student": "school_student",
  "College Student": "college_student",
  "Working Professional": "working_professional",
  "Business Owner": "business_owner",
  Freelancer: "freelancer",
  Unemployed: "not_working",
  "Career Break": "career_break",
  Other: "other",
};

const EDUCATION: Record<string, string> = {
  "Below 10th": "below_10",
  "10th Pass": "tenth",
  "12th Pass": "twelfth",
  Diploma: "diploma",
  "Bachelor's Degree": "bachelors",
  "Master's Degree": "masters",
  Doctorate: "doctorate",
  Other: "other",
};

const HOURS: Record<string, string> = {
  "Under 5 hrs": "lt5",
  "5–10 hrs": "h5_10",
  "10–20 hrs": "h10_20",
  "20+ hrs": "h20_30",
  "Full-time": "h40plus",
};

const MAJOR: Record<string, string> = {
  "Computer Science / IT": "cs_it",
  Engineering: "engineering",
  "Business / Commerce": "business",
  Economics: "economics",
  "Finance / Accounting": "finance_accounting",
  Marketing: "marketing",
  Design: "design",
  Architecture: "architecture",
  "Medicine / Health Sciences": "medicine",
  "Life Sciences / Biology": "life_sciences",
  "Physics / Chemistry / Math": "physical_sciences_math",
  Law: "law",
  Psychology: "psychology",
  "Social Sciences": "social_sciences",
  "Political Science / Public Policy": "public_policy",
  "Journalism / Mass Communication": "journalism",
  "Literature / Languages": "literature_languages",
  "Fine Arts / Performing Arts": "arts",
  Education: "education_field",
  Agriculture: "agriculture_field",
  "Hospitality / Tourism": "hospitality_field",
  Other: "other",
};

const INDUSTRY_TO_DOMAIN: Record<string, string> = {
  "Technology / Software": "software",
  "E-commerce / Retail": "ecommerce",
  "Finance / Banking": "finance",
  Healthcare: "healthcare",
  Education: "education",
  Manufacturing: "manufacturing",
  "Real Estate / Construction": "realestate",
  "Hospitality / Travel": "hospitality",
  "Media / Entertainment": "media",
  "Marketing / Advertising": "marketing",
  Consulting: "consulting",
  "Agriculture / Food": "agri_food",
  "Logistics / Transportation": "logistics",
  "Government / Public Sector": "government",
  "Non-profit / Social Impact": "nonprofit",
  Legal: "legal",
};

const INTEREST: Record<string, string> = {
  "Healthcare & wellbeing": "health",
  "Education & learning": "education",
  "Environment & sustainability": "environment",
  "Local commerce & small business": "local_commerce",
  "Technology accessibility": "tech_access",
  "Financial inclusion": "fin_inclusion",
  "Food & agriculture": "food_agri",
  "Transportation & logistics": "transport",
  "Housing & urban life": "housing",
  "Community & social connection": "community",
};

const REFUSE: Record<string, string> = {
  Alcohol: "alcohol",
  Tobacco: "tobacco",
  Gambling: "gambling",
  "Adult content": "adult",
  "Weapons / firearms": "weapons",
  "Animal products / testing": "animal",
  "Religion or politics": "religion_politics",
};

const RELOCATION: Record<string, string> = {
  "Yes, easily": "yes",
  "Possibly, for the right reason": "exceptional",
  Unlikely: "unlikely",
  No: "no",
};

const COMMITMENT: Record<string, string> = {
  "Solving a problem I've personally experienced": "solve_problem",
  "Financial independence": "financial_independence",
  "Making an impact in my community": "social_impact",
  "Proving I can build something from scratch": "technical_difficulty",
};

const HOPE: Record<string, string> = {
  "Pocket money": "portfolio_income",
  "A second income stream": "portfolio_income",
  "A steady income": "portfolio_income",
  "Replacing my salary": "full_time",
  "Eventually quitting my job": "full_time",
  "A future startup": "large_company",
  "Social impact": "social_impact",
  "Learning entrepreneurship": "not_sure",
};

const HORIZON: Record<string, string> = {
  "6–12 months": "m6_12",
  "Within 3 months": "m6_12",
  "3–6 months": "m6_12",
  "1–2 years": "y1_2",
};

const RISK: Record<string, string> = {
  "Very cautious": "conservative",
  Balanced: "balanced",
  "Comfortable experimenting": "meaningful",
};

const TEAM: Record<string, string> = {
  Solo: "solo",
  "With a small team": "small_team",
  "With a co-founder": "open_cofounder",
  "Not sure yet": "no_preference",
};

const LEGACY_LEVEL: Record<string, SkillEntry["level"]> = {
  beginner: "basic",
  comfortable: "working",
  advanced: "advanced",
};

const CONSTRAINT: Record<string, string> = {
  "Caregiving or family commitments": "family",
  "Limited mobility or travel": "limited_travel",
};

function pick<T>(map: Record<string, T>, key: string | undefined): T | undefined {
  return key ? map[key] : undefined;
}

export function isLegacyAnswers(answers: unknown): answers is OnboardingAnswers {
  return typeof answers === "object" && answers !== null && (answers as { v?: unknown }).v !== 2;
}

export function legacyToV2(legacy: OnboardingAnswers): ConsultationAnswers {
  const out: ConsultationAnswers = { v: 2 };

  if (legacy.age) out.age = legacy.age;
  const status = pick(STATUS, legacy.currentStatus);
  if (status) out.status = status;
  if (legacy.currentStatusOther) out.statusOther = legacy.currentStatusOther;
  if (legacy.country) out.country = legacy.country;
  if (legacy.state) out.state = legacy.state;
  if (legacy.city) out.city = legacy.city;
  if (legacy.postalCode) out.postalCode = legacy.postalCode;

  const education = pick(EDUCATION, legacy.education);
  if (education) out.education = education;
  if (legacy.educationOther) out.educationOther = legacy.educationOther;
  const major = pick(MAJOR, legacy.major);
  if (major) out.major = major;
  if (legacy.majorOther) out.majorOther = legacy.majorOther;
  if (legacy.institutionName) out.institutionName = legacy.institutionName;
  if (legacy.institutionCountry) out.institutionCountry = legacy.institutionCountry;
  if (legacy.institutionManual !== undefined) out.institutionManual = legacy.institutionManual;
  if (legacy.languages?.length) out.languages = legacy.languages;
  const hours = pick(HOURS, legacy.timeAvailableWeekly);
  if (hours) out.weeklyHours = hours;

  // "Never tried" is not a skill — it is dropped, not carried forward.
  const skills: SkillEntry[] = [];
  for (const s of legacy.skills ?? []) {
    const level = LEGACY_LEVEL[s.level];
    if (level) skills.push({ name: s.name, level, usedInReal: false });
  }
  if (skills.length > 0) out.skills = skills;

  const domain = pick(INDUSTRY_TO_DOMAIN, legacy.industry);
  if (domain) out.domains = [domain];

  const currency = getCurrencyForCountry(legacy.country).code;
  const capitalTiers = getBrackets("capital", currency);
  if (legacy.investmentBudget) {
    // The five legacy tiers line up with the first five new tiers.
    const idx = legacyCapitalIndex(legacy.investmentBudget, currency);
    if (idx !== null) out.capitalBracket = idx;
  }
  if (legacy.preciseCapital) {
    const amount = parseCurrencyAmount(legacy.preciseCapital, currency);
    if (amount !== null && amount > 0) {
      const tier = capitalTiers.findIndex(
        (b) => !b.zero && (b.min === null || amount >= b.min) && (b.max === null || amount < b.max),
      );
      if (tier >= 0) out.capitalBracket = tier;
      out.capitalPrecise = String(amount);
    }
  }

  const access: string[] = [];
  for (const a of legacy.assets ?? []) {
    if (a === "A laptop / computer") access.push("laptop");
    if (a === "A workspace at home") access.push("workspace");
    if (a === "None of these yet") access.push("none");
  }
  if (access.length > 0) out.access = Array.from(new Set(access));

  if (legacy.currentStatus === "Business Owner" || legacy.currentStatus === "Freelancer") {
    const sector = pick(INDUSTRY_TO_DOMAIN, legacy.industry);
    if (legacy.currentStatus === "Business Owner" && sector) out.bizSector = sector;
    // Legacy "revenue" brackets topped out at 50L+; only that top tier maps
    // beyond the first turnover tier.
    if (legacy.currentBusinessRevenue) {
      out.bizTurnoverBracket = /50L\+|\+$/.test(legacy.currentBusinessRevenue) ? 1 : 0;
    }
  }
  if (
    legacy.annualIncome &&
    (legacy.currentStatus === "Working Professional" || legacy.currentStatus === "Freelancer")
  ) {
    const idx = legacyIncomeIndex(legacy.annualIncome, currency);
    if (idx !== null) out.annualIncomeBracket = idx;
  }

  const risk = pick(RISK, legacy.riskAppetite);
  if (risk) out.riskTolerance = risk;
  const roles: string[] = [];
  if (legacy.leadership === "Very comfortable" || legacy.leadership === "Somewhat comfortable")
    roles.push("leading");
  if (legacy.salesComfort === "I enjoy it" || legacy.salesComfort === "I can do it if needed")
    roles.push("selling");
  if (legacy.workType === "Building a product") roles.push("building");
  if (roles.length > 0) out.roles = roles;
  const team = pick(TEAM, legacy.soloOrTeam);
  if (team) out.teamPreference = team;

  const commitment = (legacy.biggestMotivation ?? []).map((m) => COMMITMENT[m]).find(Boolean);
  if (commitment) out.commitment = commitment;
  const interests = (legacy.dailyFrustration ?? []).map((d) => INTEREST[d]).filter(Boolean);
  if (interests.length > 0) out.interests = interests;

  const refuse = (legacy.industryRestrictions ?? []).map((r) => REFUSE[r]).filter(Boolean);
  if (refuse.length > 0) out.refuse = refuse;
  const relocation = pick(RELOCATION, legacy.relocation);
  if (relocation) out.relocation = relocation;

  const rawConstraints = (legacy.otherConstraints ?? []).filter((c) => c !== "None of these");
  if (legacy.otherConstraints) {
    const mapped = rawConstraints.map((c) => CONSTRAINT[c]).filter(Boolean);
    const unmapped = rawConstraints.filter((c) => !CONSTRAINT[c] && c !== "Other");
    const list = [...mapped];
    if (unmapped.length > 0 || rawConstraints.includes("Other")) list.push("other");
    out.constraints = list.length > 0 ? list : ["none"];
    const otherText = [...unmapped, legacy.otherConstraintsOther].filter(Boolean).join("; ");
    if (list.includes("other") && otherText) out.constraintsOther = otherText.slice(0, 200);
  }

  const hope = (legacy.goals ?? []).map((g) => HOPE[g]).find(Boolean);
  if (hope) out.hope = hope;
  if ((legacy.goals ?? []).includes("Scaling an existing venture")) out.scale = "expand_existing";
  const horizon = pick(HORIZON, legacy.timeline);
  if (horizon) out.horizon = horizon;

  return out;
}

/** Legacy capital labels were currency-specific text; their ORDER is what is
 * stable. Match the five known INR labels exactly, and every other currency by
 * its position markers. */
function legacyCapitalIndex(label: string, currency: string): number | null {
  const inr = [
    "₹0 — I have no capital right now",
    "Under ₹10,000",
    "₹10,000 – ₹50,000",
    "₹50,000 – ₹2,00,000",
    "More than ₹2,00,000",
  ];
  if (currency === "INR") {
    const i = inr.indexOf(label);
    return i >= 0 ? i : null;
  }
  if (/I have no capital right now/.test(label)) return 0;
  if (/^Under /.test(label)) return 1;
  if (/^More than /.test(label)) return 4;
  if (label.includes("–")) return null; // ambiguous middle tiers: ask again
  return null;
}

function legacyIncomeIndex(label: string, currency: string): number | null {
  if (currency === "INR") {
    const inr = ["< ₹3L", "₹3–5L", "₹5–10L", "₹10–20L", "₹20–50L", "₹50L+"];
    const i = inr.indexOf(label);
    return i >= 0 ? i : null;
  }
  if (/^Under /.test(label)) return 0;
  if (/\+$/.test(label)) return 5;
  return null;
}
