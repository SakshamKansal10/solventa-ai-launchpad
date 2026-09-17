import { readFileSync, writeFileSync } from "node:fs";
import { generateRoadmapSkeleton, generateWeekDetail } from "@/lib/ai/prompts/roadmap-generation";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import type { OpportunityPackage } from "@/lib/ai/schemas";

/**
 * DEV TOOL — run with `bun run scripts/test-roadmap-skeleton-fresh.ts`.
 *
 * Fresh, live test of the deferred-roadmap generation path
 * (generateRoadmapSkeleton -> generateWeekDetail for Week 1) using a real
 * opportunity from test-master-prompt-fresh.ts's output — the exact same
 * two calls buildRoadmapForOpportunity makes. Spends real Gemini quota.
 * Run test-master-prompt-fresh.ts first so scripts/_output/*.json exists.
 */

const PROFILE_KEY = process.argv[2] ?? "A_high_potential_technical";

async function main() {
  const raw = JSON.parse(readFileSync(`scripts/_output/${PROFILE_KEY}.json`, "utf8"));
  const profile = raw.normalized as NormalizedProfile;
  const opportunity = raw.package.opportunities[0] as OpportunityPackage;

  console.log(`Using opportunity: "${opportunity.title}" from ${PROFILE_KEY}`);

  const skeleton = await generateRoadmapSkeleton(profile, opportunity);
  console.log(`\nnorthStar: ${skeleton.northStar}`);
  console.log(`phases: ${skeleton.phases.length}`);
  let totalWeeks = 0;
  for (const phase of skeleton.phases) {
    totalWeeks += phase.weeks.length;
    console.log(`  [${phase.key}] ${phase.title} — ${phase.weeks.length} weeks`);
  }
  console.log(
    `total weeks across roadmap: ${totalWeeks} (~${(totalWeeks / 4.33).toFixed(1)} months)`,
  );

  const firstPhase = skeleton.phases[0];
  const firstWeek = firstPhase.weeks[0];
  console.log(`\nGenerating Week 1 detail: "${firstWeek.title}"...`);
  const weekDetail = await generateWeekDetail(profile, opportunity, {
    phaseTitle: firstPhase.title,
    phaseDescription: firstPhase.description,
    weekTitle: firstWeek.title,
    weekObjective: firstWeek.objective,
    weekNumber: firstWeek.weekNumber,
    priorWeek: null,
  });

  console.log(`mission: ${weekDetail.mission}`);
  console.log(`tasks: ${weekDetail.tasks.length}`);
  for (const t of weekDetail.tasks) console.log(`  - ${t.what}`);
  console.log(`mistakesToAvoid: ${JSON.stringify(weekDetail.mistakesToAvoid)}`);
  console.log(`evidenceRequired: ${weekDetail.evidenceRequired}`);
  console.log(`successThreshold: ${weekDetail.successThreshold}`);

  writeFileSync(
    `scripts/_output/roadmap-${PROFILE_KEY}.json`,
    JSON.stringify({ skeleton, week1Detail: weekDetail }, null, 2),
  );
  console.log(`\nwritten to scripts/_output/roadmap-${PROFILE_KEY}.json`);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
