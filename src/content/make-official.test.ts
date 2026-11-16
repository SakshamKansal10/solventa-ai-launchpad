import { describe, expect, it } from "vitest";

import { isStepNeeded, isStepPublished, MINOR_NOTE, OFFICIAL_STEPS } from "./make-official";

const GOV = /^https:\/\/(www\.)?[a-z0-9.-]+\.(gov\.in|nic\.in)\/|^https:\/\/www\.rbi\.org\.in\//;

describe("Make it official content", () => {
  it("covers structure, Udyam, a current account and GST, in English and Hindi", () => {
    expect(OFFICIAL_STEPS.map((s) => s.id)).toEqual(["structure", "udyam", "bank", "gst"]);
    for (const s of OFFICIAL_STEPS) {
      for (const locale of ["en", "hi"] as const) {
        const t = s.text[locale];
        expect(t.title && t.summary && t.when).toBeTruthy();
        expect(t.documents.length).toBeGreaterThan(0);
        expect(t.steps.length).toBeGreaterThan(1);
      }
      expect(s.text.hi.steps).toHaveLength(s.text.en.steps.length);
      expect(s.text.hi.documents).toHaveLength(s.text.en.documents.length);
    }
  });

  it("links to official government sites only, and cites a page for every rule", () => {
    for (const s of OFFICIAL_STEPS) {
      expect(s.officialUrl).toMatch(GOV);
      expect(s.sources.length).toBeGreaterThan(0);
      for (const src of s.sources) expect(src.url).toMatch(GOV);
    }
    for (const src of MINOR_NOTE.sources) expect(src.url).toMatch(GOV);
  });

  it("shows nothing unreviewed: a step is published only when reviewed and dated", () => {
    expect(isStepPublished({ reviewed: false, lastChecked: null })).toBe(false);
    expect(isStepPublished({ reviewed: true, lastChecked: null })).toBe(false);
    expect(isStepPublished({ reviewed: true, lastChecked: "2026-12-01" })).toBe(true);
    // The draft ships unreviewed; the owner signs each step off.
    for (const s of OFFICIAL_STEPS) {
      if (!s.reviewed) expect(s.sources.every((x) => x.needsOwnerReview)).toBe(true);
    }
  });

  it("unlocks by phase: not needed before the roadmap reaches it", () => {
    const udyam = { neededFrom: "build" as const };
    expect(isStepNeeded(udyam, null)).toBe(false);
    expect(isStepNeeded(udyam, "validate")).toBe(false);
    expect(isStepNeeded(udyam, "build")).toBe(true);
    expect(isStepNeeded(udyam, "improve")).toBe(true);
  });
});
