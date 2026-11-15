import { describe, expect, it } from "vitest";

import { evidenceKind, hasNumber } from "./number-kind";

describe("estimates and sources", () => {
  it("a number is sourced only when it carries a source URL", () => {
    expect(evidenceKind({ kind: "sourced", source_url: "https://example.com/a" })).toBe("sourced");
    expect(evidenceKind({ kind: null, source_url: "https://example.com/a" })).toBe("sourced");
    expect(evidenceKind({ kind: "sourced", source_url: null })).toBe("estimate");
    expect(evidenceKind({ kind: "sourced", source_url: "  " })).toBe("estimate");
    expect(evidenceKind({ kind: "estimate", source_url: "https://example.com/a" })).toBe(
      "estimate",
    );
  });

  it("finds numbers in English and Hindi text", () => {
    expect(hasNumber("About ₹15,000 a month")).toBe(true);
    expect(hasNumber("लगभग ₹१५,००० महीना")).toBe(true);
    expect(hasNumber("Charge a monthly fee per clinic")).toBe(false);
    expect(hasNumber(null)).toBe(false);
  });
});
