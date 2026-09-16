import { writeFileSync, mkdirSync } from "node:fs";
import { normalizeProfile } from "@/lib/profile/normalize";
import { computeFounderGenome } from "@/lib/profile/founder-genome";
import { computeAmbitionCalibration } from "@/lib/profile/ambition";
import { generateIntelligencePackage } from "@/lib/ai/prompts/intelligence-package";
import {
  getInvestmentBrackets,
  getAnnualIncomeBrackets,
  getMonthlyIncomeGoalBrackets,
} from "@/lib/country-currency";
import type { OnboardingAnswers } from "@/lib/onboarding-types";

// Bracket LABELS must exactly match what normalizeProfile's bracketValue()
// looks up (getInvestmentBrackets/getAnnualIncomeBrackets/
// getMonthlyIncomeGoalBrackets) — computed here at runtime rather than
// hand-typed, so a mismatched string can never silently zero out a
// profile's capital/income signal.
const USD_INVESTMENT = getInvestmentBrackets("USD");
const USD_ANNUAL_INCOME = getAnnualIncomeBrackets("USD");
const USD_MONTHLY_GOAL = getMonthlyIncomeGoalBrackets("USD");

/**
 * DEV TOOL — run with `bun run scripts/test-master-prompt-fresh.ts`.
 *
 * Fresh, live, end-to-end production-path test of the rewritten Solventia
 * Intelligence prompt: real OnboardingAnswers -> normalizeProfile ->
 * computeFounderGenome -> computeAmbitionCalibration ->
 * generateIntelligencePackage, exactly the same call order
 * completeConsultation uses in production. Spends real Gemini quota. Output
 * is written to scripts/_output/ as JSON for manual QA review — never
 * printed as chain-of-thought (the API only ever returns final structured
 * output, nothing else exists to leak).
 */

const PROFILE_A_HIGH_POTENTIAL_TECHNICAL: OnboardingAnswers = {
  age: "27",
  country: "India",
  state: "Karnataka",
  city: "Bengaluru",
  education: "Master's Degree",
  currentStatus: "Working Professional",
  languages: ["English", "Hindi"],
  industry: "Technology / Software",
  yearsExperience: "5–10 years",
  annualIncome: "₹20–50L",
  willingToLeaveJob: "Yes, if it replaced my income",
  timeAvailableWeekly: "10–20 hrs",
  investmentBudget: "More than ₹2,00,000",
  preciseCapital: "1500000",
  assets: ["A laptop / computer", "A smartphone", "A workspace at home"],
  internetQuality: "Excellent, always on",
  transportation: "Very easily",
  skills: [
    { name: "Coding", level: "advanced" },
    { name: "Web Development", level: "advanced" },
    { name: "Cloud Computing Basics", level: "comfortable" },
    { name: "Data Analysis", level: "comfortable" },
    { name: "Business Planning", level: "beginner" },
  ],
  workLocation: "Remote",
  workType: "Building a product",
  soloOrTeam: "With a co-founder",
  leadership: "Somewhat comfortable",
  salesComfort: "I can do it if needed",
  riskAppetite: "Comfortable experimenting",
  goals: ["A second income stream", "Eventually quitting my job"],
  monthlyIncomeGoal: "₹1,50,000+",
  timeline: "6–12 months",
  industryRestrictions: [],
  relocation: "Possibly, for the right reason",
  otherConstraints: [],
  biggestMotivation: ["Financial independence", "Proving I can build something from scratch"],
  dailyFrustration: [],
};

