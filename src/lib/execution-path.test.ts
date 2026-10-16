import { describe, expect, it } from "vitest";

import { buildPath, statusOf } from "@/lib/execution-path";
import type { ProofState } from "@/lib/proof/state";

const a = (category: string, state: ProofState) => ({ category, state });

describe("statusOf", () => {
  it("says nothing is mapped when there are no assumptions", () => {
    expect(statusOf([])).toBe("none");
  });
  it("treats any contradiction as contradicted, even beside supported evidence", () => {
    expect(statusOf(["supported", "contradicted"])).toBe("contradicted");
  });
  it("is completed only when every assumption is supported", () => {
    expect(statusOf(["supported", "supported"])).toBe("completed");
    expect(statusOf(["supported", "weak"])).toBe("testing");
  });
  it("is untested only when nothing has any evidence", () => {
    expect(statusOf(["untested", "untested"])).toBe("untested");
    expect(statusOf(["untested", "mixed"])).toBe("testing");
  });
});

describe("buildPath", () => {
  it("always has seven stops, with the direction completed", () => {
    const { stops, currentIndex } = buildPath([]);
    expect(stops.map((s) => s.id)).toEqual([
      "direction",
      "problem",
      "payment",
      "offer",
      "delivery",
      "repeatability",
      "growth",
    ]);
    expect(stops[0].status).toBe("completed");
    expect(currentIndex).toBe(1);
  });

  it("maps real assumption categories onto stops", () => {
    const { stops } = buildPath([
      a("problem", "supported"),
      a("willingness_to_pay", "contradicted"),
      a("pricing", "untested"),
      a("distribution", "weak"),
    ]);
    const byId = Object.fromEntries(stops.map((s) => [s.id, s]));
    expect(byId.problem.status).toBe("completed");
    expect(byId.payment.status).toBe("contradicted");
    expect(byId.payment.items).toHaveLength(2);
    expect(byId.growth.status).toBe("testing");
    expect(byId.delivery.status).toBe("none");
  });

  it("puts 'you are here' on the first stop that is not yet supported", () => {
    const { currentIndex } = buildPath([
      a("problem", "supported"),
      a("willingness_to_pay", "weak"),
    ]);
    expect(currentIndex).toBe(2);
  });

  it("has no current stop once every stop is supported", () => {
    const all = [
      "problem",
      "willingness_to_pay",
      "competition",
      "delivery",
      "retention",
      "distribution",
    ].map((c) => a(c, "supported"));
    expect(buildPath(all).currentIndex).toBe(-1);
  });
});
