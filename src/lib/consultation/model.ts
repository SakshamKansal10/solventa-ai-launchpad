import { bracketCount, TEAM_SIZE_IDS } from "./brackets";
import { DEGREE_LEVEL_EDUCATION, EXCLUSIVE_NONE, SKILL_LEVEL_IDS } from "./options";

/** A skill the founder claims. There is deliberately no "never tried" level:
 * a skill you have never tried is not a skill. `usedInReal` separates
 * something practised on a real project/job from something only studied,
 * so a beginner tick-box can never become a dominant recommendation signal. */
export interface SkillEntry {
  name: string;
  level: (typeof SKILL_LEVEL_IDS)[number] | null;
  usedInReal: boolean;
}

/** Consultation answers, schema v2. Every option-valued field stores a stable
 * language-neutral id; bracket fields store the tier index. */
export interface ConsultationAnswers {
  v?: 2;

  // Stage 1 — Foundation
  age?: string;
  status?: string;
  statusOther?: string;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  education?: string;
  educationOther?: string;
  major?: string;
  majorOther?: string;
  institutionName?: string;
  institutionCountry?: string;
  institutionManual?: boolean;
  studyYear?: string;
  languages?: string[];
  weeklyHours?: string;

  // Stage 2 — Capability
  skills?: SkillEntry[];
  domains?: string[];
  executionSignals?: string[];

  // Stage 3 — Resources
  capitalBracket?: number;
  capitalPrecise?: string;
  access?: string[];
  annualIncomeBracket?: number;
  bizSector?: string;
  bizTurnoverBracket?: number;
  bizTeamBracket?: number;

  // Stage 4 — Execution & risk
  riskTolerance?: string;
  roles?: string[];
  teamPreference?: string;

  // Stage 5 — Motivation & interest (soft signals)
  commitment?: string;
  interests?: string[];

  // Stage 6 — Reality & hard constraints
  refuse?: string[];
  relocation?: string;
  constraints?: string[];
  constraintsOther?: string;

  // Stage 7 — Ambition
  scale?: string;
  horizon?: string;
  minIncomeBracket?: number;
  hope?: string;
}

export type AnswerKey = keyof ConsultationAnswers;

export const AGE_MIN = 13;
export const AGE_MAX = 90;

export function parseAge(raw: string | undefined): number | null {
  if (!raw || !/^\d{1,3}$/.test(raw.trim())) return null;
  const n = Number(raw.trim());
  return n >= AGE_MIN && n <= AGE_MAX ? n : null;
}

export const isEmployed = (a: ConsultationAnswers) =>
  a.status === "working_professional" || a.status === "freelancer";
export const isBusinessOwner = (a: ConsultationAnswers) => a.status === "business_owner";
export const isStudent = (a: ConsultationAnswers) =>
  a.status === "school_student" || a.status === "college_student";

const nonEmpty = (v: string | undefined) => typeof v === "string" && v.trim().length > 0;
const hasAny = (v: string[] | undefined) => Array.isArray(v) && v.length > 0;

export type ScreenKey =
  | "basics"
  | "location"
  | "education"
  | "languagesTime"
  | "skills"
  | "domains"
  | "execution"
  | "capital"
  | "access"
  | "position"
  | "riskRoles"
  | "commitment"
  | "interests"
  | "refuseRelocation"
  | "constraints"
  | "scaleHorizon"
  | "incomeHope";

export interface ScreenDef {
  key: ScreenKey;
  /** 1–7. */
  stage: number;
  /** Adaptive screens only appear when this returns true. */
  applies?: (a: ConsultationAnswers) => boolean;
  /** Whether Continue is enabled. Required input only — optional fields
   * never block. */
  isComplete: (a: ConsultationAnswers) => boolean;
  /** Answer keys this screen owns (used to clear a screen's answers when the
   * branch that made it relevant changes). */
  owns: AnswerKey[];
}

export const STAGE_COUNT = 7;
export const STAGE_IDS = [
  "foundation",
  "capability",
  "resources",
  "execution",
  "motivation",
  "reality",
  "ambition",
] as const;

