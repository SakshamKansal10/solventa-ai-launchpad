import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

import { normalizeProfile } from "@/lib/profile/normalize";
import { computeFitScore } from "@/lib/profile/scoring";
import { createRoadmap } from "@/lib/actions/roadmap-persistence.server";
import { MODEL } from "@/lib/ai/gemini.server";
import {
  FIXTURE_INTELLIGENCE_PACKAGE,
  FIXTURE_PROFILE_ANSWERS,
} from "@/lib/ai/fixtures/intelligence-package.fixture";
import type { Database, Json } from "@/lib/supabase/types";

/**
 * DEV TOOL — run with `bun run scripts/seed-fixture.ts`.
 *
 * Seeds the isolated review-bypass account (REVIEW_USER_EMAIL in
 * .env.local) with the hand-written dev fixture (src/lib/ai/fixtures/
 * intelligence-package.fixture.ts) through the exact same persistence
 * logic completeConsultation uses — real Supabase writes, zero Gemini
 * calls. Use this to test the dashboard/roadmap/opportunity/Sol UI
 * against realistic data without spending quota. Sign into that account
 * through the normal Sign In dialog (real credentials, not
 * REVIEW_BYPASS_AUTH) to view the result in a browser.
 *
 * Never imported by application code — this only runs as a standalone
 * script.
 */
async function main() {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
  );
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: process.env.REVIEW_USER_EMAIL!,
    password: process.env.REVIEW_USER_PASSWORD!,
  });
  if (signInError || !signInData.user) throw new Error(`sign-in failed: ${signInError?.message}`);
  const userId = signInData.user.id;
  console.log(`Signed in as review account, user_id=${userId.slice(0, 8)}...`);

  const answers = FIXTURE_PROFILE_ANSWERS as Parameters<typeof normalizeProfile>[0];
  const profile = normalizeProfile(answers);
  const pkg = FIXTURE_INTELLIGENCE_PACKAGE;
  const profileHash = crypto.createHash("sha256").update(JSON.stringify(profile)).digest("hex");

  const { data: dnaRow, error: dnaError } = await supabase
    .from("business_dna")
    .insert({
      user_id: userId,
      onboarding_answers: answers as unknown as Json,
      normalized_signals: profile as unknown as Json,
      founder_analysis: pkg.founderDNA as unknown as Json,
      ai_model: `${MODEL} (DEV FIXTURE — not real AI output)`,
      profile_hash: profileHash,
      initial_ai_calls: 0,
      generation_duration_ms: 0,
      prompt_version: "dev-fixture",
    })
    .select("id")
    .single();
  if (dnaError || !dnaRow) throw new Error(`business_dna insert failed: ${dnaError?.message}`);
  console.log(`business_dna seeded: ${dnaRow.id}`);

  const scored = pkg.opportunities
    .map((opp) => ({ opp, score: computeFitScore(profile, opp.fitSignals) }))
    .sort((a, b) => b.score.total - a.score.total);

  for (let i = 0; i < scored.length; i++) {
    const { opp, score } = scored[i];
    const { data: oppRow, error: oppError } = await supabase
      .from("opportunities")
      .insert({
        user_id: userId,
        business_dna_id: dnaRow.id,
        title: opp.title,
        one_liner: opp.plainEnglishSummary,
        who_for: opp.customer,
        fit_score: score.total,
        score_breakdown: score as unknown as Json,
        candidate: opp as unknown as Json,
        status: "active",
        batch_number: 1,
        ai_model: `${MODEL} (DEV FIXTURE)`,
      })
      .select("id")
      .single();
    if (oppError || !oppRow) throw new Error(`opportunity insert failed: ${oppError?.message}`);

    const { error: detailError } = await supabase.from("opportunity_details").insert({
      opportunity_id: oppRow.id,
      user_id: userId,
      detail: opp as unknown as Json,
      ai_model: `${MODEL} (DEV FIXTURE)`,
    });
    if (detailError) throw new Error(`opportunity_details insert failed: ${detailError.message}`);

    const roadmapId = await createRoadmap(
      supabase,
      userId,
      oppRow.id,
      opp.roadmap,
      i === 0 ? "active" : "available",
    );
    console.log(
      `  #${i + 1} [${score.total}/100] "${opp.title}" -> opp=${oppRow.id.slice(0, 8)}... roadmap=${roadmapId.slice(0, 8)}... (${i === 0 ? "active" : "available"})`,
    );
  }

  console.log("\nSeed complete — sign into the review account in a browser to inspect it.");
}

main().catch((err) => {
  console.error("SEED FAILED:", err);
  process.exit(1);
});
