import { describe, expect, it } from "vitest";

import { initialsFor } from "./auth";

describe("initialsFor", () => {
  it("uses the first letters of the first two words of the name", () => {
    expect(initialsFor("Asha Verma", null)).toBe("AV");
    expect(initialsFor("  Saksham   Kansal ", null)).toBe("SK");
  });

  it("does not treat the letter s as a word separator", () => {
    // Regression: the separator class once contained a literal "s", so
    // "Asha Verma" was split inside "Asha" and produced "AH".
    expect(initialsFor("Asha Verma", "x@example.com")).toBe("AV");
    expect(initialsFor("Sushma", null)).toBe("SU");
  });

  it("falls back to the email name, then to S", () => {
    expect(initialsFor(null, "first.last@example.com")).toBe("FL");
    expect(initialsFor(null, "solo@example.com")).toBe("SO");
    expect(initialsFor(null, null)).toBe("S");
  });
});
