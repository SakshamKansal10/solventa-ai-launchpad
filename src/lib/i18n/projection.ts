import { detectContentLocale, type Locale } from "@/lib/i18n/locale";

/**
 * Pure helpers behind the AI-content translation cache. A "projection" is a
 * plain JSON object holding only the prose of one entity (an opportunity, a
 * roadmap skeleton, one week…). Every string in it is translated; keys, numbers
 * and structure are never touched, so the translated projection has exactly the
 * same shape as the original and the UI can overlay it field by field.
 */

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Strings worth sending to a translator: something with an actual letter in
 * it. Pure numbers, dates, URLs and blank strings are kept as-is. */
export function isTranslatable(s: string): boolean {
  const t = s.trim();
  if (t.length === 0) return false;
  if (/^https?:\/\//i.test(t)) return false;
  return /\p{L}/u.test(t);
}

/** Every translatable string, in deterministic traversal order. */
export function collectStrings(value: Json): string[] {
  const out: string[] = [];
  const walk = (v: Json) => {
    if (typeof v === "string") {
      if (isTranslatable(v)) out.push(v);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      for (const k of Object.keys(v)) walk(v[k]);
    }
  };
  walk(value);
  return out;
}

/** Rebuilds the projection with translated strings substituted in the same
 * traversal order `collectStrings` produced. Throws if the counts disagree. */
export function applyTranslations(value: Json, translated: string[]): Json {
  let i = 0;
  const walk = (v: Json): Json => {
    if (typeof v === "string") return isTranslatable(v) ? (translated[i++] ?? v) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: { [key: string]: Json } = {};
      for (const k of Object.keys(v)) out[k] = walk(v[k]);
      return out;
    }
    return v;
  };
  const result = walk(value);
  if (i !== translated.length) throw new Error("Translation count mismatch");
  return result;
}

const DEVANAGARI_DIGITS = "०१२३४५६७८९";
function normalizeDigits(s: string): string[] {
  const latin = s.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
  return (latin.match(/\d[\d,.]*/g) ?? [])
    .map((n) => n.replace(/[,.]+$/g, "").replace(/,/g, ""))
    .sort();
}

/** A translation is accepted only if it still says the same NUMBERS as the
 * original — a translator that "rounds" ₹5 lakh into something else, or drops a
 * count, is rejected and the canonical text is shown instead. */
export function validateTranslations(
  original: string[],
  translated: unknown,
): translated is string[] {
  if (!Array.isArray(translated) || translated.length !== original.length) return false;
  for (let i = 0; i < original.length; i++) {
    const t = translated[i];
    if (typeof t !== "string" || t.trim().length === 0) return false;
    const a = normalizeDigits(original[i]);
    const b = normalizeDigits(t);
    if (a.length !== b.length || a.some((x, j) => x !== b[j])) return false;
  }
  return true;
}

/** Nothing to do when the content is already in the reader's language. */
export function alreadyInLocale(strings: string[], target: Locale): boolean {
  if (strings.length === 0) return true;
  return detectContentLocale(strings) === target;
}

/** Stable hash input: the strings AND the target, so hi and en never collide. */
export function hashInput(strings: string[], target: Locale): string {
  return JSON.stringify([target, strings]);
}
