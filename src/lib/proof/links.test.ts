import { describe, expect, it } from "vitest";

import { assumptionStatus, linkMissions, nextAssumptionAction } from "./links";
import { deriveProofState } from "./state";

const assumptions = [
  { id: "a-problem", category: "problem", position: 0 },
  { id: "a-pay", category: "willingness_to_pay", position: 1 },
  { id: "a-problem-2", category: "problem", position: 2 },
];

describe("linkMissions — which mission tests which assumption", () => {
  it("links a mission to the first assumption in its category", () => {
    const links = linkMissions(assumptions, [{ id: "t1", assumption_category: "problem" }], []);
    expect(links.get("t1")).toBe("a-problem");
  });

  it("prefers the assumption evidence from that mission was recorded against", () => {
    const links = linkMissions(
      assumptions,
      [{ id: "t1", assumption_category: "problem" }],
      [{ task_id: "t1", assumption_id: "a-problem-2" }],
    );
    expect(links.get("t1")).toBe("a-problem-2");
  });

  it("links nothing when the mission has no category or no matching assumption", () => {
    const links = linkMissions(
      assumptions,
      [
        { id: "t1", assumption_category: null },
        { id: "t2", assumption_category: "retention" },
      ],
      [{ task_id: "t1", assumption_id: "someone-elses" }],
    );
    expect(links.size).toBe(0);
  });
});

describe("assumptionStatus — evidence decides, missions never validate", () => {
  it("a finished mission with no evidence is still only testing", () => {
    const res = deriveProofState([]);
    expect(assumptionStatus(res.state, true)).toBe("testing");
    expect(assumptionStatus(res.state, false)).toBe("not_tested");
  });

  it("maps evidence states to the founder-facing labels", () => {
    expect(assumptionStatus("mixed", false)).toBe("inconclusive");
    expect(assumptionStatus("weak", false)).toBe("testing");
    expect(assumptionStatus("supported", false)).toBe("supported");
    expect(assumptionStatus("contradicted", true)).toBe("contradicted");
  });

  it("a negative result is recorded as a real outcome, not hidden", () => {
    const ev = ["a", "b", "c"].map((id) => ({
      id,
      signal: "contradicts" as const,
      evidence_type: "interview" as const,
      source_person: id,
      occurred_on: "2026-10-01",
    }));
    expect(assumptionStatus(deriveProofState(ev, 3).state, true)).toBe("contradicted");
  });
});

describe("nextAssumptionAction", () => {
  it("asks for the result of a mission finished without recording anything", () => {
    const action = nextAssumptionAction("testing", { supporters: 0 }, 3, [
      { id: "t1", state: "completed", evidenceCount: 0 },
    ]);
    expect(action).toEqual({ code: "record_mission", missionId: "t1" });
  });

  it("points at the mission that tests it before any evidence exists", () => {
    expect(
      nextAssumptionAction("not_tested", { supporters: 0 }, 3, [
        { id: "t1", state: "not_started", evidenceCount: 0 },
      ]),
    ).toEqual({ code: "start_mission", missionId: "t1" });
    expect(nextAssumptionAction("not_tested", { supporters: 0 }, 3, [])).toEqual({
      code: "run_test",
    });
  });

  it("counts how many independent results are still needed", () => {
    expect(nextAssumptionAction("testing", { supporters: 1 }, 3, [])).toEqual({
      code: "more_evidence",
      n: 2,
    });
  });

  it("settled assumptions say what that means", () => {
    expect(nextAssumptionAction("supported", { supporters: 3 }, 3, []).code).toBe("build_on");
    expect(nextAssumptionAction("contradicted", { supporters: 0 }, 3, []).code).toBe("reconsider");
    expect(nextAssumptionAction("inconclusive", { supporters: 1 }, 3, []).code).toBe("resolve");
  });
});
