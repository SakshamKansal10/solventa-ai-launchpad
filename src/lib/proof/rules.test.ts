import { describe, expect, it } from "vitest";

import type { MissionEntry } from "@/lib/missions/workspace";
import { deriveRuleStatus, readSuccessRule } from "./rules";

const log = (answer: "yes" | "no" | "unsure", i: number): MissionEntry => ({
  id: String(i),
  kind: "interview",
  data: { answer },
  createdAt: "",
});
const rule = {
  metric: "interviews.answer" as const,
  equals: "yes" as const,
  threshold: 3,
  outOf: 4,
};

describe("proof status from a success rule", () => {
  it("nothing logged is not checked yet; some logs are checking", () => {
    expect(deriveRuleStatus(rule, []).status).toBe("not_tested");
    expect(deriveRuleStatus(rule, [log("yes", 1)]).status).toBe("testing");
  });

  it("supported once the threshold is reached", () => {
    const r = deriveRuleStatus(rule, [log("yes", 1), log("yes", 2), log("yes", 3)]);
    expect(r).toMatchObject({ status: "supported", logged: 3, matching: 3 });
  });

  it("not supported as soon as the threshold can no longer be reached", () => {
    expect(deriveRuleStatus(rule, [log("no", 1), log("no", 2)]).status).toBe("contradicted");
    expect(deriveRuleStatus(rule, [log("no", 1), log("yes", 2)]).status).toBe("testing");
  });

  it("unclear when everything is logged and mostly 'not sure'", () => {
    const r = deriveRuleStatus(rule, [
      log("unsure", 1),
      log("unsure", 2),
      log("unsure", 3),
      log("yes", 4),
    ]);
    expect(r.status).toBe("inconclusive");
  });

  it("rejects a rule whose threshold exceeds its total", () => {
    expect(readSuccessRule({ ...rule, threshold: 5 })).toBeNull();
    expect(readSuccessRule(rule)).toEqual(rule);
  });
});
