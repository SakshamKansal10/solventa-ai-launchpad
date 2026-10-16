import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface InstitutionSuggestion {
  name: string;
  country: string;
}

interface HipolabsUniversity {
  name: string;
  country: string;
}

/**
 * This data source matches only from the start of a university's full name
 * (a prefix match, not "contains anywhere"). Most Indian institutes known by
 * an abbreviation are stored under their spelled-out name instead — e.g.
 * "Indian Institute of Technology, Bombay" rather than "IIT Bombay" — so a
 * search for "IIT" alone only finds the one institute literally named that
 * way ("IIT Bhubaneswar") and misses the other 22. This maps each common
 * abbreviation's first word to its spelled-out form so both get searched.
 */
const NAME_ALIASES: Record<string, string> = {
  iit: "Indian Institute of Technology",
  nit: "National Institute of Technology",
  iiit: "Indian Institute of Information Technology",
  iim: "Indian Institute of Management",
  iisc: "Indian Institute of Science",
  aiims: "All India Institute of Medical Sciences",
  bits: "Birla Institute of Technology and Science",
  nift: "National Institute of Fashion Technology",
};

async function hipolabsSearch(name: string, countryName: string): Promise<HipolabsUniversity[]> {
  const url = new URL("http://universities.hipolabs.com/search");
  url.searchParams.set("name", name);
  url.searchParams.set("country", countryName);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    return (await res.json()) as HipolabsUniversity[];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Free, keyless, no signup — the same "real public data source, called
 * server-side" pattern already used for postal/city lookup (see
 * actions/location.ts). Only supports plain HTTP, not HTTPS (verified
 * directly — a known quirk of this specific service), which is fine
 * here since this is a server-to-server call, not a browser fetch, so
 * no mixed-content restriction applies.
 *
 * Country-scoped and name-filtered server-side so the browser never
 * receives (or has to search through) a global university list — exactly
 * the "never ship an enormous dataset to the client" requirement.
 */
export const searchInstitutions = createServerFn({ method: "POST" })
  .validator(z.object({ query: z.string().min(2).max(200), countryName: z.string().min(1) }))
  .handler(async ({ data }): Promise<InstitutionSuggestion[]> => {
    try {
      const trimmed = data.query.trim();
      const [firstWord, ...rest] = trimmed.split(/\s+/);
      const alias = NAME_ALIASES[firstWord.toLowerCase()];

      const results = await hipolabsSearch(trimmed, data.countryName);
      let merged = results;

      if (alias) {
        // The qualifier after the abbreviation (e.g. "Bombay" in "IIT Bombay")
        // can't be sent to the API — "Indian Institute of Technology Bombay"
        // isn't a prefix of "Indian Institute of Technology, Bombay" — so it
        // searches the spelled-out name alone, then filters by the qualifier.
        const expanded = await hipolabsSearch(alias, data.countryName);
        const qualifier = rest.join(" ").toLowerCase();
        const filtered = qualifier
          ? expanded.filter((r) => r.name.toLowerCase().includes(qualifier))
          : expanded;
        const seen = new Set(merged.map((r) => r.name));
        merged = [...merged, ...filtered.filter((r) => !seen.has(r.name))];
      }

      return merged.slice(0, 20).map((r) => ({ name: r.name, country: r.country }));
    } catch (err) {
      console.error("[institutions] search failed:", err);
      return [];
    }
  });
