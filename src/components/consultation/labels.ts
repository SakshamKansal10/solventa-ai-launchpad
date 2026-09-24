import { useMemo } from "react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { countryCodeFromName } from "@/lib/location-data";
import { LANGUAGE_CODES, optionKey, skillSlug } from "@/lib/consultation/options";
import type { Locale } from "@/lib/i18n/locale";
import type { Opt } from "./ui";

/** Country and language names are shown in the reader's own language using
 * the platform's CLDR data (Intl.DisplayNames) — accurate, and no hand-typed
 * translation table to drift. Any failure falls back to the English name. */
function displayName(
  kind: "region" | "language",
  code: string | null,
  fallback: string,
  locale: Locale,
) {
  if (locale === "en" || !code) return fallback;
  try {
    return new Intl.DisplayNames([locale], { type: kind }).of(code) ?? fallback;
  } catch {
    return fallback;
  }
}

export function countryLabel(name: string, locale: Locale): string {
  return displayName("region", countryCodeFromName(name), name, locale);
}

export function languageLabel(name: string, locale: Locale): string {
  return displayName("language", LANGUAGE_CODES[name] ?? null, name, locale);
}

/** Indian states in Hindi (proper nouns, but the everyday Hindi forms). */
const INDIA_STATE_HI: Record<string, string> = {
  "Andhra Pradesh": "आंध्र प्रदेश",
  "Arunachal Pradesh": "अरुणाचल प्रदेश",
  Assam: "असम",
  Bihar: "बिहार",
  Chhattisgarh: "छत्तीसगढ़",
  Goa: "गोवा",
  Gujarat: "गुजरात",
  Haryana: "हरियाणा",
  "Himachal Pradesh": "हिमाचल प्रदेश",
  Jharkhand: "झारखंड",
  Karnataka: "कर्नाटक",
  Kerala: "केरल",
  "Madhya Pradesh": "मध्य प्रदेश",
  Maharashtra: "महाराष्ट्र",
  Manipur: "मणिपुर",
  Meghalaya: "मेघालय",
  Mizoram: "मिज़ोरम",
  Nagaland: "नागालैंड",
  Odisha: "ओडिशा",
  Punjab: "पंजाब",
  Rajasthan: "राजस्थान",
  Sikkim: "सिक्किम",
  "Tamil Nadu": "तमिलनाडु",
  Telangana: "तेलंगाना",
  Tripura: "त्रिपुरा",
  "Uttar Pradesh": "उत्तर प्रदेश",
  Uttarakhand: "उत्तराखंड",
  "West Bengal": "पश्चिम बंगाल",
  "Andaman and Nicobar Islands": "अंडमान और निकोबार द्वीपसमूह",
  Chandigarh: "चंडीगढ़",
  "Dadra and Nagar Haveli and Daman and Diu": "दादरा और नगर हवेली और दमन और दीव",
  Delhi: "दिल्ली",
  "Jammu and Kashmir": "जम्मू और कश्मीर",
  Ladakh: "लद्दाख",
  Lakshadweep: "लक्षद्वीप",
  Puducherry: "पुदुच्चेरी",
};

export function stateLabel(name: string, locale: Locale): string {
  return locale === "hi" ? (INDIA_STATE_HI[name] ?? name) : name;
}

export function useLabels() {
  const { td, locale } = useLocale();
  return useMemo(
    () => ({
      locale,
      label: (group: string, id: string) => td(optionKey(group, id), undefined, id),
      opts: (group: string, ids: readonly string[]): Opt[] =>
        ids.map((id) => ({ id, label: td(optionKey(group, id), undefined, id) })),
      skill: (name: string) => td(`skill.${skillSlug(name)}`, undefined, name),
      skillCategory: (name: string) => td(`skillcat.${skillSlug(name)}`, undefined, name),
      country: (name: string) => countryLabel(name, locale),
      language: (name: string) => languageLabel(name, locale),
      state: (name: string) => stateLabel(name, locale),
    }),
    [td, locale],
  );
}
