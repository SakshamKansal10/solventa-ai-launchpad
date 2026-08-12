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
 * there is no backend to enforce required fields against. */
export interface OnboardingAnswers {
  // Section 1 — Getting to Know You
  age?: string;
  country?: string;
  state?: string;
  city?: string;
  education?: string;
  currentStatus?: CurrentStatus;
  languages?: string[];

  currentGrade?: string;
  subjects?: string[];
  futureCareerInterests?: string;

  degree?: string;
  major?: string;
  graduationYear?: string;
  internships?: string;

  jobTitle?: string;
  industry?: string;
  yearsExperience?: string;
  annualIncome?: string;
  investmentCapacity?: string;

  timeAvailableWeekly?: string;

  // Section 2 — Your Starting Point
  investmentBudget?: string;
  /** Only asked when investmentBudget is the open-ended top bracket —
   * stores the exact rupee figure (not a re-bucketed range), e.g. 2500000. */
  preciseCapital?: string;
  assets?: string[];
  internetQuality?: string;
  transportation?: string;
  familySupport?: string;

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
  constraintTransport?: string;
  healthLimitations?: string;
  otherConstraints?: string;

  // Section 7 — Founder Mindset
  biggestFear?: string;
  whyNotStarted?: string;
  biggestMotivation?: string;
  dailyFrustration?: string;
  mentorshipVision?: string;
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

export const SKILL_LIBRARY = [
  "Writing",
  "Public Speaking",
  "Graphic Design",
  "Video Editing",
  "Photography",
  "Social Media",
  "Sales",
  "Negotiation",
  "Customer Service",
  "Teaching / Tutoring",
  "Coding",
  "Web Development",
  "App Development",
  "Data Analysis",
  "Excel / Spreadsheets",
  "Accounting",
  "Bookkeeping",
  "Cooking / Baking",
  "Fashion & Styling",
  "Event Planning",
  "Music Production",
  "Singing",
  "Illustration",
  "Copywriting",
  "SEO",
  "Digital Marketing",
  "Project Management",
  "Leadership",
  "Research",
  "Translation",
  "Handicrafts",
  "Agriculture",
  "Carpentry",
  "Electrical Work",
  "Tailoring",
  "Driving",
  "Sports Coaching",
];

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

export const INDIAN_STATES = [
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
  // Union Territories
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

/** ISO-ish common-name list, India first since it's the primary market —
 * used by the searchable country selector. */
export const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Canada",
  "Australia",
  "Singapore",
  "Germany",
  "France",
  "Netherlands",
  "Ireland",
  "New Zealand",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Nepal",
  "Bangladesh",
  "Sri Lanka",
  "Pakistan",
  "Afghanistan",
  "Bhutan",
  "Myanmar",
  "China",
  "Japan",
  "South Korea",
  "Indonesia",
  "Malaysia",
  "Thailand",
  "Vietnam",
  "Philippines",
  "Hong Kong",
  "Taiwan",
  "Israel",
  "Turkey",
  "Egypt",
  "South Africa",
  "Nigeria",
  "Kenya",
  "Ghana",
  "Brazil",
  "Mexico",
  "Argentina",
  "Chile",
  "Colombia",
  "Peru",
  "Spain",
  "Italy",
  "Portugal",
  "Switzerland",
  "Austria",
  "Belgium",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Poland",
  "Russia",
  "Ukraine",
  "Greece",
  "Czech Republic",
  "Romania",
  "Other",
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
