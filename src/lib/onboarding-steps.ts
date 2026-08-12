import type { OnboardingAnswers } from "./onboarding-types";
import {
  COUNTRIES,
  INCOME_BRACKETS,
  INDIAN_STATES,
  INVESTMENT_BRACKETS,
  STATUS_OPTIONS,
  WEEKLY_HOURS,
} from "./onboarding-types";

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
  | "textarea";

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

export type Step = QuestionStep | SectionIntroStep | ThinkingStep | StaticStep;

const isStudent = (a: OnboardingAnswers) =>
  a.currentStatus === "School Student" || a.currentStatus === "College Student";

const isProfessional = (a: OnboardingAnswers) =>
  a.currentStatus === "Working Professional" ||
  a.currentStatus === "Business Owner" ||
  a.currentStatus === "Freelancer";

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
    options: COUNTRIES,
  },
  {
    kind: "question",
    id: "state",
    section: 1,
    input: "searchable-select",
    label: "Which state are you based in?",
    options: INDIAN_STATES,
    condition: (a) => a.country === "India",
  },
  {
    kind: "question",
    id: "state",
    section: 1,
    input: "text",
    label: "Which state, province, or region?",
    placeholder: "e.g. California",
    condition: (a) => a.country !== undefined && a.country !== "India",
  },
  {
    kind: "question",
    id: "city",
    section: 1,
    input: "text",
    label: "Which city or town?",
    placeholder: "e.g. Pune",
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
    id: "currentStatus",
    section: 1,
    input: "choice",
    label: "Which of these best describes where you are right now?",
    options: STATUS_OPTIONS,
  },
  {
    kind: "question",
    id: "languages",
    section: 1,
    input: "searchable-multi",
    label: "Which languages are you comfortable working in?",
    helper: "Search, select, or add your own.",
  },

  // School student branch
  {
    kind: "question",
    id: "currentGrade",
    section: 1,
    input: "select",
    label: "What grade are you currently in?",
    options: ["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    condition: (a) => a.currentStatus === "School Student",
  },
  {
    kind: "question",
    id: "subjects",
    section: 1,
    input: "multi-choice",
    label: "Which subjects are you studying?",
    options: ["Science", "Commerce", "Arts / Humanities", "Vocational", "Other"],
    condition: (a) => a.currentStatus === "School Student",
  },
  {
    kind: "question",
    id: "futureCareerInterests",
    section: 1,
    input: "textarea",
    label: "Any career paths you're curious about?",
    optional: true,
    condition: (a) => a.currentStatus === "School Student",
  },

  // College student branch
  {
    kind: "question",
    id: "degree",
    section: 1,
    input: "text",
    label: "What degree are you pursuing?",
    placeholder: "e.g. B.Tech, B.Com, BA",
    condition: (a) => a.currentStatus === "College Student",
  },
  {
    kind: "question",
    id: "major",
    section: 1,
    input: "text",
    label: "What's your major or specialization?",
    condition: (a) => a.currentStatus === "College Student",
  },
  {
    kind: "question",
    id: "graduationYear",
    section: 1,
    input: "text",
    label: "What year do you expect to graduate?",
    placeholder: "e.g. 2027",
    condition: (a) => a.currentStatus === "College Student",
  },
  {
    kind: "question",
    id: "internships",
    section: 1,
    input: "textarea",
    label: "Any internships or work experience so far?",
    optional: true,
    condition: (a) => a.currentStatus === "College Student",
  },

  // Working professional / business owner / freelancer branch
  {
    kind: "question",
    id: "jobTitle",
    section: 1,
    input: "text",
    label: "What's your current job title or business focus?",
    condition: isProfessional,
  },
  {
    kind: "question",
    id: "industry",
    section: 1,
    input: "text",
    label: "What industry are you in?",
    condition: isProfessional,
  },
  {
    kind: "question",
    id: "yearsExperience",
    section: 1,
    input: "select",
    label: "How many years of experience do you have?",
    options: ["Under 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"],
    condition: (a) => a.currentStatus === "Working Professional",
  },
  {
    kind: "question",
    id: "annualIncome",
    section: 1,
    input: "select",
    label: "What's your approximate annual income?",
    options: INCOME_BRACKETS,
    condition: (a) =>
      a.currentStatus === "Working Professional" || a.currentStatus === "Business Owner",
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
  },
  {
    kind: "question",
    id: "hasEarnedFromSkill",
    section: 2,
    input: "choice",
    label: "Have you ever earned money using one of these skills?",
    options: ["Yes, regularly", "Yes, occasionally", "Not yet"],
    optional: true,
    autoContinue: true,
    condition: isProfessional,
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
  },
  {
    kind: "question",
    id: "internetQuality",
    section: 3,
    input: "choice",
    label: "How reliable is your internet access?",
    options: ["Excellent, always on", "Good, mostly reliable", "Patchy", "Very limited"],
    autoContinue: true,
  },
  {
    kind: "question",
    id: "transportation",
    section: 3,
    input: "choice",
    label: "How easily can you travel to meet people or run errands?",
    options: ["Very easily", "With some planning", "Difficult", "Not able to travel much"],
    autoContinue: true,
  },
  {
    kind: "question",
    id: "familySupport",
    section: 3,
    input: "choice",
    label: "How supportive is your family of you starting something?",
    options: ["Very supportive", "Cautiously supportive", "Neutral", "Not supportive yet"],
    optional: true,
    autoContinue: true,
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
    kind: "question",
    id: "workLocation",
    section: 4,
    input: "choice",
    label: "Would you rather work remotely or in person?",
    options: ["Remote", "In person", "A mix of both", "No strong preference"],
    autoContinue: true,
  },
  {
    kind: "question",
    id: "workType",
    section: 4,
    input: "choice",
    label: "What kind of venture excites you most?",
    options: ["Making content", "Building a product", "Offering a service", "Not sure yet"],
    autoContinue: true,
  },
  {
    kind: "question",
    id: "leadership",
    section: 4,
    input: "choice",
    label: "How comfortable are you leading others?",
    options: ["Very comfortable", "Somewhat comfortable", "Prefer not to", "Untested"],
    autoContinue: true,
  },
  {
    kind: "question",
    id: "salesComfort",
    section: 4,
    input: "choice",
    label: "How do you feel about selling or pitching?",
    options: ["I enjoy it", "I can do it if needed", "It makes me uneasy", "Never tried"],
    autoContinue: true,
  },
  {
    kind: "question",
    id: "riskAppetite",
    section: 4,
    input: "spectrum",
    label: "How comfortable are you with uncertainty?",
    options: ["Very cautious", "Balanced", "Comfortable experimenting"],
  },
  {
    kind: "question",
    id: "soloOrTeam",
    section: 4,
    input: "choice",
    label: "Do you see yourself building this alone or with others?",
    options: ["Solo", "With a small team", "With a co-founder", "Not sure yet"],
    autoContinue: true,
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
    input: "textarea",
    label: "What would you love to build, improve, or change if you had the right opportunity?",
    helper: "There are no wrong answers. Tell Sol what genuinely matters to you.",
  },
  {
    kind: "question",
    id: "dailyFrustration",
    section: 5,
    input: "textarea",
    label: "What real-life problem frustrates you every day?",
    optional: true,
  },
  {
    kind: "question",
    id: "biggestFear",
    section: 5,
    input: "textarea",
    label: "What's your biggest fear about starting something?",
    optional: true,
  },
  {
    kind: "question",
    id: "whyNotStarted",
    section: 5,
    input: "textarea",
    label: "What's stopped you from starting until now?",
    optional: true,
  },
  {
    kind: "question",
    id: "mentorshipVision",
    section: 5,
    input: "textarea",
    label: "If someone mentored you for one year, what would you build?",
    optional: true,
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
    input: "textarea",
    label: "Any industries or types of business you'd rather avoid?",
    optional: true,
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
    id: "healthLimitations",
    section: 6,
    input: "textarea",
    label: "Any health or physical limitations we should factor in?",
    optional: true,
  },
  {
    kind: "question",
    id: "otherConstraints",
    section: 6,
    input: "textarea",
    label: "Anything else that would help us plan around your reality?",
    optional: true,
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
    id: "goals",
    section: 7,
    input: "multi-choice",
    label: "What are you hoping this leads to?",
    options: ["Pocket money", "Learning entrepreneurship", "A future startup", "Social impact"],
    condition: isStudent,
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
    condition: isProfessional,
  },
  {
    kind: "question",
    id: "goals",
    section: 7,
    input: "multi-choice",
    label: "What are you hoping this leads to?",
    options: ["A steady income", "Learning entrepreneurship", "A future startup", "Social impact"],
    condition: (a) => !isStudent(a) && !isProfessional(a),
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
 * a prior condition) are filtered out entirely. */
export function resolveSteps(answers: OnboardingAnswers): Step[] {
  const seenGoalStep = new Set<number>();
  const seenStateStep = new Set<number>();
  return STEPS.filter((step, index) => {
    if (step.kind !== "question") return true;
    if (step.condition && !step.condition(answers)) return false;
    // The three "goals" variants share an id — only one can be active at a time.
    if (step.id === "goals") {
      if (seenGoalStep.size > 0) return false;
      seenGoalStep.add(index);
    }
    // The two "state" variants (India dropdown vs. free-text region) share an id.
    if (step.id === "state") {
      if (seenStateStep.size > 0) return false;
      seenStateStep.add(index);
    }
    return true;
  });
}
