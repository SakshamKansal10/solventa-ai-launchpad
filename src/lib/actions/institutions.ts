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
      const url = new URL("http://universities.hipolabs.com/search");
      url.searchParams.set("name", data.query);
      url.searchParams.set("country", data.countryName);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return [];

      const results = (await res.json()) as HipolabsUniversity[];
      return results.slice(0, 20).map((r) => ({ name: r.name, country: r.country }));
    } catch (err) {
      console.error("[institutions] search failed:", err);
      return [];
    }
  });
