import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import { runConsultation } from "@/lib/actions/profile";
import { latestJob, type GenerationJob } from "@/lib/actions/generation-jobs.server";
import type { ConsultationAnswers } from "@/lib/consultation/model";
import { isLegacyAnswers, legacyToV2 } from "@/lib/consultation/migrate";
import { applyFactPatch, cleanFactPatch } from "@/lib/profile/apply-facts";

/**
 * Ask Sol's "Find new directions" (owner, 2026-11-17, Job M), on the founder's tap only. The facts
 * Sol understood are applied to a NEW copy of the founder's latest answers — the old answers and
 * their directions stay exactly as they were (History, "Earlier directions") — and one generation
 * runs from it as the founder's only job (Job N's screen shows it). The new consultation becomes
 * the current one; an existing roadmap is never deleted or changed.
 */
export const findNewDirections = createServerFn({ method: "POST" })
  .validator(
    z.object({
      updateId: z.string().uuid(),
      locale: z.enum(["en", "hi"]).optional(),
      retryJobId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ job: GenerationJob | null }> => {
    const { supabase, user } = await requireUser();
    const db = supabase as unknown as SupabaseClient;
    const { data: update, error } = await db
      .from("profile_fact_updates")
      .select("id, patch, notes, applied_dna_id")
      .eq("id", data.updateId)
      .eq("user_id", user.id)
      .single();
    if (error || !update) throw new Error(error?.message ?? "Update not found");

    const { data: latest, error: dnaError } = await supabase
      .from("business_dna")
      .select("id, onboarding_answers")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (dnaError || !latest) throw new Error("Complete the consultation first.");
    const stored = latest.onboarding_answers as unknown;
    const answers: ConsultationAnswers = isLegacyAnswers(stored)
      ? legacyToV2(stored)
      : (stored as ConsultationAnswers);
    const patched = applyFactPatch(answers, {
      ...cleanFactPatch((update as { patch: unknown }).patch),
      notes: (update as { notes: string[] }).notes,
    });

    try {
      const result = await runConsultation(
        supabase,
        user,
        { answers: patched as Record<string, unknown>, locale: data.locale },
        "refresh",
        { retryJobId: data.retryJobId },
      );
      // Applied: which consultation the facts produced (history; the row itself is never deleted).
      await db
        .from("profile_fact_updates")
        .update({ applied_dna_id: result.businessDnaId, applied_at: new Date().toISOString() })
        .eq("id", data.updateId)
        .is("applied_at", null);
    } catch (err) {
      console.error("[ask-sol] find new directions failed:", err);
    }
    return { job: await latestJob(supabase, user.id) };
  });