const PROFILE_B_EARLY_LOW_RESOURCE: OnboardingAnswers = {
  age: "20",
  country: "India",
  state: "Uttar Pradesh",
  city: "Lucknow",
  education: "Bachelor's Degree",
  currentStatus: "College Student",
  languages: ["English", "Hindi"],
  major: "Business / Commerce",
  timeAvailableWeekly: "10–20 hrs",
  investmentBudget: "Under ₹10,000",
  assets: ["A smartphone"],
  internetQuality: "Good, mostly reliable",
  transportation: "With some planning",
  skills: [
    { name: "Using AI Tools (ChatGPT, Gemini, etc.)", level: "beginner" },
    { name: "Social Media Content", level: "beginner" },
    { name: "Sales", level: "never_tried" },
  ],
  workLocation: "A mix of both",
  workType: "Not sure yet",
  soloOrTeam: "Solo",
  leadership: "Untested",
  salesComfort: "Never tried",
  riskAppetite: "Balanced",
  goals: ["Learning entrepreneurship", "A future startup"],
  monthlyIncomeGoal: "₹5,000 – ₹20,000",
  timeline: "1–2 years",
  industryRestrictions: [],
  relocation: "Unlikely",
  otherConstraints: [],
  biggestMotivation: ["Learning by building something real", "Financial independence"],
  dailyFrustration: [],
};

const PROFILE_C_ESTABLISHED_OWNER: OnboardingAnswers = {
  age: "44",
  country: "United States",
  state: "Texas",
  city: "Austin",
  education: "Bachelor's Degree",
  currentStatus: "Business Owner",
  languages: ["English"],
  industry: "Manufacturing",
  currentBusinessRevenue: USD_ANNUAL_INCOME[USD_ANNUAL_INCOME.length - 2].label, // second-highest bracket
  currentBusinessCustomers: ["Other businesses (B2B)", "Local businesses"],
  timeAvailableWeekly: "20+ hrs",
  investmentBudget: USD_INVESTMENT[USD_INVESTMENT.length - 1].label, // top (open-ended) bracket
  preciseCapital: "45000",
  assets: ["A laptop / computer", "A smartphone", "A vehicle", "A workspace at home"],
  internetQuality: "Excellent, always on",
  transportation: "Very easily",
  skills: [
    { name: "Business Planning", level: "advanced" },
    { name: "Operations Management", level: "advanced" },
    { name: "Negotiation", level: "advanced" },
    { name: "Sales", level: "advanced" },
  ],
  workLocation: "In person",
  workType: "Building a product",
  soloOrTeam: "With a small team",
  leadership: "Very comfortable",
  salesComfort: "I enjoy it",
  riskAppetite: "Comfortable experimenting",
  goals: ["Scaling an existing venture", "A second income stream"],
  monthlyIncomeGoal: USD_MONTHLY_GOAL[USD_MONTHLY_GOAL.length - 1].label, // top bracket
  timeline: "1–2 years",
  industryRestrictions: [],
  relocation: "Possibly, for the right reason",
  otherConstraints: [],
  biggestMotivation: [
    "Proving I can build something from scratch",
    "Building something people would pay for",
  ],
  dailyFrustration: [],
};

const PROFILES = [
  { key: "A_high_potential_technical", answers: PROFILE_A_HIGH_POTENTIAL_TECHNICAL },
  { key: "B_early_low_resource", answers: PROFILE_B_EARLY_LOW_RESOURCE },
  { key: "C_established_owner", answers: PROFILE_C_ESTABLISHED_OWNER },
] as const;

async function main() {
  mkdirSync("scripts/_output", { recursive: true });

  for (const { key, answers } of PROFILES) {
    console.log(`\n=== ${key} ===`);
    const normalized = normalizeProfile(answers);
    const genome = computeFounderGenome(normalized);
    const ambition = computeAmbitionCalibration(normalized, genome);
    console.log(
      `ambition band: ${ambition.band} (score ${ambition.score}) — ${ambition.reasonCodes.join(", ")}`,
    );

    const t0 = Date.now();
    const pkg = await generateIntelligencePackage(normalized, ambition);
    const elapsedMs = Date.now() - t0;
    console.log(`generated in ${elapsedMs}ms — ${pkg.opportunities.length} opportunities`);

    const output = { profileKey: key, normalized, genome, ambition, package: pkg };
    writeFileSync(`scripts/_output/${key}.json`, JSON.stringify(output, null, 2));
    console.log(`written to scripts/_output/${key}.json`);
  }
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
