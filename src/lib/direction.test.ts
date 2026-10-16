import { describe, it, expect } from "vitest";

import {
  resolveDirection,
  type DirectionInput,
  type DirectionOpportunity,
  type DirectionRoadmap,
} from "@/lib/direction";

const opp = (over: Partial<DirectionOpportunity> & { id: string }): DirectionOpportunity => ({
  business_dna_id: "dna-new",
  status: "active",
  fit_score: 70,
  opportunity_index: null,
  batch_number: 1,
  created_at: "2026-02-01T00:00:00Z",
  ...over,
});
const rm = (
  over: Partial<DirectionRoadmap> & { id: string; opportunity_id: string },
): DirectionRoadmap => ({
  status: "active",
  ...over,
});

const base = (over: Partial<DirectionInput> = {}): DirectionInput => ({
  consultations: [
    { id: "dna-old", created_at: "2026-01-01T00:00:00Z" },
    { id: "dna-new", created_at: "2026-02-01T00:00:00Z" },
  ],
  opportunities: [],
  roadmaps: [],
  activePointer: { opportunityId: null, setAt: null },
  ...over,
});

describe("resolveDirection", () => {
  it("no consultation → no_consultation", () => {
    expect(resolveDirection(base({ consultations: [] })).stage).toBe("no_consultation");
  });

  it("State A: ideas ready, nothing selected → the AI's flagship plus two alternatives", () => {
    const d = resolveDirection(
      base({
        opportunities: [
          opp({ id: "a", fit_score: 95, opportunity_index: 1 }),
          opp({ id: "flagship", fit_score: 60, opportunity_index: 0 }),
          opp({ id: "c", fit_score: 80, opportunity_index: 2 }),
        ],
      }),
    );
    expect(d.stage).toBe("ideas_ready");
    expect(d.flagshipId).toBe("flagship"); // designated flagship beats a higher fit_score
    expect(d.alternativeIds).toEqual(["a", "c"]); // then by fit_score
  });

  it("State B: selected but no roadmap, and archived roadmap is reported for 'resume'", () => {
    const d = resolveDirection(
      base({
        opportunities: [opp({ id: "a", status: "selected" }), opp({ id: "b" })],
        roadmaps: [rm({ id: "r", opportunity_id: "a", status: "archived" })],
      }),
    );
    expect(d.stage).toBe("direction_selected");
    expect(d.selectedId).toBe("a");
    expect(d.roadmap).toBeNull();
    expect(d.hasArchivedRoadmap).toBe(true);
  });

  it("State C: roadmap lifecycle maps to stages", () => {
    const stage = (status: DirectionRoadmap["status"]) =>
      resolveDirection(
        base({
          opportunities: [opp({ id: "a", status: "selected" })],
          roadmaps: [rm({ id: "r", opportunity_id: "a", status })],
        }),
      ).stage;
    expect(stage("building")).toBe("roadmap_building");
    expect(stage("failed")).toBe("roadmap_failed");
    expect(stage("active")).toBe("roadmap_active");
    expect(stage("completed")).toBe("roadmap_completed");
  });

  it("REGRESSION: an old consultation's selection/roadmap never replaces the newest consultation", () => {
    const d = resolveDirection(
      base({
        opportunities: [
          opp({ id: "old-selected", business_dna_id: "dna-old", status: "selected" }),
          opp({ id: "new-1", opportunity_index: 0 }),
          opp({ id: "new-2", opportunity_index: 1 }),
        ],
        roadmaps: [rm({ id: "r", opportunity_id: "old-selected", status: "active" })],
      }),
    );
    expect(d.consultationId).toBe("dna-new");
    expect(d.stage).toBe("ideas_ready");
    expect(d.selectedId).toBeNull();
    expect(d.roadmap).toBeNull();
    expect(d.viewedIds).not.toContain("old-selected");
  });

  it("an explicit Restore made AFTER the latest consultation makes the old direction current", () => {
    const d = resolveDirection(
      base({
        opportunities: [
          opp({ id: "old-selected", business_dna_id: "dna-old", status: "selected" }),
          opp({ id: "new-1" }),
        ],
        roadmaps: [rm({ id: "r", opportunity_id: "old-selected", status: "active" })],
        activePointer: { opportunityId: "old-selected", setAt: "2026-02-05T00:00:00Z" },
      }),
    );
    expect(d.consultationId).toBe("dna-old");
    expect(d.isLatestConsultation).toBe(false);
    expect(d.stage).toBe("roadmap_active");
  });

  it("a Restore that is OLDER than the latest consultation is ignored", () => {
    const d = resolveDirection(
      base({
        opportunities: [
          opp({ id: "old-selected", business_dna_id: "dna-old", status: "selected" }),
          opp({ id: "new-1" }),
        ],
        activePointer: { opportunityId: "old-selected", setAt: "2026-01-15T00:00:00Z" },
      }),
    );
    expect(d.consultationId).toBe("dna-new");
    expect(d.stage).toBe("ideas_ready");
  });

  it("a deep link can pin an older consultation; an unknown id is ignored", () => {
    const opportunities = [opp({ id: "old-1", business_dna_id: "dna-old" }), opp({ id: "new-1" })];
    expect(
      resolveDirection(base({ opportunities, pinnedConsultationId: "dna-old" })).consultationId,
    ).toBe("dna-old");
    expect(
      resolveDirection(base({ opportunities, pinnedConsultationId: "nope" })).consultationId,
    ).toBe("dna-new");
  });

  it("dismissed ideas never appear as flagship or alternatives", () => {
    const d = resolveDirection(
      base({
        opportunities: [
          opp({ id: "gone", status: "dismissed", opportunity_index: 0, fit_score: 99 }),
          opp({ id: "a", fit_score: 70 }),
        ],
      }),
    );
    expect(d.flagshipId).toBe("a");
  });
});
