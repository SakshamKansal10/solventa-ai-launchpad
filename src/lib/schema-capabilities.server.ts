import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

/**
 * Which parts of migration 0010 the connected database actually has.
 *
 * Migrations here are applied by hand in the Supabase SQL editor, so a deploy
 * can (briefly, or mistakenly) run ahead of the database. Rather than let a
 * missing column turn into a 500 on the founder's dashboard, server code asks
 * this module and falls back to the pre-0010 behaviour (English content, the
 * legacy generation path, "not available yet" states) when a capability is
 * absent. Probed with cheap `head` queries, cached in-process for a minute.
 */
export interface SchemaCapabilities {
  /** roadmap_weeks.generation_status et al. — the DB-backed generation lock. */
  weekLock: boolean;
  /** proof_assumptions / proof_evidence tables. */
  proof: boolean;
  /** content_translations table. */
  translations: boolean;
  /** profiles.locale / avatar_path / active_opportunity_id. */
  profileExtras: boolean;
  /** consultation_drafts table. */
  drafts: boolean;
  /** roadmaps.status allows 'building' / 'failed' / 'completed'. */
  roadmapStates: boolean;
}

const ALL_OFF: SchemaCapabilities = {
  weekLock: false,
  proof: false,
  translations: false,
  profileExtras: false,
  drafts: false,
  roadmapStates: false,
};

let cache: { at: number; caps: SchemaCapabilities } | null = null;
const TTL_MS = 60_000;

/** PostgREST/Postgres codes that mean "this column/table doesn't exist". */
export function isSchemaMissingError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  if (["42703", "42P01", "PGRST204", "PGRST205", "PGRST200"].includes(code)) return true;
  return /column .* does not exist|relation .* does not exist|schema cache/i.test(
    error.message ?? "",
  );
}

export async function getSchemaCapabilities(
  supabase: SupabaseClient<Database>,
): Promise<SchemaCapabilities> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.caps;

  const probe = async (table: string, column: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as unknown as SupabaseClient)
        .from(table)
        .select(column, { head: true, count: "exact" })
        .limit(1);
      return !isSchemaMissingError(error);
    } catch {
      return false;
    }
  };

  const [weekLock, proof, translations, profileExtras, drafts, roadmapStates] = await Promise.all([
    probe("roadmap_weeks", "generation_status"),
    probe("proof_assumptions", "id"),
    probe("content_translations", "id"),
    probe("profiles", "active_opportunity_id"),
    probe("consultation_drafts", "user_id"),
    // Column added in the same migration as the widened status check.
    probe("roadmaps", "build_error"),
  ]);

  const caps: SchemaCapabilities = {
    ...ALL_OFF,
    weekLock,
    proof,
    translations,
    profileExtras,
    drafts,
    roadmapStates,
  };
  cache = { at: Date.now(), caps };
  return caps;
}

/** Tests / a freshly applied migration can drop the cache. */
export function resetSchemaCapabilitiesCache() {
  cache = null;
}
