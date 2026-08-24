import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";

import { env } from "@/lib/env.server";

/**
 * Single configured model for every Gemini call in the app — set via
 * GEMINI_MODEL, not scattered through the codebase. Defaults to a stable
 * Flash-class model confirmed (empirically, in this project) to be
 * available on this key's free tier and to produce reliable schema-valid
 * structured output; the earlier constraint on this key was never model
 * availability, it was the free tier's daily REQUEST COUNT (confirmed via
 * a real 429 RESOURCE_EXHAUSTED — "GenerateRequestsPerDayPerProjectPerModel-
 * FreeTier, limit: 20"), which is exactly what the one-call architecture
 * exists to reduce. Pro-tier models on this key have a hard zero quota
 * (confirmed via a separate 429 with "limit: 0") — do not switch to Pro,
 * preview, or experimental models without re-verifying quota first.
 */
export const MODEL = env.GEMINI_MODEL;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

// Gemini's responseSchema only accepts a restricted OpenAPI-3 subset — it
// rejects "additionalProperties" outright (400 INVALID_ARGUMENT), which
// zod-to-json-schema emits by default on every z.object() node.
function stripAdditionalProperties(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripAdditionalProperties);
  if (node && typeof node === "object") {
    const { additionalProperties, ...rest } = node as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(rest).map(([key, value]) => [key, stripAdditionalProperties(value)]),
    );
  }
  return node;
}

function toGeminiSchema(schema: z.ZodTypeAny): unknown {
  const json = zodToJsonSchema(schema, { target: "openApi3", $refStrategy: "none" });
  // zodToJsonSchema can leave a top-level $schema key Gemini's backend rejects.
  const { $schema, ...rest } = json as Record<string, unknown>;
  return stripAdditionalProperties(rest);
}

export class AIGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIGenerationError";
  }
}

interface GenerateStructuredParams {
  systemInstruction: string;
  prompt: string;
  /**
   * Defaults to true. The one-call initial-consultation generation
   * (generateIntelligencePackage) passes false: that call site must cost
   * exactly one automatic Gemini request, so an invalid first response has
   * to surface as an immediate failure — recoverable only by an explicit
   * user-triggered retry — never a silent second HTTP call charged against
   * the same daily quota. Every other caller (mentor replies, roadmap
   * adjustment, etc.) keeps the retry since it's a minor UX nicety there,
   * not a guarantee the app makes to the user.
   */
  allowRetry?: boolean;
}

/**
 * Calls Gemini with a schema-constrained JSON response and validates the
 * result with the same Zod schema used to build that schema. By default,
 * retries once, feeding the validation error back to the model, before
 * giving up — the caller must treat a thrown AIGenerationError as a real
 * failure, never fall back to fabricated data. Always uses the single
 * configured MODEL — callers never choose a model themselves.
 */
export async function generateStructured<T>(
  schema: z.ZodType<T>,
  params: GenerateStructuredParams,
): Promise<T> {
  const ai = getClient();
  const responseSchema = toGeminiSchema(schema);
  const model = MODEL;
  const maxAttempts = params.allowRetry === false ? 1 : 2;

  let lastError: string | null = null;

  // Every failure mode (the request itself throwing, an empty response, a
  // JSON parse failure, or a schema mismatch) records lastError and lets the
  // loop retry once — a transient API error used to skip the retry entirely
  // and throw on the first attempt, which is exactly what a request-level
  // hiccup shouldn't do when a second attempt might just succeed.
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const prompt =
      attempt === 0
        ? params.prompt
        : `${params.prompt}\n\nYour previous response failed validation with this error, fix it and respond again with ONLY valid JSON matching the schema:\n${lastError}`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
        },
      });
      const responseText = response.text;
      if (!responseText) {
        lastError = "Empty response from model.";
        continue;
      }
      const parsed = JSON.parse(responseText);
      const result = schema.safeParse(parsed);
      if (result.success) return result.data;
      lastError = result.error.message;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Gemini request failed.";
    }
  }

  throw new AIGenerationError(
    maxAttempts > 1
      ? `Gemini request failed after retry: ${lastError}`
      : `Gemini request failed: ${lastError}`,
  );
}

export interface GroundedSource {
  title: string;
  uri: string;
}

export interface GroundedResult {
  text: string;
  sources: GroundedSource[];
}

/**
 * Calls Gemini with live Google Search grounding. Sources come straight
 * from Google's groundingMetadata, never from the model inventing citations.
 * Cannot be combined with responseSchema (backend limitation), so this
 * always returns free text + a real source list — pair with a second
 * generateStructured call to shape that text into the app's evidence format.
 */
export async function generateGrounded(prompt: string): Promise<GroundedResult> {
  const ai = getClient();

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });
  } catch (err) {
    throw new AIGenerationError("Gemini grounded search request failed", err);
  }

  const text = response.text ?? "";
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: GroundedSource[] = chunks
    .map((c) =>
      c.web ? { title: c.web.title ?? c.web.uri ?? "Source", uri: c.web.uri ?? "" } : null,
    )
    .filter((s): s is GroundedSource => s !== null && s.uri !== "");

  return { text, sources };
}
