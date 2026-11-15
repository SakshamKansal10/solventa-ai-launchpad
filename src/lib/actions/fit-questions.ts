import { createServerFn } from "@tanstack/react-start";

import type { ConsultationAnswers } from "@/lib/consultation/model";
import {
  findContradictions,
  missingFitFields,
  type Contradiction,
  type GapField,
} from "@/lib/fit/gaps";
import type { FitFactors } from "@/lib/ai/schemas";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import { requireUser } from "@/lib/supabase/server";

export interface FitQuestionsDTO {
  /** The consultation the answers are saved to (always the latest). */
  consultationId: string;
  /** Empty answers that leave a fit factor "Not known yet" — two to four short questions. */
  missing: GapField[];
  /** Skills the directions of this consultation ask for: the founder ticks what they can do. */
  skillOptions: string[];
  /** For the money brackets' currency. */
  country: string | null;
  /** Answers that do not usually go together, for the founder to correct. */
  contradictions: Contradiction[];
}

/**
 * Directions → "Answer now" (redesign-v2 part 4, feature 5). Reads the latest consultation only:
 * the answers are saved onto it with updateFounderProfileAnswers, and the fit is recalculated from
 * them on the next read (assessFit runs on every load; nothing is stored).
 */
export const getFitQuestions = createServerFn({ method: "GET" }).handler(
  async (): Promise<FitQuestionsDTO | null> => {
    const { supabase, user } = await requireUser();
    const { data: dna, error } = await supabase
      .from("business_dna")
      .select("id, onboarding_answers, normalized_signals")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!dna) return null;
    const answers = (dna.onboarding_answers ?? {}) as ConsultationAnswers;
    const profile = dna.normalized_signals as unknown as NormalizedProfile | null;

    const { data: opps } = await supabase
      .from("opportunities")
      .select("candidate")
      .eq("user_id", user.id)
      .eq("business_dna_id", dna.id)
      .neq("status", "dismissed");
    const skillOptions = Array.from(
      new Set(
        (opps ?? []).flatMap((o) => {
          const signals = (o.candidate as { fitSignals?: FitFactors } | null)?.fitSignals;
          return (signals?.requiredSkills ?? []).map((s) => s.name.trim()).filter(Boolean);
        }),
      ),
    ).slice(0, 8);

    return {
      consultationId: dna.id as string,
      missing: profile ? missingFitFields(profile) : [],
      skillOptions,
      country: answers.country ?? null,
      contradictions: answers.v === 2 ? findContradictions(answers) : [],
    };
  },
);
