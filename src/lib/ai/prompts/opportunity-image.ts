import { createHash } from "node:crypto";

export interface ImagePromptInput {
  title: string;
  description?: string | null;
  industry?: string | null;
  customer?: string | null;
  product?: string | null;
}

const clip = (s: string | null | undefined, n: number) =>
  (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** A concise prompt: the idea's own words say WHAT to show, one fixed style
 * block keeps every image in the same photographic direction. */
export function buildImagePrompt(input: ImagePromptInput): string {
  const facts = [
    `Business idea: ${clip(input.title, 120)}`,
    input.description && `What it is: ${clip(input.description, 260)}`,
    input.industry && `Industry: ${clip(input.industry, 60)}`,
    input.customer && `Customer: ${clip(input.customer, 140)}`,
    input.product && `Offering: ${clip(input.product, 180)}`,
  ].filter(Boolean);
  return [
    "Create one photograph of the real-world environment where this business idea operates, so a viewer immediately understands what it is about.",
    ...facts,
    "Style: a real photograph taken on a full-frame camera with a 35mm lens, premium editorial photography, natural lighting, true-to-life textures and slight imperfections (not a render), realistic materials, clean modern composition, shallow depth of field, wide landscape framing with the subject kept in the centre-right of the frame.",
    "Avoid: cartoon or illustration look, artificial 3D renders, text, captions, signage lettering, logos, watermarks, and unrelated decorative objects. Do not add any colour tint; keep colours natural.",
  ].join("\n");
}

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}
