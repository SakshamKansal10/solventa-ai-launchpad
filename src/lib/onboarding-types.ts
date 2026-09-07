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
  /** Only asked when major === "Other" — MAJOR_OPTIONS covers the common
   * fields of study but can't enumerate every specialization. */
  majorOther?: string;
  /** The founder's actual institution name — either picked from a real
   * search result or typed manually (see institutionManual). Searched
   * within institutionCountry, which defaults to the founder's main
   * `country` but can differ (studying abroad). */
  institutionName?: string;
  institutionCountry?: string;
  /** True when no search result matched and the founder typed the name
   * themselves — never blocks completion just because an institution
   * isn't in the lookup dataset. */
  institutionManual?: boolean;

  industry?: string;
  /** Only asked when industry === "Other" — INDUSTRY_OPTIONS covers the
   * common cases but can't enumerate every field. */
  industryOther?: string;
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
  currentBusinessCustomers?: string[];

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
  /** Catch-all for health/physical/scheduling/anything-else limitations —
   * structured chips (CONSTRAINT_OPTIONS) instead of free typing; "Other"
   * elaborates via otherConstraintsOther. */
  otherConstraints?: string[];
  /** Only asked when otherConstraints includes "Other". */
  otherConstraintsOther?: string;

  // Section 7 — Founder Mindset
  /** Structured chips (MOTIVATION_OPTIONS) — a founder can genuinely be
   * driven by more than one of these at once, unlike a single free-text
   * answer that forced picking one framing. */
  biggestMotivation?: string[];
  /** Only asked when biggestMotivation includes "Other". */
  biggestMotivationOther?: string;
  /** Structured chips (PROBLEM_DOMAIN_OPTIONS). */
  dailyFrustration?: string[];
  /** Only asked when dailyFrustration includes "Other". */
  dailyFrustrationOther?: string;
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

/** Replaces a free-text "what industry are you in?" field — a founder
 * picks the closest fit here (or "Other" with a one-line follow-up)
 * instead of typing, matching the same "Other" fallback pattern already
 * used for education/currentStatus. */
export const INDUSTRY_OPTIONS = [
  "Technology / Software",
  "E-commerce / Retail",
  "Finance / Banking",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Real Estate / Construction",
  "Hospitality / Travel",
  "Media / Entertainment",
  "Marketing / Advertising",
  "Consulting",
  "Agriculture / Food",
  "Logistics / Transportation",
  "Government / Public Sector",
  "Non-profit / Social Impact",
  "Legal",
  "Other",
];

/** Replaces a free-text "what's your major?" field for the college-student
 * branch — same searchable-select + Other fallback pattern as country. */
export const MAJOR_OPTIONS = [
  "Computer Science / IT",
  "Engineering",
  "Business / Commerce",
  "Economics",
  "Finance / Accounting",
  "Marketing",
  "Design",
  "Architecture",
  "Medicine / Health Sciences",
  "Life Sciences / Biology",
  "Physics / Chemistry / Math",
  "Law",
  "Psychology",
  "Social Sciences",
  "Political Science / Public Policy",
  "Journalism / Mass Communication",
  "Literature / Languages",
  "Fine Arts / Performing Arts",
  "Education",
  "Agriculture",
  "Hospitality / Tourism",
  "Other",
];

/** Replaces a required free-text "what would you love to build?" question
 * — a founder can genuinely be driven by more than one of these at once,
 * so this is a multi-select rather than a forced single framing. */
export const MOTIVATION_OPTIONS = [
  "Solving a problem I've personally experienced",
  "Building something people would pay for",
  "Financial independence",
  "Learning by building something real",
  "Making an impact in my community",
  "Creative expression through a product or brand",
  "Proving I can build something from scratch",
  "Following an idea I've had for a while",
  "Other",
];

/** Replaces a free-text "what problem bothers you?" question. */
export const PROBLEM_DOMAIN_OPTIONS = [
  "Healthcare & wellbeing",
  "Education & learning",
  "Environment & sustainability",
  "Local commerce & small business",
  "Technology accessibility",
  "Financial inclusion",
  "Food & agriculture",
  "Transportation & logistics",
  "Housing & urban life",
  "Community & social connection",
  "Nothing specific comes to mind",
  "Other",
];

/** Replaces a free-text "anything else Sol should know?" catch-all. */
export const CONSTRAINT_OPTIONS = [
  "Health or medical considerations",
  "Caregiving or family commitments",
  "Fixed work/school schedule",
  "Limited mobility or travel",
  "Visa or work-authorization limits",
  "Language barrier in local market",
  "None of these",
  "Other",
];
