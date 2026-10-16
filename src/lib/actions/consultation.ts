import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getOptionalUser } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

/** Server-side consultation autosave for SIGNED-IN founders (signed-out
 * visitors autosave to localStorage only). One row per user. Every function
 * here degrades to "no server draft" if migration 0010 hasn't been applied —
 * the local copy always exists, so autosave never blocks or errors the flow. */

const draftSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  screenKey: z.string().max(64).nullable(),
  stage: z.number().int().min(1).max(7).nullable(),
  locale: z.enum(["en", "hi"]).optional(),
});

export interface ConsultationDraftDTO {
  answers: Json;
  screenKey: string | null;
  stage: number | null;
  updatedAt: string;
}

export const getConsultationDraft = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConsultationDraftDTO | null> => {
    const { supabase, user } = await getOptionalUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("consultation_drafts")
      .select("answers, screen_key, stage, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[consultation] draft read failed (non-fatal):", error.message);
      return null;
    }
    if (!data) return null;
    return {
      answers: data.answers ?? {},
      screenKey: data.screen_key,
      stage: data.stage,
      updatedAt: data.updated_at,
    };
  },
);

export const saveConsultationDraft = createServerFn({ method: "POST" })
  .validator(draftSchema)
  .handler(async ({ data }): Promise<{ saved: boolean }> => {
    const { supabase, user } = await getOptionalUser();
    if (!user) return { saved: false };
    const { error } = await supabase.from("consultation_drafts").upsert(
      {
        user_id: user.id,
        answers: data.answers as unknown as Json,
        screen_key: data.screenKey,
        stage: data.stage,
        schema_version: 2,
        locale: data.locale ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      console.error("[consultation] draft save failed (non-fatal):", error.message);
      return { saved: false };
    }
    return { saved: true };
  });

export const clearConsultationDraft = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ cleared: boolean }> => {
    const { supabase, user } = await getOptionalUser();
    if (!user) return { cleared: false };
    const { error } = await supabase.from("consultation_drafts").delete().eq("user_id", user.id);
    if (error) console.error("[consultation] draft clear failed (non-fatal):", error.message);
    return { cleared: !error };
  },
);
