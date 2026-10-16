import { describe, it, expect } from "vitest";

import {
  canCloseWeek,
  deriveRoadmapState,
  deriveWeekState,
  globalWeekNumbers,
  isGenerationLockFresh,
  missionProgress,
  missionStateFromDb,
  missionStateToDb,
  missionSteps,
  phaseRanges,
  type DbTaskStatus,
} from "@/lib/roadmap/state";

const m = (status: DbTaskStatus, required = true) => ({ status, required });

describe("mission state", () => {
  it("maps the DB statuses both ways, treating legacy 'blocked' as startable", () => {
    expect(missionStateFromDb("pending")).toBe("not_started");
    expect(missionStateFromDb("in_progress")).toBe("in_progress");
    expect(missionStateFromDb("done")).toBe("completed");
    expect(missionStateFromDb("blocked")).toBe("not_started");
    expect(missionStateToDb("completed")).toBe("done");
    expect(missionStateToDb("not_started")).toBe("pending");
  });
});

describe("week state", () => {
  const active = (over = {}) => ({ status: "active" as const, hasDetail: true, ...over });

  it("locked and completed weeks are terminal for the derivation", () => {
    expect(deriveWeekState({ status: "locked", hasDetail: false }, [])).toBe("locked");
    expect(deriveWeekState({ status: "completed", hasDetail: true }, [m("done")])).toBe(
      "completed",
    );
  });

  it("an active week with no detail yet is generating_next (regardless of missions)", () => {
    expect(deriveWeekState({ status: "active", hasDetail: false }, [])).toBe("generating_next");
  });

  it("walks ready → in_progress → ready_to_close from real mission statuses", () => {
    expect(deriveWeekState(active(), [m("pending"), m("pending")])).toBe("ready");
    expect(deriveWeekState(active(), [m("in_progress"), m("pending")])).toBe("in_progress");
    expect(deriveWeekState(active(), [m("done"), m("pending")])).toBe("in_progress");
    expect(deriveWeekState(active(), [m("done"), m("done")])).toBe("ready_to_close");
  });

  it("optional missions never block closing the week", () => {
    const missions = [m("done", true), m("pending", false)];
    expect(canCloseWeek(missions)).toBe(true);
    expect(deriveWeekState(active(), missions)).toBe("ready_to_close");
  });

  it("a week with only optional missions closes when all are done", () => {
    expect(canCloseWeek([m("done", false), m("pending", false)])).toBe(false);
    expect(canCloseWeek([m("done", false), m("done", false)])).toBe(true);
    expect(canCloseWeek([])).toBe(false);
  });

  it("counts progress separately for required missions", () => {
    expect(missionProgress([m("done"), m("pending"), m("done", false)])).toEqual({
      total: 3,
      completed: 2,
      requiredTotal: 2,
      requiredCompleted: 1,
      started: 2,
    });
  });
});

describe("roadmap state + generation lock", () => {
  it("maps DB statuses; archived/available read as active data", () => {
    expect(deriveRoadmapState("building")).toBe("building");
    expect(deriveRoadmapState("failed")).toBe("failed");
    expect(deriveRoadmapState("completed")).toBe("completed");
    expect(deriveRoadmapState("active")).toBe("active");
  });

  it("only trusts a lock while it is fresh, so a dead request cannot wedge a week", () => {
    const now = Date.parse("2026-03-01T10:00:00Z");
    expect(isGenerationLockFresh("2026-03-01T09:59:00Z", now)).toBe(true);
    expect(isGenerationLockFresh("2026-03-01T09:50:00Z", now)).toBe(false);
    expect(isGenerationLockFresh(null, now)).toBe(false);
  });
});

describe("global week numbering (week_number is only phase-relative in old data)", () => {
  const phases = [
    {
      id: "p2",
      order_index: 1,
      roadmap_weeks: [
        { id: "w3", order_index: 0 },
        { id: "w4", order_index: 1 },
      ],
    },
    {
      id: "p1",
      order_index: 0,
      roadmap_weeks: [
        { id: "w2", order_index: 1 },
        { id: "w1", order_index: 0 },
      ],
    },
  ];
  it("numbers weeks across phases in order regardless of input order", () => {
    const n = globalWeekNumbers(phases);
    expect([n.get("w1"), n.get("w2"), n.get("w3"), n.get("w4")]).toEqual([1, 2, 3, 4]);
  });
  it("derives 'Weeks a–b' ranges per phase", () => {
    const r = phaseRanges(phases);
    expect(r.get("p1")).toEqual({ first: 1, last: 2 });
    expect(r.get("p2")).toEqual({ first: 3, last: 4 });
  });
});

describe("mission bullets", () => {
  it("prefers structured steps, capped at four", () => {
    expect(missionSteps(["a", "b", "c", "d", "e"], "ignored")).toEqual(["a", "b", "c", "d"]);
  });
  it("falls back to numbered items, then sentences, in old rows", () => {
    expect(missionSteps(null, "1. Find people 2. Ask questions 3. Note answers")).toEqual([
      "Find people",
      "Ask questions",
      "Note answers",
    ]);
    expect(
      missionSteps(undefined, "Call five clinics. Ask the same questions. Write it down."),
    ).toEqual(["Call five clinics.", "Ask the same questions.", "Write it down."]);
    expect(missionSteps(null, "Just one instruction")).toEqual(["Just one instruction"]);
    expect(missionSteps(null, "")).toEqual([]);
  });
});
