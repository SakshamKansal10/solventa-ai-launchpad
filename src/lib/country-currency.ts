import countriesData from "world-countries";
import { countryCodeFromName } from "./location-data";

export interface CurrencyInfo {
  /** ISO 4217, e.g. "INR". */
  code: string;
  symbol: string;
}

const DEFAULT_CURRENCY: CurrencyInfo = { code: "INR", symbol: "₹" };

/** Real ISO 4217 data from the same `world-countries` package already
 * used for the country picker — not a hand-typed table, so it covers
 * every country in COUNTRY_NAMES without drift between the two. A
 * country with more than one official currency uses its first-listed
 * one, which matches how world-countries orders them (the de facto
 * primary currency in every case checked). */
const CURRENCY_BY_COUNTRY_CODE: Record<string, CurrencyInfo> = (() => {
  const map: Record<string, CurrencyInfo> = {};
  for (const country of countriesData) {
    const entry = Object.entries(country.currencies ?? {})[0];
    if (entry) {
      const [code, info] = entry;
      map[country.cca2] = { code, symbol: info.symbol || code };
    }
  }
  return map;
})();

/** Falls back to INR (Solventia's original, still-dominant market) only
 * when the country is unset or genuinely has no resolvable currency —
 * never guesses. */
export function getCurrencyForCountry(countryName: string | undefined | null): CurrencyInfo {
  if (!countryName) return DEFAULT_CURRENCY;
  const code = countryCodeFromName(countryName);
  if (!code) return DEFAULT_CURRENCY;
  return CURRENCY_BY_COUNTRY_CODE[code] ?? DEFAULT_CURRENCY;
}

/** The one place money ever gets formatted for display — always via
 * Intl.NumberFormat's real currency support (correct symbol placement,
 * digit grouping, and decimal conventions per currency), never hand-rolled
 * string concatenation. Falls back to a plain "CODE amount" rendering only
 * if the code somehow isn't ISO-4217-recognized by the runtime, which
 * should not happen given the source data but must never crash a page. */
