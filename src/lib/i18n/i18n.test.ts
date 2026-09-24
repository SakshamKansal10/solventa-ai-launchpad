import { describe, it, expect } from "vitest";

import { MESSAGES, translate, translatePlural } from "@/lib/i18n";
import {
  detectContentLocale,
  readLocaleFromCookieString,
  buildLocaleCookie,
} from "@/lib/i18n/locale";
import {
  ACCESS_IDS,
  COMMITMENT_IDS,
  CONSTRAINT_IDS,
  DOMAIN_IDS,
  EDUCATION_IDS,
  EXECUTION_IDS,
  HOPE_IDS,
  HORIZON_IDS,
  HOURS_IDS,
  INTEREST_IDS,
  MAJOR_IDS,
  REFUSE_IDS,
  RELOCATION_IDS,
  RISK_IDS,
  ROLE_IDS,
  SCALE_IDS,
  skillSlug,
  STATUS_IDS,
  STUDY_YEAR_IDS,
  TEAM_IDS,
} from "@/lib/consultation/options";
import { TEAM_SIZE_IDS } from "@/lib/consultation/brackets";
import { SKILL_CATEGORIES } from "@/lib/onboarding-types";

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

describe("i18n catalogues", () => {
  it("every English key has a Hindi translation and vice-versa", () => {
    const en = Object.keys(MESSAGES.en).sort();
    const hi = Object.keys(MESSAGES.hi).sort();
    expect(hi).toEqual(en);
  });

  it("Hindi strings are never blank and keep the same {placeholders}", () => {
    for (const key of Object.keys(MESSAGES.en)) {
      const hi = MESSAGES.hi[key];
      expect(hi, key).toBeTruthy();
      expect(placeholders(hi), `placeholders of ${key}`).toBe(placeholders(MESSAGES.en[key]));
    }
  });

  it("no Hindi value is a leaked English sentence (allow-listed brand/technical terms aside)", () => {
    const allowed = new Set([
      "SEO",
      "English",
      "VALIDATE • BUILD • ELEVATE",
      "Solventia Intelligence",
      "hero.headline3",
    ]);
    const leaked = Object.keys(MESSAGES.en).filter((k) => {
      const en = MESSAGES.en[k];
      const hi = MESSAGES.hi[k];
      if (allowed.has(hi)) return false;
      // A Hindi value with no Devanagari at all and >2 English words is a leak.
      return hi === en && /[A-Za-z]{3,}\s+[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(hi);
    });
    expect(leaked).toEqual([]);
  });
});

describe("consultation options have labels in both languages", () => {
  const groups: Record<string, readonly string[]> = {
    status: STATUS_IDS,
    education: EDUCATION_IDS,
    study_year: STUDY_YEAR_IDS,
    hours: HOURS_IDS,
    major: MAJOR_IDS,
    domains: DOMAIN_IDS,
    execution: EXECUTION_IDS,
    access: ACCESS_IDS,
    team_size: TEAM_SIZE_IDS,
    risk: RISK_IDS,
    roles: ROLE_IDS,
    team: TEAM_IDS,
    commitment: COMMITMENT_IDS,
    interests: INTEREST_IDS,
    refuse: REFUSE_IDS,
    relocation: RELOCATION_IDS,
    constraints: CONSTRAINT_IDS,
    scale: SCALE_IDS,
    horizon: HORIZON_IDS,
    hope: HOPE_IDS,
  };
  for (const [group, ids] of Object.entries(groups)) {
    it(`opt.${group}.* covers every id`, () => {
      for (const id of ids) {
        expect(MESSAGES.en[`opt.${group}.${id}`], `en opt.${group}.${id}`).toBeTruthy();
        expect(MESSAGES.hi[`opt.${group}.${id}`], `hi opt.${group}.${id}`).toBeTruthy();
      }
    });
  }

  it("every library skill and category has a translation", () => {
    for (const cat of SKILL_CATEGORIES) {
      expect(MESSAGES.hi[`skillcat.${skillSlug(cat.label)}`], cat.label).toBeTruthy();
      for (const skill of cat.skills) {
        expect(MESSAGES.hi[`skill.${skillSlug(skill)}`], skill).toBeTruthy();
      }
    }
  });
});

describe("translate()", () => {
  it("interpolates params and falls back to English, then the key", () => {
    expect(translate("en", "common.weekN", { n: 3 })).toBe("Week 3");
    expect(translate("hi", "common.weekN", { n: 3 })).toBe("सप्ताह 3");
    expect(translate("hi", "totally.unknown.key")).toBe("totally.unknown.key");
  });

  it("selects plural forms", () => {
    expect(translatePlural("en", "consult.panel.skillsCount", 1)).toBe("1 skill");
    expect(translatePlural("en", "consult.panel.skillsCount", 4)).toBe("4 skills");
    expect(translatePlural("hi", "consult.panel.skillsCount", 4)).toBe("4 कौशल");
  });
});

describe("locale helpers", () => {
  it("round-trips the locale cookie and ignores garbage", () => {
    expect(readLocaleFromCookieString(buildLocaleCookie("hi").split(";")[0])).toBe("hi");
    expect(readLocaleFromCookieString("a=1; solventia-locale=fr; b=2")).toBeNull();
    expect(readLocaleFromCookieString("a=1; solventia-locale=en")).toBe("en");
    expect(readLocaleFromCookieString(undefined)).toBeNull();
  });

  it("detects which language stored AI prose is written in", () => {
    expect(detectContentLocale(["A subscription tool for clinics"])).toBe("en");
    expect(detectContentLocale(["क्लीनिक के लिए सब्सक्रिप्शन टूल जो समय बचाता है"])).toBe("hi");
    // Hindi that keeps a few English business terms is still Hindi.
    expect(detectContentLocale(["आपका SaaS बिज़नेस ग्राहकों को हर महीने बिल भेजता है"])).toBe("hi");
    expect(detectContentLocale(["12345", "—"])).toBe("en");
  });
});
