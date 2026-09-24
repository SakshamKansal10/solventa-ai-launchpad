/** Supported product languages. Brand name "Solventia" and the approved
 * tagline never translate; common technical/business terms (AI, SaaS, B2B,
 * API, MVP, CRM, ROI, Startup, Founder…) may stay in English inside Hindi
 * sentences when the Hindi form would read unnaturally. */
export type Locale = "en" | "hi";

export const LOCALES: readonly Locale[] = ["en", "hi"] as const;
export const DEFAULT_LOCALE: Locale = "en";

/** SSR-readable preference. The cookie exists (in addition to localStorage
 * and profiles.locale) specifically so the FIRST server render is already in
 * the right language — a localStorage-only preference can only apply after
 * hydration, which flashes English at every Hindi reader. */
export const LOCALE_COOKIE = "solventia-locale";
/** Same key the previous localStorage-only implementation used, so existing
 * visitors keep their saved choice. */
export const LOCALE_STORAGE_KEY = "solventia-locale-v1";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "hi";
}

export function readLocaleFromCookieString(cookieHeader: string | null | undefined): Locale | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === LOCALE_COOKIE) {
      const value = decodeURIComponent(rest.join("="));
      return isLocale(value) ? value : null;
    }
  }
  return null;
}

export function buildLocaleCookie(locale: Locale): string {
  // One year, site-wide, readable by the server on every request.
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

const DEVANAGARI = /[ऀ-ॿ]/g;
const LATIN_LETTER = /[A-Za-z]/g;

/** Which script a block of generated prose is written in. Used to decide
 * whether stored AI content already matches the reader's language before
 * spending a translation call on it. Digits, punctuation and proper nouns
 * are ignored; a mixed Hindi sentence that keeps a few English business
 * terms still reads as Hindi. */
export function detectContentLocale(strings: readonly string[]): Locale {
  let dev = 0;
  let lat = 0;
  for (const s of strings) {
    dev += (s.match(DEVANAGARI) ?? []).length;
    lat += (s.match(LATIN_LETTER) ?? []).length;
  }
  if (dev === 0 && lat === 0) return "en";
  return dev >= lat * 0.35 ? "hi" : "en";
}
