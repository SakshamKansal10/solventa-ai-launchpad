import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface LocationLookupResult {
  city: string | null;
  state: string | null;
  country: string;
}

export interface CitySuggestion {
  name: string;
  state: string | null;
  displayLabel: string;
}

interface IndiaPostOffice {
  Name: string;
  District: string;
  State: string;
}
interface IndiaPostResponse {
  Status: string;
  PostOffice: IndiaPostOffice[] | null;
}

interface ZippopotamPlace {
  "place name": string;
  state: string;
}
interface ZippopotamResponse {
  places: ZippopotamPlace[];
}

/** Free, official, no API key. Covers India specifically and well — the
 * primary market — with real district/state resolution from a 6-digit PIN. */
async function lookupIndianPincode(pincode: string): Promise<LocationLookupResult | null> {
  const res = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as IndiaPostResponse[];
  const first = data[0];
  if (!first || first.Status !== "Success" || !first.PostOffice?.length) return null;
  const office = first.PostOffice[0];
  return { city: office.District, state: office.State, country: "India" };
}

/** Free, keyless, documented coverage of ~60 countries. */
async function lookupZippopotam(
  countryCode: string,
  postalCode: string,
  countryName: string,
): Promise<LocationLookupResult | null> {
  const res = await fetch(
    `https://api.zippopotam.us/${countryCode.toLowerCase()}/${encodeURIComponent(postalCode)}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as ZippopotamResponse;
  const place = data.places?.[0];
  if (!place) return null;
  return { city: place["place name"], state: place.state || null, country: countryName };
}

export const lookupPostalCode = createServerFn({ method: "POST" })
  .validator(
    z.object({
      countryCode: z.string().length(2),
      countryName: z.string().min(1),
      postalCode: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<LocationLookupResult | null> => {
    try {
      if (data.countryCode === "IN") return await lookupIndianPincode(data.postalCode);
      return await lookupZippopotam(data.countryCode, data.postalCode, data.countryName);
    } catch (err) {
      console.error("[location] postal lookup failed:", err);
      return null;
    }
  });

/**
 * Server-side so a proper User-Agent header can be set (required by
 * Nominatim's usage policy, and blocked from being set by browser fetch
 * anyway) and so the OpenStreetMap-hosted service is never called
 * directly from the client. No API key required.
 */
export const searchCities = createServerFn({ method: "POST" })
  .validator(z.object({ query: z.string().min(2), countryName: z.string().min(1) }))
  .handler(async ({ data }): Promise<CitySuggestion[]> => {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("city", data.query);
      url.searchParams.set("country", data.countryName);
      url.searchParams.set("format", "json");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "8");

      const res = await fetch(url, {
        headers: { "User-Agent": "Solventia-App/1.0 (business consultation platform)" },
      });
      if (!res.ok) return [];

      const results = (await res.json()) as {
        address?: { city?: string; town?: string; village?: string; state?: string };
        display_name: string;
      }[];

      const seen = new Set<string>();
      const suggestions: CitySuggestion[] = [];
      for (const r of results) {
        const name = r.address?.city ?? r.address?.town ?? r.address?.village;
        if (!name || seen.has(name)) continue;
        seen.add(name);
        suggestions.push({
          name,
          state: r.address?.state ?? null,
          displayLabel: r.address?.state ? `${name}, ${r.address.state}` : name,
        });
      }
      return suggestions;
    } catch (err) {
      console.error("[location] city search failed:", err);
      return [];
    }
  });
