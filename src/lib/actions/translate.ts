import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { translateStrings } from "@/lib/ai/prompts/translate";
import { getSchemaCapabilities } from "@/lib/schema-capabilities.server";
import { toDisplayDetail } from "@/lib/opportunity-display";
import type { OpportunityPackage } from "@/lib/ai/schemas";
import type { Locale } from "@/lib/i18n/locale";
import {
  alreadyInLocale,
  applyTranslations,
  collectStrings,
  hashInput,
  validateTranslations,
  type Json,
} from "@/lib/i18n/projection";

type Db = SupabaseClient<Database>;

export const TRANSLATABLE_ENTITIES = [
  "opportunity",
  "roadmap_skeleton",
  "week_detail",
  "proof",
] as const;
export type TranslatableEntity = (typeof TRANSLATABLE_ENTITIES)[number];

export interface TranslationResult {
  /** translated: overlay `projection`. same: already in that language.
   * unavailable: fall back to the canonical text (never blank). */
  status: "translated" | "same" | "unavailable";
  projection: Json | null;
}

/** ---- entity loaders: the ONLY prose that is ever sent for translation is what the
 * server reads here — never anything the client supplies. ---- */

async function loadOpportunity(db: Db, userId: string, id: string): Promise<Json> {
  const { data, error } = await db
    .from("opportunities")
    .select("title, one_liner, who_for, candidate")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("Opportunity not found");
  const detail = toDisplayDetail(data.candidate as unknown as OpportunityPackage);
  const { difficulty: _difficulty, ...prose } = detail;
  return {
    title: data.title,
    oneLiner: data.one_liner,
    detail: prose as unknown as Json,
  };
}

async function loadRoadmapSkeleton(db: Db, userId: string, id: string): Promise<Json> {
  const [{ data: roadmap }, { data: phases }] = await Promise.all([
    db.from("roadmaps").select("north_star").eq("id", id).eq("user_id", userId).maybeSingle(),
    db
      .from("roadmap_phases")
      .select(
        "id, title, description, order_index, roadmap_weeks(id, title, objective, order_index)",
      )
      .eq("roadmap_id", id)
      .eq("user_id", userId)
      .order("order_index"),
  ]);
  if (!roadmap) throw new Error("Roadmap not found");
  const phaseMap: Record<string, Json> = {};
  const weekMap: Record<string, Json> = {};
  for (const p of (phases ?? []) as unknown as {
    id: string;
    title: string;
    description: string | null;
    roadmap_weeks: { id: string; title: string; objective: string; order_index: number }[];
  }[]) {
    phaseMap[p.id] = { title: p.title, description: p.description ?? "" };
    for (const w of [...p.roadmap_weeks].sort((a, b) => a.order_index - b.order_index)) {
      weekMap[w.id] = { title: w.title, objective: w.objective };
    }
  }
  return { northStar: roadmap.north_star ?? "", phases: phaseMap, weeks: weekMap };
}

async function loadWeekDetail(db: Db, userId: string, id: string): Promise<Json> {
  // select("*") so this keeps working on a database without migration 0010's
  // newer week/task columns (adaptation_note, steps).
  const { data: week } = await db
    .from("roadmap_weeks")
    .select("*, roadmap_tasks(*)")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!week) throw new Error("Week not found");
  const raw = week as unknown as {
    mission: string | null;
    success_threshold: string | null;
    evidence_required: string | null;
    adaptation_note?: string | null;
    mistakes_to_avoid: unknown;
    roadmap_tasks: {
      id: string;
      what: string;
      why: string;
      done_when: string;
      time_estimate: string | null;
      how: string;
      steps?: unknown;
    }[];
  };
  const missions: Record<string, Json> = {};
  for (const t of raw.roadmap_tasks) {
    const steps = Array.isArray(t.steps)
      ? (t.steps as unknown[]).filter((s): s is string => typeof s === "string")
      : [];
    missions[t.id] = {
      title: t.what,
      why: t.why,
      doneWhen: t.done_when,
      timeEstimate: t.time_estimate ?? "",
      how: t.how,
      steps,
    };
  }
  return {
    mission: raw.mission ?? "",
    successThreshold: raw.success_threshold ?? "",
    evidenceRequired: raw.evidence_required ?? "",
    adaptationNote: raw.adaptation_note ?? "",
    mistakes: Array.isArray(raw.mistakes_to_avoid)
      ? (raw.mistakes_to_avoid as unknown[]).filter((m): m is string => typeof m === "string")
      : [],
    missions,
  };
}