export const SCREENS: ScreenDef[] = [
  {
    key: "basics",
    stage: 1,
    owns: ["age", "status", "statusOther"],
    isComplete: (a) =>
      parseAge(a.age) !== null &&
      nonEmpty(a.status) &&
      (a.status !== "other" || nonEmpty(a.statusOther)),
  },
  {
    key: "location",
    stage: 1,
    owns: ["country", "state", "city", "postalCode"],
    isComplete: (a) => nonEmpty(a.country) && nonEmpty(a.city),
  },
  {
    key: "education",
    stage: 1,
    owns: [
      "education",
      "educationOther",
      "major",
      "majorOther",
      "institutionName",
      "institutionCountry",
      "institutionManual",
      "studyYear",
    ],
    isComplete: (a) => {
      if (!nonEmpty(a.education)) return false;
      if (a.education === "other" && !nonEmpty(a.educationOther)) return false;
      const degree = DEGREE_LEVEL_EDUCATION.has(a.education ?? "");
      if (degree && !nonEmpty(a.major)) return false;
      if (degree && a.major === "other" && !nonEmpty(a.majorOther)) return false;
      if (a.status === "college_student" && !nonEmpty(a.studyYear)) return false;
      return true;
    },
  },
  {
    key: "languagesTime",
    stage: 1,
    owns: ["languages", "weeklyHours"],
    isComplete: (a) => hasAny(a.languages) && nonEmpty(a.weeklyHours),
  },
  {
    key: "skills",
    stage: 2,
    owns: ["skills"],
    // Skills are optional (a founder can genuinely have none yet) — but any
    // skill that IS listed must state how good it really is.
    isComplete: (a) => (a.skills ?? []).every((s) => s.level !== null),
  },
  {
    key: "domains",
    stage: 2,
    owns: ["domains"],
    isComplete: (a) => hasAny(a.domains),
  },
  {
    key: "execution",
    stage: 2,
    owns: ["executionSignals"],
    isComplete: (a) => hasAny(a.executionSignals),
  },
  {
    key: "capital",
    stage: 3,
    owns: ["capitalBracket", "capitalPrecise"],
    isComplete: (a) => typeof a.capitalBracket === "number",
  },
  {
    key: "access",
    stage: 3,
    owns: ["access"],
    isComplete: (a) => hasAny(a.access),
  },
  {
    key: "position",
    stage: 3,
    applies: (a) => isEmployed(a) || isBusinessOwner(a),
    owns: ["annualIncomeBracket", "bizSector", "bizTurnoverBracket", "bizTeamBracket"],
    isComplete: (a) =>
      isBusinessOwner(a)
        ? nonEmpty(a.bizSector) &&
          typeof a.bizTurnoverBracket === "number" &&
          typeof a.bizTeamBracket === "number"
        : true, // income is optional for employees/freelancers
  },
  {
    key: "riskRoles",
    stage: 4,
    owns: ["riskTolerance", "roles", "teamPreference"],
    isComplete: (a) => nonEmpty(a.riskTolerance) && hasAny(a.roles) && nonEmpty(a.teamPreference),
  },
  {
    key: "commitment",
    stage: 5,
    owns: ["commitment"],
    isComplete: (a) => nonEmpty(a.commitment),
  },
  {
    key: "interests",
    stage: 5,
    owns: ["interests"],
    isComplete: () => true, // soft signal — never blocks
  },
  {
    key: "refuseRelocation",
    stage: 6,
    owns: ["refuse", "relocation"],
    isComplete: (a) => nonEmpty(a.relocation),
  },
  {
    key: "constraints",
    stage: 6,
    owns: ["constraints", "constraintsOther"],
    isComplete: (a) => hasAny(a.constraints),
  },
  {
    key: "scaleHorizon",
    stage: 7,
    owns: ["scale", "horizon"],
    isComplete: (a) => nonEmpty(a.scale) && nonEmpty(a.horizon),
  },
  {
    key: "incomeHope",
    stage: 7,
    owns: ["minIncomeBracket", "hope"],
    isComplete: (a) => nonEmpty(a.hope),
  },
];

export function resolveScreens(a: ConsultationAnswers): ScreenDef[] {
  return SCREENS.filter((s) => !s.applies || s.applies(a));
}

/** Everything a step can be at any point: a real screen, or the terminal
 * account/submit step that appears after the last question. */
export const SUBMIT_KEY = "submit" as const;

export function screenIndexForKey(screens: ScreenDef[], key: string | null | undefined): number {
  if (!key) return 0;
  const exact = screens.findIndex((s) => s.key === key);
  if (exact >= 0) return exact;
  if (key === SUBMIT_KEY) return screens.length; // the submit step
  // The saved screen no longer applies (branch changed) — fall back to the
  // nearest earlier applicable screen in canonical order.
  const canonical = SCREENS.findIndex((s) => s.key === key);
  if (canonical < 0) return 0;
  for (let i = canonical - 1; i >= 0; i--) {
    const idx = screens.findIndex((s) => s.key === SCREENS[i].key);
    if (idx >= 0) return idx;
  }
  return 0;
}

/** Multi-select toggle that honours a group's exclusive "none of these". */
export function toggleMulti(field: string, current: string[] | undefined, id: string): string[] {
  const list = current ?? [];
  const none = EXCLUSIVE_NONE[field];
  if (list.includes(id)) return list.filter((x) => x !== id);
  if (none && id === none) return [id];
  return [...list.filter((x) => x !== none), id];
}

/** When the founder's status changes, drop answers that belonged only to the
 * branch that no longer applies — otherwise a student's study year (or an
 * employee's income) would silently ride along into a business owner's profile. */
export function applyAnswer<K extends AnswerKey>(
  prev: ConsultationAnswers,
  key: K,
  value: ConsultationAnswers[K],
): ConsultationAnswers {
  const next: ConsultationAnswers = { ...prev, [key]: value };
  if (key === "status" && prev.status !== value) {
    delete next.studyYear;
    delete next.annualIncomeBracket;
    delete next.bizSector;
    delete next.bizTurnoverBracket;
    delete next.bizTeamBracket;
    if (value !== "other") delete next.statusOther;
  }
  if (key === "education" && prev.education !== value) {
    if (!DEGREE_LEVEL_EDUCATION.has(String(value))) {
      delete next.major;
      delete next.majorOther;
      delete next.institutionName;
      delete next.institutionCountry;
      delete next.institutionManual;
    }
    if (value !== "other") delete next.educationOther;
  }
  if (key === "constraints" && Array.isArray(value) && !(value as unknown[]).includes("other")) {
    delete next.constraintsOther;
  }
  if (key === "country" && prev.country !== value) {
    // Regions/cities belong to a country; money tiers are re-read against the
    // new currency, so the index stays valid but a precise typed amount does not.
    delete next.state;
    delete next.city;
    delete next.postalCode;
    delete next.capitalPrecise;
  }
  return next;
}

export function stageOfScreen(key: string): number {
  return SCREENS.find((s) => s.key === key)?.stage ?? 1;
}

export const MAX_BRACKET_INDEX = {
  capital: bracketCount("capital") - 1,
  income: bracketCount("income") - 1,
  turnover: bracketCount("turnover") - 1,
  minIncome: bracketCount("minIncome") - 1,
  team: TEAM_SIZE_IDS.length - 1,
};
