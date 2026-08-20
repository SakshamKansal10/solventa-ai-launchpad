import { normalizeProfile } from "@/lib/profile/normalize";
import { computeFitScore, getConstraintWarnings } from "@/lib/profile/scoring";
import { generateIntelligencePackage } from "@/lib/ai/prompts/intelligence-package";

const PROFILE_A: Record<string, unknown> = {
  age: "17",
  currentStatus: "School Student",
  timeAvailableWeekly: "Under 5 hrs",
  investmentBudget: "₹0 — I have no capital right now",
  skills: [{ name: "Writing", level: "beginner" }],
  riskAppetite: "Very cautious",
  workLocation: "Remote",
  biggestMotivation: "I want to help other students learn things school doesn't teach well.",
  goals: ["Learning entrepreneurship"],
};

const PROFILE_B: Record<string, unknown> = {
  age: "35",
  currentStatus: "Business Owner",
  timeAvailableWeekly: "Full-time",
  investmentBudget: "More than ₹2,00,000",
  preciseCapital: "10 lakh",
  skills: [
    { name: "Sales", level: "professional" },
    { name: "Project Management", level: "advanced" },
  ],
  riskAppetite: "Comfortable experimenting",
  workLocation: "A mix of both",
  leadership: "Very comfortable",
  salesComfort: "I enjoy it",
  biggestMotivation: "I want to build a new revenue line separate from my existing business.",
  goals: ["Scaling an existing venture"],
};

async function runOne(label: string, answersRaw: Record<string, unknown>) {
  const t0 = Date.now();
  const answers = answersRaw as Parameters<typeof normalizeProfile>[0];
  const profile = normalizeProfile(answers);
  const pkg = await generateIntelligencePackage(profile);
  const ms = Date.now() - t0;

  console.log(`\n=== ${label} (ONE Gemini call, ${ms}ms) ===`);
  console.log("Founder narrativeSummary:", pkg.founderDNA.narrativeSummary);
  console.log("Strategic signals:", pkg.founderDNA.strategicSignals);

  const scored = pkg.opportunities
    .map((o) => ({ opp: o, score: computeFitScore(profile, o.fitSignals) }))
    .sort((a, b) => b.score.total - a.score.total);

  scored.forEach((s, i) => {
    const warnings = getConstraintWarnings(profile, s.opp.fitSignals);
    console.log(
      `  #${i + 1} [${s.score.total}/100] ${s.opp.title} — ${s.opp.category} — ${s.opp.roadmap.phases.length} phases, ${s.opp.roadmap.phases.reduce((n, p) => n + p.tasks.length, 0)} tasks${warnings.length ? ` — WARNING: ${warnings[0]}` : ""}`,
    );
  });

  const top = scored[0];
  console.log("  Top pick difficulty:", top.opp.difficulty);
  console.log("  Top pick first roadmap task:", top.opp.roadmap.phases[0]?.tasks[0]?.what);
  console.log("  Top pick first experiment:", top.opp.firstExperiment);

  return { profile, top };
}

async function main() {
  const a = await runOne("PROFILE A — 17yo cautious student", PROFILE_A);
  const b = await runOne("PROFILE B — 35yo experienced owner", PROFILE_B);

  console.log("\n=== PERSONALIZATION CHECK ===");
  console.log("Top A:", a.top.opp.title, a.top.score.total);
  console.log("Top B:", b.top.opp.title, b.top.score.total);
  const sameTitle = a.top.opp.title === b.top.opp.title;
  const sameScore = a.top.score.total === b.top.score.total;
  console.log(
    sameTitle || sameScore ? "RESULT: FAIL (too similar)" : "RESULT: PASS (materially different)",
  );
}

main().catch((err) => {
  console.error("VERIFY SCRIPT FAILED:", err);
  process.exit(1);
});
