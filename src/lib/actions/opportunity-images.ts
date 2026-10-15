import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { generateImage } from "@/lib/ai/gemini.server";
import { isSchemaMissingError } from "@/lib/schema-capabilities.server";
import { buildImagePrompt, hashPrompt } from "@/lib/ai/prompts/opportunity-image";

const BUCKET = "opportunity-images";

export type OpportunityImageResult =
  { status: "ready"; url: string } | { status: "none" } | { status: "unavailable" };

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function publicUrl(supabase: SupabaseClient<Database>, path: string, version: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // The path is unique per generation, `v` only guards against a CDN keeping an old file.
  return `${data.publicUrl}?v=${encodeURIComponent(version)}`;
}

/** Cached images for a set of opportunities. Read-only: never calls Gemini. */
export const getOpportunityImages = createServerFn({ method: "GET" })
  .validator(z.object({ ids: z.array(z.string().uuid()).min(1).max(30) }))
  .handler(async ({ data }): Promise<Record<string, OpportunityImageResult>> => {
    const { supabase } = await requireUser();
    const { data: rows, error } = await supabase
      .from("opportunity_images")
      .select("opportunity_id, image_path, updated_at")
      .in("opportunity_id", data.ids);
    if (error) {
      const missing = isSchemaMissingError(error);
      if (!missing) console.error("[opportunity-images] read failed:", error.message);
      return Object.fromEntries(
        data.ids.map((id) => [id, { status: missing ? "unavailable" : "none" } as const]),
      );
    }
    const byId = new Map(rows.map((r) => [r.opportunity_id, r]));
    return Object.fromEntries(
      data.ids.map((id) => {
        const row = byId.get(id);
        return [
          id,
          row
            ? ({
                status: "ready",
                url: publicUrl(supabase, row.image_path, row.updated_at),
              } as const)
            : ({ status: "none" } as const),
        ];
      }),
    );
  });

/** Requests already generating in this server instance, so two renders (or a
 * double click) never pay for two images of the same idea. */
const inFlight = new Map<string, Promise<OpportunityImageResult>>();

async function generateAndStore(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  regenerate: boolean,
): Promise<OpportunityImageResult> {
  const { data: opp, error: oppError } = await supabase
    .from("opportunities")
    .select("title, one_liner, who_for, candidate")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (oppError || !opp) throw new Error("Opportunity not found");

  const { data: existing, error: existingError } = await supabase
    .from("opportunity_images")
    .select("image_path, updated_at")
    .eq("opportunity_id", id)
    .maybeSingle();
  if (existingError) {
    if (isSchemaMissingError(existingError)) return { status: "unavailable" };
    throw new Error(existingError.message);
  }
  if (existing && !regenerate) {
    return { status: "ready", url: publicUrl(supabase, existing.image_path, existing.updated_at) };
  }

  const candidate = (opp.candidate ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof candidate[k] === "string" ? (candidate[k] as string) : null);
  const prompt = buildImagePrompt({
    title: opp.title,
    description: opp.one_liner,
    industry: str("category"),
    customer: str("customer") ?? opp.who_for,
    product: str("solution"),
  });

  const image = await generateImage({ prompt, route: `opportunity-image:${id}` });
  const path = `${userId}/${id}-${crypto.randomUUID().slice(0, 8)}.${EXT[image.mimeType] ?? "png"}`;
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, image.data, { contentType: image.mimeType, cacheControl: "31536000" });
  if (upload.error) throw new Error(upload.error.message);

  const now = new Date().toISOString();
  const { error: saveError } = await supabase.from("opportunity_images").upsert(
    {
      opportunity_id: id,
      user_id: userId,
      image_path: path,
      prompt_hash: hashPrompt(prompt),
      ai_model: image.model,
      updated_at: now,
    },
    { onConflict: "opportunity_id" },
  );
  if (saveError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(saveError.message);
  }
  if (existing?.image_path && existing.image_path.startsWith(`${userId}/`)) {
    await supabase.storage.from(BUCKET).remove([existing.image_path]);
  }
  return { status: "ready", url: publicUrl(supabase, path, now) };
}

/** Generates the idea's image only if it has none (or `regenerate` is set, which
 * is only ever sent from the explicit Regenerate button). Gemini is called from
 * here, server-side, as the signed-in user. */
export const ensureOpportunityImage = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), regenerate: z.boolean().optional() }))
  .handler(async ({ data }): Promise<OpportunityImageResult> => {
    const { supabase, user } = await requireUser();
    const key = `${user.id}:${data.id}`;
    const running = inFlight.get(key);
    if (running) return running;
    const job = generateAndStore(supabase, user.id, data.id, data.regenerate === true).finally(() =>
      inFlight.delete(key),
    );
    inFlight.set(key, job);
    return job;
  });
