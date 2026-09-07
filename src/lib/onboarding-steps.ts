import type { OnboardingAnswers } from "./onboarding-types";
import {
  CONSTRAINT_OPTIONS,
  INCOME_BRACKETS,
  INDUSTRY_OPTIONS,
  INVESTMENT_BRACKETS,
  MAJOR_OPTIONS,
  MOTIVATION_OPTIONS,
  PROBLEM_DOMAIN_OPTIONS,
  STATUS_OPTIONS,
  WEEKLY_HOURS,
} from "./onboarding-types";
import { COUNTRY_NAMES } from "./location-data";

export type InputKind =
  | "text"
  | "number"
  | "select"
  | "searchable-select"
  | "choice"
  | "multi-choice"
  | "searchable-multi"
  | "skills"
  | "spectrum"
  | "currency"
  | "textarea"
  /** Country → postal/PIN lookup → confirm/change → (fallback) region +
   * searchable city. Manages state/city/postalCode itself; see
   * LocationPicker.tsx. */
  | "location";

export interface QuestionStep {
  kind: "question";
  id: keyof OnboardingAnswers;
  section: number;
  input: InputKind;
  label: string;
  helper?: string;
  options?: string[];
  optional?: boolean;
  placeholder?: string;
  /** Simple questions (few options, no follow-up implications) can
   * auto-advance a beat after selection instead of waiting for Continue. */
  autoContinue?: boolean;
  condition?: (a: OnboardingAnswers) => boolean;
  /** multi-choice only. Adds an "All of the above" chip that selects every
   * option at once — only for questions where every option can genuinely
   * apply simultaneously (goals, assets, things to avoid), never for a
   * question with one true answer (risk tolerance, capital, time). */
  allowSelectAll?: boolean;
}

export interface SectionIntroStep {
  kind: "section-intro";
  section: number;
  title: string;
  body: string;
  reassurance?: string;
}

export interface ThinkingStep {
  kind: "thinking";
  afterSection: number;
}

export interface StaticStep {
  kind: "welcome" | "ai-intro" | "complete";
}

/** One sub-question inside a question-group screen — always a compact
 * chip choice, never a text/textarea/select (those don't compress well
 * onto a shared screen). Each keeps its own optional condition so a
 * group can still adapt per branch without needing a whole separate
 * group variant. */
export interface GroupItem {
  id: keyof OnboardingAnswers;
  label: string;
  options: string[];
  optional?: boolean;
  condition?: (a: OnboardingAnswers) => boolean;
}

/** Several short, related chip questions on ONE screen instead of one
 * screen each — this is the actual mechanism behind "group similar MCQs
 * together," not just shorter copy. Exists specifically for clusters of
 * quick, low-stakes choice questions (work style, comfort with people,
 * day-to-day reliability) that felt like rapid-fire form fields when each
 * got its own full screen. */
export interface QuestionGroupStep {
  kind: "question-group";
  section: number;
  title: string;
  helper?: string;
  items: GroupItem[];
}

export type Step = QuestionStep | QuestionGroupStep | SectionIntroStep | ThinkingStep | StaticStep;

const isStudent = (a: OnboardingAnswers) =>
  a.currentStatus === "School Student" || a.currentStatus === "College Student";

/** Has a job, not their own business — distinct from isEntrepreneur below
 * because the questions/goals that actually apply differ (career/income
 * questions vs. existing-business questions). */
const isEmployee = (a: OnboardingAnswers) => a.currentStatus === "Working Professional";

const isEntrepreneur = (a: OnboardingAnswers) =>
  a.currentStatus === "Business Owner" || a.currentStatus === "Freelancer";

const isWorking = (a: OnboardingAnswers) => isEmployee(a) || isEntrepreneur(a);

