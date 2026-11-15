import { createServerFn } from "@tanstack/react-start";

import { parseAge, type ConsultationAnswers } from "@/lib/consultation/model";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import { requireUser } from "@/lib/supabase/server";

/**
 * Make it official (redesign-v2 part 4, feature 7): whether to show the under-18 note. True when
 * the latest consultation says the founder is a school student or under 18.
 */
export const getOfficialGuideProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ under18: boolean }> => {
    const { supabase, user } = await requireUser();
    const { data } = await supabase
      .from("business_dna")
      .select("onboarding_answers, normalized_signals")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return { under18: false };
    const answers = (data.onboarding_answers ?? {}) as ConsultationAnswers;
    const profile = data.normalized_signals as unknown as NormalizedProfile | null;
    const age = parseAge(answers.age) ?? profile?.identity.age ?? null;
    const schoolStudent =
      answers.status === "school_student" ||
      /school student/i.test(profile?.identity.currentStatus ?? "");
    return { under18: schoolStudent || (age !== null && age < 18) };
  },
);
