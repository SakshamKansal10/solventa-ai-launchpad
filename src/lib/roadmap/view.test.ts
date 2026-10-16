import { describe, it, expect } from "vitest";

import { buildRoadmapView, type RawPhase, type RawTask, type RawWeek } from "@/lib/roadmap/view";

const task = (over: Partial<RawTask> & { id: string }): RawTask => ({
  order_index: 0,
  what: "Mission",
  why: "why",
  how: "Do this. Then that.",
  steps: null,
  time_estimate: "~2 hrs",
  deadline: null,
  done_when: "done",
  required: true,
  evidence_required: false,
  assumption_category: null,
  status: "pending",
  ...over,
});

const week = (over: Partial<RawWeek> & { id: string }): RawWeek => ({
  order_index: 0,
  title: "Week",
  objective: "obj",
  status: "locked",
  mission: null,
  mistakes_to_avoid: null,
  evidence_required: null,
  success_threshold: null,
  evidence_target: null,
  adaptation_note: null,
  generation_status: null,
  generation_error: null,
  reflection_outcome: null,
  reflection_blocker: null,
  reflection_note: null,
  founder_reflection: null,
  closed_at: null,
  unlocked_at: null,
  roadmap_tasks: [],
  ...over,
});

const phases = (): RawPhase[] => [
  {
    id: "p1",
    order_index: 0,
    key: "validate",
    title: "Validate the problem",
    description: null,
    roadmap_weeks: [
      week({
        id: "w1",
        order_index: 0,
        status: "completed",
        mission: "m",
        roadmap_tasks: [task({ id: "t1", status: "done" })],
      }),
      week({
        id: "w2",
        order_index: 1,
        status: "active",
        mission: "Prove pricing",
        adaptation_note:
          "Week 2 focuses on pricing because 5 interviews repeated the same problem.",
        roadmap_tasks: [
          task({ id: "t2", order_index: 0, status: "done" }),
          task({ id: "t3", order_index: 1, status: "in_progress", evidence_required: true }),
        ],
      }),
    ],
  },
  {
    id: "p2",
    order_index: 1,
    key: "build",
    title: "Build the offer",
    description: null,
    roadmap_weeks: [week({ id: "w3", order_index: 0 }), week({ id: "w4", order_index: 1 })],
  },
];

const base = {
  roadmap: {
    id: "r",
    opportunity_id: "o",
    status: "active",
    north_star: "Serve 20 clinics",
    build_error: null,
    activated_at: null,
  },
};

describe("buildRoadmapView", () => {
  it("derives states from real rows and numbers weeks across phases", () => {
    const v = buildRoadmapView({
      ...base,
      opportunityTitle: "Clinic Revenue OS",
      phases: phases(),
      evidence: [],
    });
    expect(v.weeks.map((w) => [w.number, w.state])).toEqual([
      [1, "completed"],
      [2, "in_progress"],
      [3, "locked"],
      [4, "locked"],
    ]);
    expect(v.currentWeekId).toBe("w2");
    expect(v.roadmap.status).toBe("active");
    expect(v.totals).toMatchObject({ weeks: 4, completedWeeks: 1, missionsCompleted: 2 });
  });

  it("phase states: completed / current / future, with 'Weeks a–b' ranges", () => {
    const v = buildRoadmapView({ ...base, opportunityTitle: "X", phases: phases(), evidence: [] });
    expect(v.phases.map((p) => p.state)).toEqual(["current", "future"]);
    expect(v.phases[0].range).toEqual({ first: 1, last: 2 });
    expect(v.phases[1].range).toEqual({ first: 3, last: 4 });
  });

  it("locked future weeks carry no mission detail (JIT: nothing is pre-generated)", () => {
    const v = buildRoadmapView({ ...base, opportunityTitle: "X", phases: phases(), evidence: [] });
    const w3 = v.weeks.find((w) => w.id === "w3")!;
    expect(w3.missions).toHaveLength(0);
    expect(w3.hasDetail).toBe(false);
  });

  it("surfaces the adaptation note and per-week / per-mission evidence counts", () => {
    const v = buildRoadmapView({
      ...base,
      opportunityTitle: "X",
      phases: phases(),
      evidence: [
        { week_id: "w2", task_id: "t3" },
        { week_id: "w2", task_id: null },
        { week_id: "w1", task_id: "t1" },
      ],
    });
    const w2 = v.weeks.find((w) => w.id === "w2")!;
    expect(w2.adaptationNote).toMatch(/pricing/);
    expect(w2.evidenceCount).toBe(2);
    expect(w2.missions.find((m) => m.id === "t3")!.evidenceCount).toBe(1);
    expect(w2.missions.find((m) => m.id === "t3")!.evidenceRequired).toBe(true);
    expect(v.totals.evidence).toBe(3);
  });

  it("an active week without detail is generating_next, and exposes its failure", () => {
    const p = phases();
    p[0].roadmap_weeks[1] = week({
      id: "w2",
      order_index: 1,
      status: "active",
      generation_status: "failed",
      generation_error: "Gemini request failed",
    });
    const v = buildRoadmapView({ ...base, opportunityTitle: "X", phases: p, evidence: [] });
    const w2 = v.weeks.find((w) => w.id === "w2")!;
    expect(w2.state).toBe("generating_next");
    expect(w2.generationStatus).toBe("failed");
    expect(w2.generationError).toMatch(/Gemini/);
  });

  it("reaches ready_to_close only when every required mission is done", () => {
    const p = phases();
    p[0].roadmap_weeks[1].roadmap_tasks = [
      task({ id: "t2", order_index: 0, status: "done" }),
      task({ id: "t3", order_index: 1, status: "done" }),
    ];
    const v = buildRoadmapView({ ...base, opportunityTitle: "X", phases: p, evidence: [] });
    expect(v.weeks.find((w) => w.id === "w2")!.state).toBe("ready_to_close");
  });

  it("falls back to structured bullets from `how` for older missions", () => {
    const v = buildRoadmapView({ ...base, opportunityTitle: "X", phases: phases(), evidence: [] });
    expect(v.weeks.find((w) => w.id === "w2")!.missions[0].steps).toEqual([
      "Do this.",
      "Then that.",
    ]);
  });
});

import { applyMissionState } from "@/lib/roadmap/view";

describe("applyMissionState (optimistic update)", () => {
  it("moves a week to ready_to_close when its last required mission completes, and back again", () => {
    const p = phases();
    p[0].roadmap_weeks[1].roadmap_tasks = [
      task({ id: "t2", order_index: 0, status: "done" }),
      task({ id: "t3", order_index: 1, status: "in_progress" }),
    ];
    const v = buildRoadmapView({ ...base, opportunityTitle: "X", phases: p, evidence: [] });
    expect(v.weeks.find((w) => w.id === "w2")!.state).toBe("in_progress");

    const done = applyMissionState(v, "t3", "completed");
    const w2 = done.weeks.find((w) => w.id === "w2")!;
    expect(w2.state).toBe("ready_to_close");
    expect(w2.progress.completed).toBe(2);
    expect(done.totals.missionsCompleted).toBe(3);

    const back = applyMissionState(done, "t3", "not_started");
    expect(back.weeks.find((w) => w.id === "w2")!.state).toBe("in_progress");
    // The original view is never mutated.
    expect(v.weeks.find((w) => w.id === "w2")!.progress.completed).toBe(1);
  });
});
