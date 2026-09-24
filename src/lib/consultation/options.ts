/**
 * Option catalogues for the seven-stage consultation. Every stored answer is a
 * language-neutral id (never a translated label), so an answer given in Hindi
 * means exactly the same thing as one given in English, and the AI prompt can
 * always be built from the canonical English labels.
 *
 * Labels live in messages/consult.ts under `opt.<group>.<id>`.
 */

export const STATUS_IDS = [
  "school_student",
  "college_student",
  "working_professional",
  "business_owner",
  "freelancer",
  "career_break",
  "not_working",
  "other",
] as const;

export const EDUCATION_IDS = [
  "below_10",
  "tenth",
  "twelfth",
  "diploma",
  "bachelors",
  "masters",
  "doctorate",
  "other",
] as const;

/** Levels of education where a degree/major and institution are relevant. */
export const DEGREE_LEVEL_EDUCATION = new Set(["diploma", "bachelors", "masters", "doctorate"]);

/** Field of study. "other" pairs with a free-text majorOther. */
export const MAJOR_IDS = [
  "cs_it",
  "engineering",
  "business",
  "economics",
  "finance_accounting",
  "marketing",
  "design",
  "architecture",
  "medicine",
  "life_sciences",
  "physical_sciences_math",
  "law",
  "psychology",
  "social_sciences",
  "public_policy",
  "journalism",
  "literature_languages",
  "arts",
  "education_field",
  "agriculture_field",
  "hospitality_field",
  "other",
] as const;

export const STUDY_YEAR_IDS = ["y1", "y2", "y3", "y4", "y5plus", "recent_grad"] as const;

export const HOURS_IDS = ["lt5", "h5_10", "h10_20", "h20_30", "h30_40", "h40plus"] as const;
/** Representative weekly hours for each bracket — deterministic scoring only. */
export const HOURS_MIDPOINT: Record<(typeof HOURS_IDS)[number], number> = {
  lt5: 3,
  h5_10: 7.5,
  h10_20: 15,
  h20_30: 25,
  h30_40: 35,
  h40plus: 45,
};

export const SKILL_LEVEL_IDS = ["basic", "working", "advanced", "professional"] as const;

/** Experience domains: where the founder has actually worked. */
export const DOMAIN_IDS = [
  "software",
  "ecommerce",
  "finance",
  "healthcare",
  "education",
  "manufacturing",
  "realestate",
  "hospitality",
  "media",
  "marketing",
  "consulting",
  "agri_food",
  "logistics",
  "government",
  "nonprofit",
  "legal",
  "sales",
  "operations",
  "product",
  "engineering",
  "design",
  "accounting",
  "hr",
  "support",
  "data_research",
  "none",
] as const;

/** What the founder has actually done — execution evidence, not self-image. */
export const EXECUTION_IDS = [
  "built_product",
  "sold_customers",
  "managed_team",
  "managed_budget",
  "wrote_software",
  "worked_operations",
  "conducted_research",
  "built_audience",
  "ran_business",
  "none_yet",
] as const;

export const ACCESS_IDS = [
  "laptop",
  "workspace",
  "cofounder",
  "team",
  "customer_network",
  "audience",
  "suppliers",
  "manufacturing",
  "existing_business",
  "mentors",
  "none",
] as const;

export const RISK_IDS = ["conservative", "balanced", "meaningful", "high"] as const;
export const ROLE_IDS = ["selling", "building", "operations", "research", "leading"] as const;
export const TEAM_IDS = [
  "solo",
  "open_cofounder",
  "small_team",
  "has_team",
  "no_preference",
] as const;

export const COMMITMENT_IDS = [
  "large_company",
  "financial_independence",
  "solve_problem",
  "expand_family_business",
  "autonomy",
  "technical_difficulty",
  "social_impact",
  "not_sure",
] as const;

/** Soft-signal interest areas (the existing category set). */
export const INTEREST_IDS = [
  "health",
  "education",
  "environment",
  "local_commerce",
  "tech_access",
  "fin_inclusion",
  "food_agri",
  "transport",
  "housing",
  "community",
] as const;

export const REFUSE_IDS = [
  "alcohol",
  "tobacco",
  "gambling",
  "adult",
  "weapons",
  "animal",
  "religion_politics",
  "none",
] as const;

export const RELOCATION_IDS = ["yes", "exceptional", "unlikely", "no"] as const;

export const CONSTRAINT_IDS = [
  "cannot_leave",
  "no_debt",
  "family",
  "location_bound",
  "limited_travel",
  "no_inventory",
  "no_regulated",
  "limited_capital",
  "other",
  "none",
] as const;

export const SCALE_IDS = [
  "profitable",
  "national",
  "global",
  "expand_existing",
  "not_sure",
] as const;
export const HORIZON_IDS = ["m6_12", "y1_2", "y2_4", "y5plus"] as const;
export const HOPE_IDS = [
  "portfolio_income",
  "full_time",
  "large_company",
  "social_impact",
  "family_expansion",
  "not_sure",
] as const;

/** The exclusive "none of these" option in each multi-select — selecting it
 * clears the others, selecting anything else clears it. */
export const EXCLUSIVE_NONE: Record<string, string> = {
  domains: "none",
  executionSignals: "none_yet",
  access: "none",
  refuse: "none",
  constraints: "none",
};

/** India's states and union territories (state select for the primary market;
 * every other country uses free text + city suggestions). */
export const INDIA_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

/** ISO 639-1 codes for the language library, so language names can be shown
 * in the reader's own language via Intl.DisplayNames with no hand-typed
 * translations. */
export const LANGUAGE_CODES: Record<string, string> = {
  English: "en",
  Hindi: "hi",
  Bengali: "bn",
  Telugu: "te",
  Marathi: "mr",
  Tamil: "ta",
  Urdu: "ur",
  Gujarati: "gu",
  Kannada: "kn",
  Odia: "or",
  Malayalam: "ml",
  Punjabi: "pa",
  Assamese: "as",
};

/** Sector domains that double as a business owner's sector. */
export const SECTOR_DOMAIN_IDS = DOMAIN_IDS.slice(0, 16);

/** Stable slug for skill names so translations can be keyed by them. */
export function skillSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const optionKey = (group: string, id: string) => `opt.${group}.${id}`;
