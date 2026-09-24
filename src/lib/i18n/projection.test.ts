import { describe, it, expect } from "vitest";

import {
  alreadyInLocale,
  applyTranslations,
  collectStrings,
  hashInput,
  isTranslatable,
  validateTranslations,
  type Json,
} from "@/lib/i18n/projection";

const projection: Json = {
  title: "Revenue OS for Clinics",
  count: 5,
  when: "2026-03-04",
  link: "https://example.com/a",
  whyFit: ["Your ₹5 lakh budget fits a 90-day pilot", "You already know 12 clinic owners"],
  nested: { empty: "  ", note: "Pay ₹1,500/month" },
};

describe("projection helpers", () => {
  it("only sends real prose — not numbers, dates, urls or blanks", () => {
    expect(isTranslatable("Revenue OS")).toBe(true);
    expect(isTranslatable("2026-03-04")).toBe(false);
    expect(isTranslatable("12")).toBe(false);
    expect(isTranslatable("https://example.com")).toBe(false);
    expect(isTranslatable("   ")).toBe(false);
    expect(collectStrings(projection)).toEqual([
      "Revenue OS for Clinics",
      "Your ₹5 lakh budget fits a 90-day pilot",
      "You already know 12 clinic owners",
      "Pay ₹1,500/month",
    ]);
  });

  it("rebuilds the SAME shape with translations substituted in order", () => {
    const strings = collectStrings(projection);
    const hi = strings.map((s) => `hi:${s}`);
    const out = applyTranslations(projection, hi) as Record<string, unknown>;
    expect(out.title).toBe("hi:Revenue OS for Clinics");
    expect(out.count).toBe(5);
    expect(out.when).toBe("2026-03-04");
    expect(out.link).toBe("https://example.com/a");
    expect((out.nested as Record<string, string>).empty).toBe("  ");
    expect(Object.keys(out)).toEqual(Object.keys(projection as object));
  });

  it("refuses a count mismatch instead of silently mis-aligning fields", () => {
    expect(() => applyTranslations(projection, ["only one"])).toThrow(/mismatch/);
  });

  it("accepts a translation that keeps the numbers, including Devanagari digits", () => {
    expect(validateTranslations(["Budget ₹5 lakh, 90 days"], ["बजट ₹5 लाख, 90 दिन"])).toBe(true);
    expect(validateTranslations(["Budget 90 days"], ["बजट ९० दिन"])).toBe(true);
  });

  it("rejects translations that change, drop or invent numbers, or return blanks", () => {
    expect(validateTranslations(["Budget ₹5 lakh"], ["बजट ₹6 लाख"])).toBe(false);
    expect(validateTranslations(["12 clinics"], ["कुछ क्लीनिक"])).toBe(false);
    expect(validateTranslations(["Hello"], ["  "])).toBe(false);
    expect(validateTranslations(["a", "b"], ["x"])).toBe(false);
    expect(validateTranslations(["a"], "nope")).toBe(false);
  });

  it("does nothing when the content is already in the reader's language", () => {
    expect(alreadyInLocale(["आपका बिज़नेस तैयार है"], "hi")).toBe(true);
    expect(alreadyInLocale(["Your business is ready"], "hi")).toBe(false);
    expect(alreadyInLocale(["Your business is ready"], "en")).toBe(true);
    expect(alreadyInLocale([], "hi")).toBe(true);
  });

  it("hash input differs by target language so hi and en caches never collide", () => {
    expect(hashInput(["a"], "hi")).not.toBe(hashInput(["a"], "en"));
    expect(hashInput(["a"], "hi")).toBe(hashInput(["a"], "hi"));
  });
});
