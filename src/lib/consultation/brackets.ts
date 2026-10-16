import { getCurrencyForCountry } from "@/lib/country-currency";
import type { Locale } from "@/lib/i18n/locale";

/**
 * Country-aware money ranges. Answers store the bracket INDEX (a tier), never
 * a currency-specific label, so the same answer reads correctly in either
 * language and survives the founder correcting their country. Every set is
 * independently sized for its currency's order of magnitude — never a
 * conversion from INR or USD.
 */

export type BracketKind = "capital" | "income" | "turnover" | "minIncome";

export interface Bracket {
  /** Inclusive lower bound (null = open below). */
  min: number | null;
  /** Exclusive upper bound (null = open above). */
  max: number | null;
  /** Representative number for deterministic scoring. Never shown. */
  value: number;
  /** True only for a tier that means "none / zero". */
  zero?: boolean;
}

/** Currencies whose everyday amounts are ~100x larger, where "500" is a
 * coffee, not startup capital. A fixed order-of-magnitude class, not an FX rate. */
const LARGE_DENOMINATION = new Set([
  "JPY",
  "KRW",
  "IDR",
  "VND",
  "PKR",
  "LAK",
  "MMK",
  "SLL",
  "GNF",
  "UGX",
  "COP",
  "CLP",
]);

const BOUNDARIES: Record<BracketKind, { INR: number[]; other: number[] }> = {
  // none | < b0 | b0–b1 | … | > last
  capital: {
    INR: [10_000, 50_000, 200_000, 500_000, 1_000_000, 2_500_000, 10_000_000],
    other: [500, 2_500, 10_000, 25_000, 50_000, 100_000, 250_000],
  },
  // < b0 | b0–b1 | … | > last   (no zero tier)
  income: {
    INR: [300_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000],
    other: [15_000, 30_000, 60_000, 120_000, 250_000, 500_000],
  },
  turnover: {
    INR: [5_000_000, 20_000_000, 100_000_000, 500_000_000, 2_500_000_000],
    other: [50_000, 200_000, 1_000_000, 5_000_000, 25_000_000],
  },
  // none | < b0 | b0–b1 | … | > last   (monthly, per person)
  minIncome: {
    INR: [25_000, 75_000, 200_000],
    other: [1_000, 3_000, 8_000],
  },
};

const HAS_ZERO_TIER: Record<BracketKind, boolean> = {
  capital: true,
  income: false,
  turnover: false,
  minIncome: true,
};

export function getBrackets(kind: BracketKind, currencyCode: string): Bracket[] {
  const set = BOUNDARIES[kind];
  const isInr = currencyCode === "INR";
  const scale = isInr ? 1 : LARGE_DENOMINATION.has(currencyCode) ? 100 : 1;
  const b = (isInr ? set.INR : set.other).map((n) => n * scale);

  const out: Bracket[] = [];
  if (HAS_ZERO_TIER[kind]) out.push({ min: 0, max: 0, value: 0, zero: true });
  out.push({ min: null, max: b[0], value: b[0] * 0.5 });
  for (let i = 0; i < b.length - 1; i++) {
    out.push({ min: b[i], max: b[i + 1], value: (b[i] + b[i + 1]) / 2 });
  }
  out.push({ min: b[b.length - 1], max: null, value: b[b.length - 1] * 2 });
  return out;
}

export function getBracketsForCountry(kind: BracketKind, country: string | undefined | null) {
  return getBrackets(kind, getCurrencyForCountry(country).code);
}

/** How many tiers a kind has — used to normalise a tier index to 0–1. */
export function bracketCount(kind: BracketKind): number {
  return getBrackets(kind, "INR").length;
}

export const TEAM_SIZE_VALUES = [1, 5, 25, 120, 600, 1500] as const;
export const TEAM_SIZE_IDS = [
  "solo",
  "t2_10",
  "t11_50",
  "t51_250",
  "t251_1000",
  "t1000plus",
] as const;

type Words = { under: string; over: string; none: string; lakh: string; crore: string };

const WORDS: Record<Locale, Words> = {
  en: { under: "Under", over: "More than", none: "None", lakh: "lakh", crore: "crore" },
  hi: { under: "से कम", over: "से अधिक", none: "कोई नहीं", lakh: "लाख", crore: "करोड़" },
};

/** Formats one amount in the founder's own currency. INR uses lakh/crore (the
 * natural way Indian founders read money); everything else uses the
 * currency's real symbol via Intl. Digits stay Latin in both languages. */
export function formatAmount(amount: number, currencyCode: string, locale: Locale): string {
  const w = WORDS[locale];
  if (currencyCode === "INR") {
    const symbol = "₹";
    const trim = (n: number) => String(Math.round(n * 100) / 100);
    if (amount >= 10_000_000) return `${symbol}${trim(amount / 10_000_000)} ${w.crore}`;
    if (amount >= 100_000) return `${symbol}${trim(amount / 100_000)} ${w.lakh}`;
    return `${symbol}${amount.toLocaleString("en-IN")}`;
  }
  try {
    if (amount >= 1_000_000) {
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency: currencyCode,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(amount);
    }
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode} ${Math.round(amount).toLocaleString("en")}`;
  }
}

export function formatBracketLabel(bracket: Bracket, currencyCode: string, locale: Locale): string {
  const w = WORDS[locale];
  const fmt = (n: number) => formatAmount(n, currencyCode, locale);
  if (bracket.zero) return `${fmt(0)} — ${w.none}`;
  if (bracket.min === null && bracket.max !== null) {
    return locale === "hi" ? `${fmt(bracket.max)} ${w.under}` : `${w.under} ${fmt(bracket.max)}`;
  }
  if (bracket.max === null && bracket.min !== null) {
    return locale === "hi" ? `${fmt(bracket.min)} ${w.over}` : `${w.over} ${fmt(bracket.min)}`;
  }
  return `${fmt(bracket.min ?? 0)} – ${fmt(bracket.max ?? 0)}`;
}

export function bracketLabelFor(
  kind: BracketKind,
  index: number | undefined,
  country: string | undefined | null,
  locale: Locale,
): string | null {
  if (index === undefined || index === null) return null;
  const currency = getCurrencyForCountry(country).code;
  const bracket = getBrackets(kind, currency)[index];
  return bracket ? formatBracketLabel(bracket, currency, locale) : null;
}
