import { createHash, randomUUID } from "node:crypto";

import { flatIntelligencePackage } from "../../src/lib/ai/fixtures/e2e-gemini";
import { normalizeProfile } from "../../src/lib/profile/normalize";
import { computeFitScore } from "../../src/lib/profile/scoring";
import { sql } from "./stack";

/**
 * Database seeding that mirrors what a completed consultation persists
 * (business_dna, opportunities, opportunity_details), so tests can start from
 * "directions are ready" without clicking through 16 screens every time. The
 * golden-path spec still drives the real consultation UI end to end.
 */

/** The same answers walkConsultation() enters (a college student in Haryana). */
export const STUDENT_ANSWERS = {
  v: 2,
  age: "21",
  status: "college_student",
  country: "India",
  state: "Haryana",
  city: "Gurugram",
  education: "bachelors",
  major: "Computer science",
  studyYear: "y2",
  languages: ["English", "Hindi"],
  weeklyHours: "h10_20",
  skills: [{ name: "Coding", level: "working", usedInReal: false }],
  domains: ["software"],
  executionSignals: ["built_product"],
  capitalBracket: 5,
  access: ["laptop"],
  riskTolerance: "balanced",
  roles: ["building"],
  teamPreference: "open_cofounder",
  commitment: "solve_problem",
  interests: ["education"],
  relocation: "unlikely",
  constraints: ["none"],
  scale: "national",
  horizon: "y2_4",
  hope: "large_company",
} as const;

export interface SeededDirections {
  businessDnaId: string;
  /** Ids ordered as the app ranks them (strongest deterministic fit first). */
  opportunityIds: string[];
  titles: string[];
}

export async function seedDirections(
  userId: string,
  opts: { answers?: Record<string, unknown>; createdAt?: string; batch?: number } = {},
): Promise<SeededDirections> {
  const answers = opts.answers ?? STUDENT_ANSWERS;
  const normalized = normalizeProfile(answers as Parameters<typeof normalizeProfile>[0]);
  const pkg = flatIntelligencePackage();
  const hash = createHash("sha256")
    .update(JSON.stringify(answers) + randomUUID())
    .digest("hex");

  const dna = await sql<{ id: string }>(
    `insert into business_dna (user_id, onboarding_answers, normalized_signals, founder_analysis, ai_model, profile_hash, initial_ai_calls, prompt_version, created_at, updated_at)
     values ($1, $2::jsonb, $3::jsonb, $4::jsonb, 'e2e', $5, 1, 'intelligence-package-v1', coalesce($6::timestamptz, now()), coalesce($6::timestamptz, now()))
     returning id`,
    [
      userId,
      JSON.stringify(answers),
      JSON.stringify(normalized),
      JSON.stringify(pkg.founderDNA),
      hash,
      opts.createdAt ?? null,
    ],
  );
  const businessDnaId = dna[0].id;

  const scored = pkg.opportunities
    .map((opp, originalIndex) => ({
      opp,
      originalIndex,
      score: computeFitScore(normalized, opp.fitSignals),
    }))
    .sort((a, b) => b.score.total - a.score.total);

  const opportunityIds: string[] = [];
  for (const { opp, originalIndex, score } of scored) {
    const { opportunityIndex: _drop, ...candidate } = opp as typeof opp & {
      opportunityIndex: number;
    };
    void _drop;
    const row = await sql<{ id: string }>(
      `insert into opportunities (user_id, business_dna_id, title, one_liner, who_for, fit_score, score_breakdown, candidate, status, batch_number, ai_model, opportunity_index, created_at)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, 'active', $9, 'e2e', $10, coalesce($11::timestamptz, now()))
       returning id`,
      [
        userId,
        businessDnaId,
        opp.title,
        opp.plainEnglishSummary,
        opp.customer,
        score.total,
        JSON.stringify(score),
        JSON.stringify(candidate),
        opts.batch ?? 1,
        originalIndex,
        opts.createdAt ?? null,
      ],
    );
    await sql(
      `insert into opportunity_details (opportunity_id, user_id, detail, ai_model) values ($1, $2, $3::jsonb, 'e2e')`,
      [row[0].id, userId, JSON.stringify(candidate)],
    );
    opportunityIds.push(row[0].id);
  }
  return { businessDnaId, opportunityIds, titles: scored.map((s) => s.opp.title) };
}
