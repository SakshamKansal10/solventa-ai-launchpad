import { describe, expect, it } from "vitest";

import { MESSAGES } from "@/lib/i18n";

import { buildLanguageRule, PLAIN_LANGUAGE_RULE } from "./shared";
import {
  ENGLISH_STYLE_RULE,
  HINDI_STYLE_RULE,
  MAX_SENTENCE_WORDS,
  plainLanguageIssues,
} from "./style";

describe("plain words (go-live step 5)", () => {
  it("the owner's examples pass", () => {
    expect(
      plainLanguageIssues(
        "अंबाला की दुकानों को ऑनलाइन बेचने में मदद करें। पहले 5 दुकानदारों से बात करें।",
        "hi",
      ),
    ).toEqual({ jargon: [], longSentences: [] });
    expect(plainLanguageIssues("Help Ambala shops sell online", "en")).toEqual({
      jargon: [],
      longSentences: [],
    });
  });

  it("catches Sanskrit-heavy Hindi, business jargon and long sentences", () => {
    expect(plainLanguageIssues("उद्यमी को राजस्व का सत्यापन करना चाहिए।", "hi").jargon).toEqual([
      "उद्यमी",
      "सत्यापन",
      "राजस्व",
    ]);
    expect(plainLanguageIssues("Leverage a scalable B2B SaaS model.", "en").jargon).toEqual([
      "SaaS",
      "B2B",
      "leverage",
      "scalable",
    ]);
    const long = Array.from({ length: MAX_SENTENCE_WORDS + 1 }, () => "word").join(" ") + ".";
    expect(plainLanguageIssues(long, "en").longSentences).toHaveLength(1);
  });

  it("every generator gets the one style rule for its language", () => {
    expect(PLAIN_LANGUAGE_RULE).toContain(ENGLISH_STYLE_RULE);
    expect(buildLanguageRule("hi")).toContain(HINDI_STYLE_RULE);
    expect(buildLanguageRule("en")).toBe("");
  });

  it("the product's own words follow the rule, in both languages", () => {
    const problems: string[] = [];
    for (const locale of ["en", "hi"] as const) {
      for (const [key, value] of Object.entries(MESSAGES[locale] as Record<string, string>)) {
        // Legal pages quote laws and terms as written; the rule is for the product's voice.
        if (key.startsWith("legal.") || key.startsWith("terms.") || key.startsWith("privacy."))
          continue;
        // English option labels are the canonical values stored in founders' profiles
        // (normalize-v2): changing one would orphan existing answers.
        if (locale === "en" && key === "opt.scale.national") continue;
        const r = plainLanguageIssues(value, locale);
        if (r.jargon.length) problems.push(`${locale} ${key}: ${r.jargon.join(", ")}`);
        if (r.longSentences.length)
          problems.push(`${locale} ${key}: sentence over ${MAX_SENTENCE_WORDS} words`);
      }
    }
    expect(problems).toEqual([]);
  });
});