export function formatMoney(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode} ${Math.round(amount).toLocaleString()}`;
  }
}

/** Short form for compact UI (stat tiles, badges) — e.g. "₹12.5L", "$12.5K".
 * Uses the "en-IN" locale specifically for INR (real lakh/crore compact
 * notation, not an approximation) and the runtime default locale for every
 * other currency (real K/M/B compact notation) — both via Intl's own
 * compact-notation support, never hand-rolled division/suffix logic. */
export function formatCompactMoney(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(currencyCode === "INR" ? "en-IN" : undefined, {
      style: "currency",
      currency: currencyCode,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return formatMoney(amount, currencyCode);
  }
}

export interface MoneyBracket {
  label: string;
  /** Representative numeric value for deterministic scoring/midpoint
   * math — never shown to the user directly, only the label is. */
  value: number;
}

/** Large-denomination currencies where "500" or "2,500" would be a
 * meaningless bracket (a coffee, not startup capital). Scaled brackets
 * for these use a larger base unit. This is a fixed, documented
 * order-of-magnitude classification — NOT an exchange rate: no bracket
 * value is derived by converting from INR or USD, each currency's
 * brackets are independently reasonable round numbers in that currency. */
const LARGE_DENOMINATION_CURRENCIES = new Set([
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

/** Investment/starting-capital brackets. INR keeps its exact original
 * labels/values (zero behavior change for existing users — this was the
 * only currency the product supported until now). Every other currency
 * gets independently reasonable round-number brackets in its own
 * denomination scale, formatted with its real symbol — never a
 * currency-converted copy of the INR brackets. */
export function getInvestmentBrackets(currencyCode: string): MoneyBracket[] {
  if (currencyCode === "INR") {
    return [
      { label: "₹0 — I have no capital right now", value: 0 },
      { label: "Under ₹10,000", value: 5_000 },
      { label: "₹10,000 – ₹50,000", value: 30_000 },
      { label: "₹50,000 – ₹2,00,000", value: 125_000 },
      { label: "More than ₹2,00,000", value: 300_000 },
    ];
  }
  const scale = LARGE_DENOMINATION_CURRENCIES.has(currencyCode) ? 100 : 1;
  const steps = [0, 500 * scale, 2_500 * scale, 10_000 * scale];
  const fmt = (n: number) => formatMoney(n, currencyCode);
  return [
    { label: `${fmt(0)} — I have no capital right now`, value: 0 },
    { label: `Under ${fmt(steps[1])}`, value: steps[1] / 2 },
    { label: `${fmt(steps[1])} – ${fmt(steps[2])}`, value: (steps[1] + steps[2]) / 2 },
    { label: `${fmt(steps[2])} – ${fmt(steps[3])}`, value: (steps[2] + steps[3]) / 2 },
    { label: `More than ${fmt(steps[3])}`, value: steps[3] * 2 },
  ];
}

/** Annual income brackets — same INR-preserved / independently-scaled
 * pattern as getInvestmentBrackets. */
export function getAnnualIncomeBrackets(currencyCode: string): MoneyBracket[] {
  if (currencyCode === "INR") {
    return [
      { label: "< ₹3L", value: 200_000 },
      { label: "₹3–5L", value: 400_000 },
      { label: "₹5–10L", value: 750_000 },
      { label: "₹10–20L", value: 1_500_000 },
      { label: "₹20–50L", value: 3_500_000 },
      { label: "₹50L+", value: 6_000_000 },
    ];
  }
  const scale = LARGE_DENOMINATION_CURRENCIES.has(currencyCode) ? 100 : 1;
  const steps = [15_000 * scale, 30_000 * scale, 60_000 * scale, 120_000 * scale, 250_000 * scale];
  const fmt = (n: number) => formatMoney(n, currencyCode);
  return [
    { label: `Under ${fmt(steps[0])}`, value: steps[0] * 0.7 },
    { label: `${fmt(steps[0])} – ${fmt(steps[1])}`, value: (steps[0] + steps[1]) / 2 },
    { label: `${fmt(steps[1])} – ${fmt(steps[2])}`, value: (steps[1] + steps[2]) / 2 },
    { label: `${fmt(steps[2])} – ${fmt(steps[3])}`, value: (steps[2] + steps[3]) / 2 },
    { label: `${fmt(steps[3])} – ${fmt(steps[4])}`, value: (steps[3] + steps[4]) / 2 },
    { label: `${fmt(steps[4])}+`, value: steps[4] * 1.5 },
  ];
}

/** Target-monthly-income brackets — same pattern again. */
export function getMonthlyIncomeGoalBrackets(currencyCode: string): MoneyBracket[] {
  if (currencyCode === "INR") {
    return [
      { label: "Under ₹5,000", value: 3_000 },
      { label: "₹5,000 – ₹20,000", value: 12_500 },
      { label: "₹20,000 – ₹50,000", value: 35_000 },
      { label: "₹50,000 – ₹1,50,000", value: 100_000 },
      { label: "₹1,50,000+", value: 200_000 },
    ];
  }
  const scale = LARGE_DENOMINATION_CURRENCIES.has(currencyCode) ? 100 : 1;
  const steps = [500 * scale, 2_000 * scale, 5_000 * scale, 15_000 * scale];
  const fmt = (n: number) => formatMoney(n, currencyCode);
  return [
    { label: `Under ${fmt(steps[0])}`, value: steps[0] * 0.6 },
    { label: `${fmt(steps[0])} – ${fmt(steps[1])}`, value: (steps[0] + steps[1]) / 2 },
    { label: `${fmt(steps[1])} – ${fmt(steps[2])}`, value: (steps[1] + steps[2]) / 2 },
    { label: `${fmt(steps[2])} – ${fmt(steps[3])}`, value: (steps[2] + steps[3]) / 2 },
    { label: `${fmt(steps[3])}+`, value: steps[3] * 1.5 },
  ];
}

/** Parses free-form currency input (typed for the open-ended top
 * investment bracket) into a raw amount in the given currency. Indian
 * lakh/crore shorthand is only recognized for INR — every other currency
 * just parses plain/comma-grouped digits, since lakh/crore terminology is
 * specific to the Indian numbering system. Returns null for anything it
 * can't confidently parse. */
export function parseCurrencyAmount(raw: string, currencyCode: string): number | null {
  const input = raw.trim().toLowerCase();
  if (!input) return null;
  const cleaned = input.replace(/[^\w.\s]/g, "");

  if (currencyCode === "INR") {
    const croreMatch = cleaned.match(/^([0-9]*\.?[0-9]+)\s*(cr|crore|crores)$/);
    if (croreMatch) return Math.round(parseFloat(croreMatch[1]) * 1_00_00_000);
    const lakhMatch = cleaned.match(/^([0-9]*\.?[0-9]+)\s*(l|lac|lacs|lakh|lakhs)$/);
    if (lakhMatch) return Math.round(parseFloat(lakhMatch[1]) * 1_00_000);
  }

  const kMatch = cleaned.match(/^([0-9]*\.?[0-9]+)\s*k$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1_000);
  const mMatch = cleaned.match(/^([0-9]*\.?[0-9]+)\s*m$/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1_000_000);

  const plain = cleaned.replace(/,/g, "").match(/^[0-9]*\.?[0-9]+$/);
  if (plain) return Math.round(parseFloat(plain[0]));

  return null;
}
