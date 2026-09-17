import { writeFileSync, mkdirSync } from "node:fs";
import { normalizeProfile } from "@/lib/profile/normalize";
import { computeFounderGenome } from "@/lib/profile/founder-genome";
import { computeAmbitionCalibration } from "@/lib/profile/ambition";
import { generateIntelligencePackage } from "@/lib/ai/prompts/intelligence-package";
import { generateRoadmapSkeleton, generateWeekDetail } from "@/lib/ai/prompts/roadmap-generation";
import type { OnboardingAnswers } from "@/lib/onboarding-types";

/**
 * DEV TOOL — run with `bun run scripts/test-ai-language-fresh.ts`.
 *
 * Fresh, live test that generation actually comes back in Hindi when
 * locale="hi" is passed, AND that every enum/number/boolean field stays
 * in its exact fixed English value (Zod validation on the way back is
 * itself the proof: if the model translated an enum, generateJSON would
 * throw). Spends real Gemini quota.
 */

const PROFILE: OnboardingAnswers = {
  age: "26",
  country: "India",
  state: "Maharashtra",
  city: "Pune",
  education: "Bachelor's Degree",
  currentStatus: "Working Professional",
  languages: ["English", "Hindi"],
  industry: "Technology / Software",
  yearsExperience: "3–5 years",
  annualIncome: "₹10–20L",
  willingToLeaveJob: "Possibly, eventually",
  timeAvailableWeekly: "10–20 hrs",
  investmentBudget: "₹50,000 – ₹2,00,000",
  assets: ["A laptop / computer", "A smartphone"],
  internetQuality: "Excellent, always on",
  transportation: "Very easily",
  skills: [
    { name: "Digital Marketing", level: "comfortable" },
    { name: "Content Creation", level: "advanced" },
  ],
  workLocation: "Remote",
  workType: "Offering a service",
  soloOrTeam: "Solo",
  leadership: "Somewhat comfortable",
  salesComfort: "I can do it if needed",
  riskAppetite: "Balanced",
  goals: ["A second income stream", "Eventually quitting my job"],
  monthlyIncomeGoal: "₹50,000 – ₹1,50,000",
  timeline: "6–12 months",
  industryRestrictions: [],
  relocation: "Unlikely",
  otherConstraints: [],
  biggestMotivation: ["Financial independence"],
  dailyFrustration: [],
};

async function main() {
  mkdirSync("scripts/_output", { recursive: true });

  const normalized = normalizeProfile(PROFILE);
  const genome = computeFounderGenome(normalized);
  const ambition = computeAmbitionCalibration(normalized, genome);

  console.log("=== Generating founder DNA + 3 opportunities in Hindi ===");
  const pkg = await generateIntelligencePackage(normalized, ambition, "hi");
  console.log("SUCCESS — Zod validation passed (enums/numbers were preserved correctly)");
  console.log(`founderDNA.narrativeSummary: ${pkg.founderDNA.narrativeSummary}`);
  console.log(`opportunity[0].title: ${pkg.opportunities[0].title}`);
  console.log(
    `opportunity[0].difficulty (must be exact English enum): ${pkg.opportunities[0].difficulty}`,
  );
  console.log(
    `opportunity[0].fitSignals.riskLevel (must be exact English enum): ${pkg.opportunities[0].fitSignals.riskLevel}`,
  );
  console.log(
    `opportunity[0].fitSignals.startupCapitalAmount (must be a number): ${pkg.opportunities[0].fitSignals.startupCapitalAmount}`,
  );

  const opportunity = pkg.opportunities[0];
  console.log("\n=== Generating roadmap skeleton in Hindi ===");
  const skeleton = await generateRoadmapSkeleton(normalized, opportunity, "hi");
  console.log("SUCCESS");
  console.log(`northStar: ${skeleton.northStar}`);
  console.log(`phase[0].key (must be exact English enum): ${skeleton.phases[0].key}`);
  console.log(`phase[0].title: ${skeleton.phases[0].title}`);

  console.log("\n=== Generating Week 1 detail in Hindi ===");
  const firstPhase = skeleton.phases[0];
  const firstWeek = firstPhase.weeks[0];
  const weekDetail = await generateWeekDetail(
    normalized,
    opportunity,
    {
      phaseTitle: firstPhase.title,
      phaseDescription: firstPhase.description,
      weekTitle: firstWeek.title,
      weekObjective: firstWeek.objective,
      weekNumber: firstWeek.weekNumber,
      priorWeek: null,
    },
    "hi",
  );
  console.log("SUCCESS");
  console.log(`mission: ${weekDetail.mission}`);
  console.log(`tasks[0].what: ${weekDetail.tasks[0].what}`);
  console.log(`tasks[0].required (must be a boolean): ${weekDetail.tasks[0].required}`);

  writeFileSync(
    "scripts/_output/ai-language-hi.json",
    JSON.stringify({ package: pkg, skeleton, weekDetail }, null, 2),
  );
  console.log("\nwritten to scripts/_output/ai-language-hi.json");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
