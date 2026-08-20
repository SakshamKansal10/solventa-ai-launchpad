import countriesData from "world-countries";

export interface CountryOption {
  name: string;
  code: string;
}

/** Real ISO 3166-1 data (world-countries), not a hand-typed list — India
 * pinned first since it's the primary market, everything else
 * alphabetical. */
export const COUNTRY_OPTIONS: CountryOption[] = (() => {
  const india = countriesData.find((c) => c.cca2 === "IN");
  const rest = countriesData
    .filter((c) => c.cca2 !== "IN")
    .map((c) => ({ name: c.name.common, code: c.cca2 }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return india ? [{ name: india.name.common, code: india.cca2 }, ...rest] : rest;
})();

export const COUNTRY_NAMES = COUNTRY_OPTIONS.map((c) => c.name);

export function countryCodeFromName(name: string): string | null {
  return COUNTRY_OPTIONS.find((c) => c.name === name)?.code ?? null;
}

/** Countries where a postal/PIN code reliably resolves to a city+region —
 * used to decide whether to offer postal-first lookup at all before
 * falling back to manual region+city entry. Deliberately conservative
 * (a country left out just means it goes straight to the always-working
 * manual flow) rather than exhaustive — a failed lookup falls back
 * gracefully regardless of this list. India uses a dedicated free,
 * official API; the rest use Zippopotam.us's documented coverage. */
export const POSTAL_LOOKUP_COUNTRY_CODES = new Set([
  "IN",
  "US",
  "CA",
  "GB",
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "AU",
  "NZ",
  "IE",
  "CH",
  "AT",
  "BE",
  "PT",
  "MX",
  "BR",
  "JP",
  "PL",
  "CZ",
  "SE",
  "NO",
  "DK",
  "FI",
]);
