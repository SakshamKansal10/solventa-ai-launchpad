import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/types";
import type { OpportunityPackage } from "@/lib/ai/schemas";
import type { GenerationLocale } from "@/lib/ai/prompts/shared";
import { translateOpportunityPackage } from "@/lib/ai/prompts/opportunity-translation";

type OpportunityRow = Database["public"]["Tables"]["opportunities"]["Row"];

/** Translates one opportunity row's founder-facing text (title, one_liner,
 * who_for, and the prose inside `candidate`) into `locale`, if needed —
 * a no-op when `locale` is unset or already matches the row's
 * `origin_locale`. Results are cached in `opportunity_translations` so the
 * same (opportunity, locale) pair is only ever translated once; a failed
 * translation call degrades to the original (untranslated) row rather than
 * breaking the page, matching this app's other best-effort persistence
 * steps. Only opportunities generated under the one-call architecture
 * (which have `candidate.plainEnglishSummary`) are translated — a
 * pre-migration legacy candidate shape is left as-is. */
export async function translateOpportunityRow<T extends OpportunityRow>(
  supabase: SupabaseClient<Database>,
  userId: string,
  row: T,
  locale: GenerationLocale | undefined,
): Promise<T> {
  if (!locale || locale === row.origin_locale) return row;

  const cached = await supabase
    .from("opportunity_translations")
    .select("title, one_liner, who_for, candidate")
    .eq("opportunity_id", row.id)
    .eq("locale", locale)
    .maybeSingle();
  if (cached.data) {
    return {
      ...row,
      title: cached.data.title,
      one_liner: cached.data.one_liner,
      who_for: cached.data.who_for,
      candidate: cached.data.candidate,
    };
  }

  const candidate = row.candidate as unknown as OpportunityPackage;
  if (typeof candidate?.plainEnglishSummary !== "string") return row;

  try {
    const translated = await translateOpportunityPackage(candidate, locale, `opportunity/${row.id}`);
    const translatedRow: T = {
      ...row,
      title: translated.title,
      one_liner: translated.plainEnglishSummary,
      who_for: translated.customer,
      candidate: translated as unknown as Json,
    };

    const { error } = await supabase.from("opportunity_translations").upsert(
      {
        opportunity_id: row.id,
        user_id: userId,
        locale,
        title: translatedRow.title,
        one_liner: translatedRow.one_liner,
        who_for: translatedRow.who_for,
        candidate: translatedRow.candidate,
      },
      { onConflict: "opportunity_id,locale" },
    );
    if (error) {
      console.error("[opportunity-translation] cache write failed (non-fatal):", error);
    }

    return translatedRow;
  } catch (err) {
    console.error("[opportunity-translation] translation failed, showing original text:", err);
    return row;
  }
}

export async function translateOpportunityRows<T extends OpportunityRow>(
  supabase: SupabaseClient<Database>,
  userId: string,
  rows: T[],
  locale: GenerationLocale | undefined,
): Promise<T[]> {
  if (!locale) return rows;
  return Promise.all(rows.map((row) => translateOpportunityRow(supabase, userId, row, locale)));
}