export const STEPS: Step[] = [
  { kind: "welcome" },
  { kind: "ai-intro" },

  // ===== Section 1 — Foundation =====
  {
    kind: "section-intro",
    section: 1,
    title: "Foundation",
    body: "Let's start with the basics — who you are, where you're based, and where you stand today.",
  },
  { kind: "question", id: "age", section: 1, input: "number", label: "How old are you?" },
  {
    kind: "question",
    id: "country",
    section: 1,
    input: "searchable-select",
    label: "Which country are you based in?",
    options: COUNTRY_NAMES,
  },
  {
    kind: "question",
    id: "city",
    section: 1,
    input: "location",
    label: "Where are you based?",
    condition: (a) => a.country !== undefined,
  },
  {
    kind: "question",
    id: "education",
    section: 1,
    input: "select",
    label: "What's your highest completed education?",
    options: [
      "Below 10th",
      "10th Pass",
      "12th Pass",
      "Diploma",
      "Bachelor's Degree",
      "Master's Degree",
      "Doctorate",
      "Other",
    ],
  },
  {
    kind: "question",
    id: "educationOther",
    section: 1,
    input: "text",
    label: "What's your highest completed education?",
    placeholder: "e.g. Vocational certification, trade school",
    condition: (a) => a.education === "Other",
  },
  {
    kind: "question",
    id: "currentStatus",
    section: 1,
    input: "choice",
    label: "Which of these best describes where you are right now?",
    options: STATUS_OPTIONS,
  },
  {
    kind: "question",
    id: "currentStatusOther",
    section: 1,
    input: "text",
    label: "What best describes where you are right now?",
    placeholder: "e.g. Full-time caregiver, between opportunities",
    condition: (a) => a.currentStatus === "Other",
  },
  {
    kind: "question",
    id: "languages",
    section: 1,
    input: "searchable-multi",
    label: "Which languages are you comfortable working in?",
    helper: "Search, select, or add your own.",
  },

  // College student branch
  {
    kind: "question",
    id: "major",
    section: 1,
    input: "select",
    label: "What's your major or specialization?",
    options: MAJOR_OPTIONS,
    condition: (a) => a.currentStatus === "College Student",
  },
  {
    kind: "question",
    id: "majorOther",
    section: 1,
    input: "text",
    label: "What's your major or specialization?",
    placeholder: "e.g. Marine biology, urban planning",
    condition: (a) => a.currentStatus === "College Student" && a.major === "Other",
  },

  // Working professional / business owner / freelancer branch
  {
    kind: "question",
    id: "industry",
    section: 1,
    input: "select",
    label: "What industry are you in?",
    options: INDUSTRY_OPTIONS,
    condition: isWorking,
  },
  {
    kind: "question",
    id: "industryOther",
    section: 1,
    input: "text",
    label: "What industry are you in?",
    placeholder: "e.g. Renewable energy, aerospace",
    condition: (a) => isWorking(a) && a.industry === "Other",
  },
  {
    kind: "question",
    id: "yearsExperience",
    section: 1,
    input: "select",
    label: "How many years of experience do you have?",
    options: ["Under 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"],
    condition: isEmployee,
  },
  {
    kind: "question",
    id: "annualIncome",
    section: 1,
    input: "select",
    label: "What's your approximate annual income?",
    options: INCOME_BRACKETS,
    optional: true,
    condition: isWorking,
  },

  // Entrepreneur / freelancer branch — an existing business changes what
  // "starting" even means, so it needs its own questions rather than
  // being folded into the employee-shaped ones above.
  {
    kind: "question",
    id: "currentBusinessRevenue",
    section: 1,
    input: "select",
    label: "What's your current business's approximate annual revenue?",
    options: INCOME_BRACKETS,
    optional: true,
    condition: isEntrepreneur,
  },
  {
    kind: "question",
    id: "currentBusinessCustomers",
    section: 1,
    input: "multi-choice",
    label: "Who are your current customers?",
    options: [
      "Individual consumers",
      "Local businesses",
      "Other businesses (B2B)",
      "Government or institutions",
      "Online & global customers",
    ],
    optional: true,
    allowSelectAll: true,
    condition: isEntrepreneur,
  },

  {
    kind: "question",
    id: "timeAvailableWeekly",
    section: 1,
    input: "choice",
    label: "How many hours a week can you realistically give to a new venture?",
    options: WEEKLY_HOURS,
  },

  { kind: "thinking", afterSection: 1 },

  // ===== Section 2 — Your Edge =====
  {
    kind: "section-intro",
    section: 2,
    title: "Your Edge",
    body: "Don't worry if you don't have professional experience yet — curiosity and willingness to learn matter just as much.",
  },
  {
    kind: "question",
    id: "skills",
    section: 2,
    input: "skills",
    label: "What are you good at?",
    helper: "Search, select, and rate your comfort level. Add your own if it's missing.",
    // Not having a listed skill yet is a legitimate, common answer — Sol
    // adapts (roadmaps teach missing skills first) rather than blocking
    // the founder from continuing at all.
    optional: true,
  },

  { kind: "thinking", afterSection: 2 },

  // ===== Section 3 — Your Resources =====
  {
    kind: "section-intro",
    section: 3,
    title: "Your Resources",
    body: "Money is only one resource. Many successful founders started with little capital — we'll design a journey around your current situation.",
  },
  {
    kind: "question",
    id: "investmentBudget",
    section: 3,
    input: "choice",
    label: "How much could you realistically invest to get started?",
    options: INVESTMENT_BRACKETS,
  },
  {
    kind: "question",
    id: "preciseCapital",
    section: 3,
    input: "currency",
    label: "Roughly how much could you realistically invest?",
    helper: "An approximate amount is perfectly fine.",
    placeholder: "e.g. 25 lakh, or 2 crore",
    condition: (a) => a.investmentBudget === "More than ₹2,00,000",
  },
  {
    kind: "question",
    id: "assets",
    section: 3,
    input: "multi-choice",
    label: "Do you have access to any of these?",
    options: [
      "A smartphone",
      "A laptop / computer",
      "A vehicle",
      "A workspace at home",
      "Camera / recording gear",
      "None of these yet",
    ],
    optional: true,
    allowSelectAll: true,
  },
  {
    kind: "question-group",
    section: 3,
    title: "Your Everyday Reality",
    items: [
      {
        id: "internetQuality",
        label: "How reliable is your internet access?",
        options: ["Excellent, always on", "Good, mostly reliable", "Patchy", "Very limited"],
      },
      {
        id: "transportation",
        label: "How easily can you travel to meet people or run errands?",
        options: ["Very easily", "With some planning", "Difficult", "Not able to travel much"],
      },
    ],
  },

  { kind: "thinking", afterSection: 3 },

  // ===== Section 4 — Your Risk =====
  {
    kind: "section-intro",
    section: 4,
    title: "Your Risk",
    body: "There's no wrong answer here — how you handle exposure and uncertainty shapes what kind of venture will actually feel right to run.",
  },
  {
    kind: "question-group",
    section: 4,
    title: "Your Work Style",
    items: [
      {
        id: "workLocation",
        label: "Remote or in person?",
        options: ["Remote", "In person", "A mix of both", "No strong preference"],
      },
      {
        id: "workType",
        label: "What kind of venture excites you most?",
        options: ["Making content", "Building a product", "Offering a service", "Not sure yet"],
      },
      {
        id: "soloOrTeam",
        label: "Building this alone or with others?",
        options: ["Solo", "With a small team", "With a co-founder", "Not sure yet"],
      },
    ],
  },
  {
    kind: "question-group",
    section: 4,
    title: "Working With People",
    items: [
      {
        id: "leadership",
        label: "How comfortable are you leading others?",
        options: ["Very comfortable", "Somewhat comfortable", "Prefer not to", "Untested"],
      },
      {
        id: "salesComfort",
        label: "How do you feel about selling or pitching?",
        options: ["I enjoy it", "I can do it if needed", "It makes me uneasy", "Never tried"],
      },
    ],
  },
  {
    kind: "question",
    id: "riskAppetite",
    section: 4,
    input: "spectrum",
    label: "How comfortable are you with uncertainty?",
    options: ["Very cautious", "Balanced", "Comfortable experimenting"],
  },

  // ===== Section 5 — Your Motivation =====
  {
    kind: "section-intro",
    section: 5,
    title: "Your Motivation",
    body: "This is the part most tools skip. There's no scoring here — we just want to understand what's actually driving you.",
  },
  {
    kind: "question",
    id: "biggestMotivation",
    section: 5,
    input: "multi-choice",
    label: "What would genuinely drive you to build this?",
    helper: "Pick everything that's true for you.",
    options: MOTIVATION_OPTIONS,
    allowSelectAll: true,
  },
  {
    kind: "question",
    id: "biggestMotivationOther",
    section: 5,
    input: "text",
    label: "What genuinely drives you to build this?",
    placeholder: "In a few words…",
    condition: (a) => (a.biggestMotivation ?? []).includes("Other"),
  },
  {
    kind: "question",
    id: "dailyFrustration",
    section: 5,
    input: "multi-choice",
    label: "Which problem areas resonate with you?",
    helper: "There's no wrong answer — pick whatever genuinely stands out.",
    options: PROBLEM_DOMAIN_OPTIONS,
    optional: true,
    allowSelectAll: true,
  },
  {
    kind: "question",
    id: "dailyFrustrationOther",
    section: 5,
    input: "text",
    label: "What specific problem bothers you?",
    placeholder: "In a few words…",
    optional: true,
    condition: (a) => (a.dailyFrustration ?? []).includes("Other"),
  },

  { kind: "thinking", afterSection: 5 },

  // ===== Section 6 — Your Reality =====
  {
    kind: "section-intro",
    section: 6,
    title: "Your Reality",
    body: "Real plans account for real limits. Nothing here disqualifies you — it just shows exactly how much room you have to maneuver.",
  },
  {
    kind: "question",
    id: "industryRestrictions",
    section: 6,
    input: "multi-choice",
    label: "Any industries or types of business you'd rather avoid?",
    options: [
      "Alcohol",
      "Tobacco",
      "Gambling",
      "Adult content",
      "Weapons / firearms",
      "Animal products / testing",
      "Religion or politics",
      "Other",
    ],
    optional: true,
    allowSelectAll: true,
  },
  {
    kind: "question",
    id: "industryRestrictionsOther",
    section: 6,
    input: "text",
    label: "What other industries or business types would you rather avoid?",
    optional: true,
    condition: (a) => (a.industryRestrictions ?? []).includes("Other"),
  },
  {
    kind: "question",
    id: "relocation",
    section: 6,
    input: "choice",
    label: "Could you relocate if a real opportunity required it?",
    options: ["Yes, easily", "Possibly, for the right reason", "Unlikely", "No"],
    optional: true,
    autoContinue: true,
  },
  {
    kind: "question",
    id: "otherConstraints",
    section: 6,
    input: "multi-choice",
    label: "Anything that shapes your realistic starting point?",
    helper: "Health, scheduling, family commitments — pick whatever applies.",
    options: CONSTRAINT_OPTIONS,
    optional: true,
    allowSelectAll: true,
  },
  {
    kind: "question",
    id: "otherConstraintsOther",
    section: 6,
    input: "text",
    label: "What else should Sol know?",
    placeholder: "In a few words…",
    optional: true,
    condition: (a) => (a.otherConstraints ?? []).includes("Other"),
  },

  // ===== Section 7 — Your Direction =====
  {
    kind: "section-intro",
    section: 7,
    title: "Your Direction",
    body: "What does success actually look like for you? Be honest — there's no prize for the most ambitious answer. This is where everything starts converging.",
  },
  {
    kind: "question",
    id: "willingToLeaveJob",
    section: 7,
    input: "choice",
    label: "Would you consider leaving your job for this, if it worked out?",
    options: [
      "Yes, if it replaced my income",
      "Possibly, eventually",
      "No, this is deliberately a side project",
      "Not sure yet",
    ],
    condition: isEmployee,
    autoContinue: true,
  },
  {
    kind: "question",
    id: "goals",
    section: 7,
    input: "multi-choice",
    label: "What are you hoping this leads to?",
    options: ["Pocket money", "Learning entrepreneurship", "A future startup", "Social impact"],
    condition: isStudent,
    allowSelectAll: true,
  },
  {
    kind: "question",
    id: "goals",
    section: 7,
    input: "multi-choice",
    label: "What are you hoping this leads to?",
    options: [
      "Replacing my salary",
      "A second income stream",
      "Eventually quitting my job",
      "Scaling an existing venture",
    ],
    condition: isWorking,
    allowSelectAll: true,
  },
  {
    kind: "question",
    id: "goals",
    section: 7,
    input: "multi-choice",
    label: "What are you hoping this leads to?",
    options: ["A steady income", "Learning entrepreneurship", "A future startup", "Social impact"],
    condition: (a) => !isStudent(a) && !isWorking(a),
    allowSelectAll: true,
  },
  {
    kind: "question",
    id: "monthlyIncomeGoal",
    section: 7,
    input: "select",
    label: "What monthly income would feel like a real win, a year from now?",
    options: [
      "Under ₹5,000",
      "₹5,000 – ₹20,000",
      "₹20,000 – ₹50,000",
      "₹50,000 – ₹1,50,000",
      "₹1,50,000+",
      "Not about income for me",
    ],
    optional: true,
  },
  {
    kind: "question",
    id: "timeline",
    section: 7,
    input: "choice",
    label: "What timeline feels realistic to you?",
    options: ["Within 3 months", "3–6 months", "6–12 months", "1–2 years", "No fixed timeline"],
    autoContinue: true,
  },

  { kind: "thinking", afterSection: 7 },
  { kind: "complete" },
];

/** Resolve the active step list for this user's path — conditional
 * steps whose `condition` fails (or whose duplicate id already matched
 * a prior condition) are filtered out entirely. A question-group keeps
 * only the items whose own condition passes, and is dropped entirely if
 * that leaves it with nothing to ask. */
export function resolveSteps(answers: OnboardingAnswers): Step[] {
  const seenGoalStep = new Set<number>();
  const seenStateStep = new Set<number>();
  const resolved: Step[] = [];

  STEPS.forEach((step, index) => {
    if (step.kind === "question-group") {
      const items = step.items.filter((item) => !item.condition || item.condition(answers));
      if (items.length === 0) return;
      resolved.push({ ...step, items });
      return;
    }
    if (step.kind !== "question") {
      resolved.push(step);
      return;
    }
    if (step.condition && !step.condition(answers)) return;
    // The three "goals" variants share an id — only one can be active at a time.
    if (step.id === "goals") {
      if (seenGoalStep.size > 0) return;
      seenGoalStep.add(index);
    }
    // The two "state" variants (India dropdown vs. free-text region) share an id.
    if (step.id === "state") {
      if (seenStateStep.size > 0) return;
      seenStateStep.add(index);
    }
    resolved.push(step);
  });

  return resolved;
}
