/** The label IS the stored value (there's no backend enum contract to keep
 * in sync with) — this is exactly what the "choice" question renderer
 * stores when the user taps an option, so it must match STATUS_OPTIONS
 * verbatim. */
export type CurrentStatus =
  | "School Student"
  | "College Student"
  | "Working Professional"
  | "Business Owner"
  | "Freelancer"
  | "Unemployed"
  | "Career Break"
  | "Other";

export type SkillLevel = "never_tried" | "beginner" | "intermediate" | "advanced" | "professional";

export interface SkillEntry {
  name: string;
  level: SkillLevel;
}

/** Every field is optional — the flow is adaptive and skippable, and
 * there is no backend to enforce required fields against.
 *
 * Every field here earns its place by materially changing the
 * recommendation engine's output (fit score, candidate generation, or
 * roadmap design) — not just by being interesting to know. A field that
 * only ever became flavor text in an AI prompt, never a scoring input or
 * a decision branch, was cut. */
export interface OnboardingAnswers {
  // Section 1 — Getting to Know You
  age?: string;
  country?: string;
  state?: string;
  city?: string;
  /** Only set when a postal/PIN lookup was actually used to resolve
   * state+city (see LocationPicker) — absent for the manual-entry path. */
  postalCode?: string;
  education?: string;
  currentStatus?: CurrentStatus;
  languages?: string[];

  subjects?: string[];
  futureCareerInterests?: string;

  degree?: string;
  major?: string;

  industry?: string;
  yearsExperience?: string;
  /** Asked for Working Professional, Business Owner, and Freelancer — it's
   * a distinct signal from investmentBudget (income vs. investable
   * capital aren't the same thing), and directly useful for judging
   * realistic side-income goals against their existing earnings. */
  annualIncome?: string;

  timeAvailableWeekly?: string;

  // Section 2 — Your Starting Point
  investmentBudget?: string;
  /** Only asked when investmentBudget is the open-ended top bracket —
   * stores the exact rupee figure (not a re-bucketed range), e.g. 2500000. */
  preciseCapital?: string;
  assets?: string[];
  internetQuality?: string;
  transportation?: string;

  // Section 3 — Skills & Strengths
  skills?: SkillEntry[];
  hasEarnedFromSkill?: string;

  // Section 4 — How You Like to Work
  workLocation?: string;
  workType?: string;
  leadership?: string;
  salesComfort?: string;
  riskAppetite?: string;
  soloOrTeam?: string;

  // Section 5 — Your Vision
  goals?: string[];
  monthlyIncomeGoal?: string;
  timeline?: string;

  // Section 6 — Your Constraints
  industryRestrictions?: string[];
  relocation?: string;
  healthLimitations?: string;
  otherConstraints?: string;

  // Section 7 — Founder Mindset
  biggestMotivation?: string;
  dailyFrustration?: string;
}

export type AnswerKey = keyof OnboardingAnswers;

export const STATUS_OPTIONS: CurrentStatus[] = [
  "School Student",
  "College Student",
  "Working Professional",
  "Business Owner",
  "Freelancer",
  "Unemployed",
  "Career Break",
  "Other",
];

export const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: "never_tried", label: "Never Tried" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "professional", label: "Professional" },
];

export const SKILL_CATEGORIES: { label: string; skills: string[] }[] = [
  {
    label: "Creating",
    skills: [
      "Writing",
      "Graphic Design",
      "Video Editing",
      "Photography",
      "Illustration",
      "Copywriting",
      "Music Production",
      "Singing",
      "Fashion & Styling",
    ],
  },
  {
    label: "Technology",
    skills: [
      "Coding",
      "Web Development",
      "App Development",
      "Data Analysis",
      "Excel / Spreadsheets",
      "SEO",
      "Digital Marketing",
    ],
  },
  {
    label: "People",
    skills: [
      "Public Speaking",
      "Teaching / Tutoring",
      "Customer Service",
      "Negotiation",
      "Leadership",
      "Translation",
      "Sports Coaching",
      "Event Planning",
    ],
  },
  {
    label: "Business",
    skills: [
      "Sales",
      "Social Media",
      "Accounting",
      "Bookkeeping",
      "Project Management",
      "Research",
    ],
  },
  {
    label: "Practical & Trades",
    skills: [
      "Cooking / Baking",
      "Handicrafts",
      "Agriculture",
      "Carpentry",
      "Electrical Work",
      "Tailoring",
      "Driving",
    ],
  },
];

export const SKILL_LIBRARY = SKILL_CATEGORIES.flatMap((c) => c.skills);

export const LANGUAGE_LIBRARY = [
  "English",
  "Hindi",
  "Bengali",
  "Telugu",
  "Marathi",
  "Tamil",
  "Urdu",
  "Gujarati",
  "Kannada",
  "Odia",
  "Malayalam",
  "Punjabi",
  "Assamese",
];

export const INCOME_BRACKETS = [
  "< ₹3L",
  "₹3–5L",
  "₹5–10L",
  "₹10–20L",
  "₹20–50L",
  "₹50L+",
  "Prefer not to say",
];

export const INVESTMENT_BRACKETS = [
  "₹0 — I have no capital right now",
  "Under ₹10,000",
  "₹10,000 – ₹50,000",
  "₹50,000 – ₹2,00,000",
  "More than ₹2,00,000",
];

export const WEEKLY_HOURS = ["Under 5 hrs", "5–10 hrs", "10–20 hrs", "20+ hrs", "Full-time"];
