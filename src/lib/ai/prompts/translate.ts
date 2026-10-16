import { z } from "zod";

import { generateJSON } from "@/lib/ai/gemini.server";
import type { Locale } from "@/lib/i18n/locale";

const TranslationsSchema = z.object({ translations: z.array(z.string()) });

/** Business/technical terms that read naturally in English inside a Hindi
 * sentence — the translator keeps them rather than inventing stiff Hindi. */
const KEEP_IN_ENGLISH =
  "AI, SaaS, B2B, B2C, API, MVP, CRM, ROI, KPI, SEO, startup, founder, dashboard, app, website, WhatsApp, Instagram, LinkedIn, Excel, Google";

const SYSTEM = (target: Locale) =>
  target === "hi"
    ? `You are a professional business translator. Translate each string into natural, fluent Hindi (Devanagari) as a native business writer would — never a stiff word-for-word rendering. Keep EXACTLY as written: every number and amount (write digits as Latin digits 0-9), currency symbols and codes, percentages, dates, URLs, the brand name "Solventia", people and company names, and product/tool names. Common terms that are normally left in English in Indian business Hindi may stay in English: ${KEEP_IN_ENGLISH}. Never add, remove or merge sentences, never explain, never add commentary. Output ONLY JSON.`
    : `You are a professional business translator. Translate each string into clear, natural English. Keep EXACTLY as written: every number and amount, currency symbols and codes, percentages, dates, URLs, the brand name "Solventia", people and company names, and product/tool names. Never add, remove or merge sentences and never add commentary. Output ONLY JSON.`;

const BATCH = 80;

/** Translates an ordered list of strings; the result is the same length and
 * order. Long lists are split into batches. The caller validates numbers and
 * length (see validateTranslations) and falls back to the original on failure. */
export async function translateStrings(strings: string[], target: Locale): Promise<string[]> {
  const out: string[] = [];
  for (let start = 0; start < strings.length; start += BATCH) {
    const chunk = strings.slice(start, start + BATCH);
    const prompt = `Translate these ${chunk.length} strings. Respond with ONLY a JSON object {"translations": [...]} containing exactly ${chunk.length} translated strings in the SAME order.\n\n${JSON.stringify(chunk)}`;
    const result = await generateJSON(TranslationsSchema, {
      systemInstruction: SYSTEM(target),
      prompt,
      callSite: "translateStrings",
      purpose: "CONTENT_TRANSLATION",
      route: "content/translate",
    });
    out.push(...result.translations);
  }
  return out;
}
