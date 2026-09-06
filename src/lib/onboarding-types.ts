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

export type SkillLevel = "never_tried" | "beginner" | "comfortable" | "advanced";

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
  /** Only asked when education === "Other" — without this, picking "Other"
   * left the founder's education completely unelaborated to Sol. */
  educationOther?: string;
  currentStatus?: CurrentStatus;
  /** Only asked when currentStatus === "Other" — same reasoning. */
  currentStatusOther?: string;
  languages?: string[];

  major?: string;

  industry?: string;
  yearsExperience?: string;
  /** Asked for Working Professional, Business Owner, and Freelancer — it's
   * a distinct signal from investmentBudget (income vs. investable
   * capital aren't the same thing), and directly useful for judging
   * realistic side-income goals against their existing earnings. */
  annualIncome?: string;
  /** Employee branch only — distinguishes "this must eventually replace my
   * job" from "this is deliberately just a side project," which changes
   * how aggressively a roadmap should push toward full-time income. */
  willingToLeaveJob?: string;
  /** Business Owner / Freelancer branch only — an existing business's real
   * revenue is a different signal than personal annualIncome and directly
   * shapes whether a recommendation should extend the current business or
   * start something adjacent. */
  currentBusinessRevenue?: string;
  /** Business Owner / Freelancer branch only. */
  currentBusinessCustomers?: string;

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
  /** Only asked when industryRestrictions includes "Other" — the chip set
   * covers common cases but can't enumerate everything. */
  industryRestrictionsOther?: string;
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
  { value: "never_tried", label: "Never tried" },
  { value: "beginner", label: "Beginner" },
  { value: "comfortable", label: "Comfortable" },
  { value: "advanced", label: "Advanced" },
];

/** ~25 categories deliberately covering far more than a "startup skills"
 * list — so a founder whose real strength is a trade, a craft, or a
 * caregiving skill never feels like "my field isn't even here." Every
 * skill from the original 5-category list is preserved, just relocated
 * to its best-fit new home (no skill was dropped in this expansion). */
export const SKILL_CATEGORIES: { label: string; skills: string[] }[] = [
  {
    label: "Technology",
    skills: [
      "Coding",
      "Web Development",
      "App Development",
      "IT Support / Troubleshooting",
      "Cybersecurity Basics",
      "Cloud Computing Basics",
    ],
  },
  {
    label: "AI and Automation",
    skills: [
      "Using AI Tools (ChatGPT, Gemini, etc.)",
      "Prompt Engineering",
      "No-Code / Low-Code Tools",
      "Workflow Automation",
      "Basic Machine Learning",
    ],
  },
  {
    label: "Data and Analytics",
    skills: [
      "Data Analysis",
      "Excel / Spreadsheets",
      "Data Visualization",
      "Research",
      "Market Research",
      "Statistics Basics",
    ],
  },
  {
    label: "Design",
    skills: [
      "Graphic Design",
      "UI/UX Design",
      "Illustration",
      "Photography",
      "Video Editing",
      "3D Design / Animation",
    ],
  },
  {
    label: "Content and Media",
    skills: [
      "Writing",
      "Copywriting",
      "Content Creation",
      "Video Production",
      "Podcasting",
      "Social Media Content",
    ],
  },
  {
    label: "Business",
    skills: [
      "Business Planning",
      "Project Management",
      "Negotiation",
      "Strategic Planning",
      "Operations Management",
    ],
  },
  {
    label: "Marketing",
    skills: [
      "Digital Marketing",
      "SEO",
      "Social Media Marketing",
      "Email Marketing",
      "Branding",
      "Advertising",
    ],
  },
  {
    label: "Sales",
    skills: ["Sales", "Cold Outreach", "Customer Relationship Management", "Pitching & Closing"],
  },
  {
    label: "Finance",
    skills: [
      "Accounting",
      "Bookkeeping",
      "Personal Finance",
      "Investing Basics",
      "Budgeting",
      "Financial Modeling",
    ],
  },
  {
    label: "Operations",
    skills: [
      "Inventory Management",
      "Supply Chain Basics",
      "Process Improvement",
      "Logistics",
      "Vendor Management",
    ],
  },
  {
    label: "Education",
    skills: ["Teaching / Tutoring", "Curriculum Design", "Mentoring", "Course Creation"],
  },
  {
    label: "Communication",
    skills: [
      "Public Speaking",
      "Translation",
      "Interpersonal Communication",
      "Presentation Skills",
    ],
  },
  {
    label: "Leadership",
    skills: ["Leadership", "Team Management", "Delegation", "Conflict Resolution"],
  },
  {
    label: "Local Services",
    skills: ["Driving", "Home Repair", "Cleaning Services", "Delivery / Courier", "Pet Care"],
  },
  {
    label: "Creative Arts",
    skills: [
      "Music Production",
      "Singing",
      "Fashion & Styling",
      "Handicrafts",
      "Tailoring",
      "Painting / Fine Art",
      "Acting / Performance",
    ],
  },
  {
    label: "Personal Services",
    skills: ["Event Planning", "Life Coaching", "Styling & Grooming", "Personal Assistance"],
  },
  {
    label: "Commerce",
    skills: [
      "E-commerce Management",
      "Retail Sales",
      "Merchandising",
      "Dropshipping",
      "Product Sourcing",
    ],
  },
  {
    label: "Engineering",
    skills: [
      "Carpentry",
      "Electrical Work",
      "Mechanical Repair",
      "Plumbing",
      "CAD / Technical Drawing",
    ],
  },
  {
    label: "Healthcare-adjacent",
    skills: ["First Aid", "Elderly Care", "Childcare", "Nutrition Basics"],
  },
  {
    label: "Agriculture / Food",
    skills: ["Agriculture", "Cooking / Baking", "Food Safety", "Urban Farming", "Catering"],
  },
  {
    label: "Hospitality",
    skills: [
      "Customer Service",
      "Hospitality Management",
      "Tour Guiding",
      "Housekeeping",
      "Event Hosting",
    ],
  },
  {
    label: "Legal / Admin Awareness",
    skills: [
      "Basic Contract Understanding",
      "Compliance Awareness",
      "Documentation & Filing",
      "Data Entry",
    ],
  },
  {
    label: "Social Impact",
    skills: [
      "Community Organizing",
      "Volunteer Coordination",
      "Fundraising",
      "Advocacy / Awareness Campaigns",
    ],
  },
  {
    label: "Sports / Fitness",
    skills: [
      "Sports Coaching",
      "Personal Training",
      "Fitness Instruction",
      "Refereeing / Officiating",
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