async function loadProof(db: Db, userId: string, id: string): Promise<Json> {
  const { data } = await db
    .from("proof_assumptions")
    .select("id, title, why_it_matters, next_test")
    .eq("opportunity_id", id)
    .eq("user_id", userId);
  const assumptions: Record<string, Json> = {};
  for (const a of data ?? []) {
    assumptions[a.id] = {
      title: a.title,
      whyItMatters: a.why_it_matters ?? "",
      nextTest: a.next_test ?? "",
    };
  }
  return { assumptions };
}

const LOADERS: Record<TranslatableEntity, (db: Db, userId: string, id: string) => Promise<Json>> = {
  opportunity: loadOpportunity,
  roadmap_skeleton: loadRoadmapSkeleton,
  week_detail: loadWeekDetail,
  proof: loadProof,
};

/** Cache-first translation of one entity's prose. The cache key includes a
 * hash of the source text, so a translation is reused until — and only until —
 * the original changes. Any failure (AI down, invalid output, table missing)
 * resolves to `unavailable`, and the UI keeps the canonical text: content is
 * never blank and a page load never depends on the translator. */
export const getTranslation = createServerFn({ method: "GET" })
  .validator(
    z.object({
      entityType: z.enum(TRANSLATABLE_ENTITIES),
      entityId: z.string().uuid(),
      locale: z.enum(["en", "hi"]),
      /** Cache-busting hint only (never trusted): lets the client refetch when it knows the source grew. */
      rev: z.string().max(40).optional(),
    }),
  )
  .handler(async ({ data }): Promise<TranslationResult> => {
    const { supabase, user } = await requireUser();
    const target = data.locale as Locale;
    try {
      const projection = await LOADERS[data.entityType](supabase, user.id, data.entityId);
      const strings = collectStrings(projection);
      if (alreadyInLocale(strings, target)) return { status: "same", projection: null };

      const caps = await getSchemaCapabilities(supabase);
      const sourceHash = crypto
        .createHash("sha256")
        .update(hashInput(strings, target))
        .digest("hex");

      if (caps.translations) {
        const cached = await supabase
          .from("content_translations")
          .select("payload_json")
          .eq("entity_type", data.entityType)
          .eq("entity_id", data.entityId)
          .eq("locale", target)
          .eq("source_hash", sourceHash)
          .eq("user_id", user.id)
          .maybeSingle();
        if (cached.data?.payload_json) {
          return { status: "translated", projection: cached.data.payload_json as Json };
        }
      }

      const translated = await translateStrings(strings, target);
      if (!validateTranslations(strings, translated)) {
        console.error("[translate] rejected an invalid translation for", data.entityType);
        return { status: "unavailable", projection: null };
      }
      const rebuilt = applyTranslations(projection, translated);

      if (caps.translations) {
        const { error } = await supabase.from("content_translations").upsert(
          {
            user_id: user.id,
            entity_type: data.entityType,
            entity_id: data.entityId,
            locale: target,
            source_hash: sourceHash,
            payload_json: rebuilt as never,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "entity_type,entity_id,locale,source_hash" },
        );
        if (error) console.error("[translate] cache write failed (non-fatal):", error.message);
      }
      return { status: "translated", projection: rebuilt };
    } catch (err) {
      console.error("[translate] failed, falling back to canonical text:", err);
      return { status: "unavailable", projection: null };
    }
  });
