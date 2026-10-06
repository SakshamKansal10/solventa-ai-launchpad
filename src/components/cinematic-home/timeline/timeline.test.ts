import { describe, expect, it } from "vitest";

import {
  buildSceneRanges,
  CORE_ENERGY,
  NODE_ORDER,
  progressOf,
  SCENE_RANGES,
  SCENES,
  sampleKeys,
  sampleTimeline,
  sceneAt,
  TIMELINE_SCROLL_VH,
  type TimelineSample,
} from "./timeline";

describe("scene ranges", () => {
  it("cover 0 → 1 contiguously, in narrative order", () => {
    expect(SCENE_RANGES.map((r) => r.id)).toEqual([
      "chaos",
      "context",
      "possibilities",
      "intelligence",
      "direction",
      "execution",
      "evidence",
      "adaptation",
    ]);
    expect(SCENE_RANGES[0].start).toBe(0);
    expect(SCENE_RANGES[SCENE_RANGES.length - 1].end).toBe(1);
    for (let i = 1; i < SCENE_RANGES.length; i++) {
      expect(SCENE_RANGES[i].start).toBeCloseTo(SCENE_RANGES[i - 1].end, 12);
      expect(SCENE_RANGES[i].end).toBeGreaterThan(SCENE_RANGES[i].start);
    }
  });

  it("are proportional to each scene's scroll length", () => {
    const ranges = buildSceneRanges([
      { id: "chaos", label: "A", lengthVh: 100 },
      { id: "context", label: "B", lengthVh: 300 },
    ]);
    expect(ranges[0].end).toBeCloseTo(0.25);
    expect(ranges[1].start).toBeCloseTo(0.25);
    expect(ranges[1].end).toBe(1);
  });

  it("make the section exactly as long as its scenes", () => {
    expect(TIMELINE_SCROLL_VH).toBe(SCENES.reduce((sum, s) => sum + s.lengthVh, 0));
  });
});

describe("sceneAt", () => {
  it("assigns a boundary to the scene that starts there", () => {
    expect(sceneAt(progressOf("direction"))).toEqual({ index: 4, local: 0 });
    expect(sceneAt(0)).toEqual({ index: 0, local: 0 });
    expect(sceneAt(1)).toEqual({ index: 7, local: 1 });
  });

  it("reports how far through the scene the visitor is", () => {
    expect(sceneAt(progressOf("evidence", 0.25)).local).toBeCloseTo(0.25);
  });

  it("clamps progress outside 0 → 1", () => {
    expect(sceneAt(-3)).toEqual({ index: 0, local: 0 });
    expect(sceneAt(7)).toEqual({ index: 7, local: 1 });
  });

  it("rejects an unknown scene id", () => {
    expect(() => progressOf("nope" as never)).toThrow(/Unknown scene/);
  });
});

describe("sampleKeys", () => {
  const keys = [
    { at: 0.2, value: 1 },
    { at: 0.6, value: 3 },
  ];

  it("passes exactly through each key and holds outside them", () => {
    expect(sampleKeys(keys, 0)).toBe(1);
    expect(sampleKeys(keys, 0.2)).toBe(1);
    expect(sampleKeys(keys, 0.6)).toBe(3);
    expect(sampleKeys(keys, 1)).toBe(3);
  });

  it("eases between keys without overshooting", () => {
    expect(sampleKeys(keys, 0.4)).toBeCloseTo(2);
    let previous = -Infinity;
    for (let p = 0.2; p <= 0.6; p += 0.01) {
      const v = sampleKeys(keys, p);
      expect(v).toBeGreaterThanOrEqual(previous);
      expect(v).toBeLessThanOrEqual(3);
      previous = v;
    }
  });
});

describe("timeline channels", () => {
  it("the core peaks exactly mid-Intelligence and never exceeds 1", () => {
    expect(sampleKeys(CORE_ENERGY, progressOf("intelligence", 0.5))).toBe(1);
    for (let p = 0; p <= 1; p += 0.005) {
      const energy = sampleKeys(CORE_ENERGY, p);
      expect(energy).toBeGreaterThan(0);
      expect(energy).toBeLessThanOrEqual(1);
    }
  });

  it("the node field starts in chaos and is fully ordered by Intelligence", () => {
    expect(sampleKeys(NODE_ORDER, 0)).toBe(0);
    expect(sampleKeys(NODE_ORDER, progressOf("intelligence"))).toBe(1);
    expect(sampleKeys(NODE_ORDER, 1)).toBe(1);
  });

  it("keys are sorted, so every channel is well defined", () => {
    for (const channel of [CORE_ENERGY, NODE_ORDER]) {
      for (let i = 1; i < channel.length; i++) {
        expect(channel[i].at).toBeGreaterThan(channel[i - 1].at);
      }
    }
  });

  it("sampleTimeline writes into the caller's object (no per-frame allocation)", () => {
    const out: TimelineSample = { sceneIndex: 0, sceneLocal: 0, coreEnergy: 0, nodeOrder: 0 };
    const result = sampleTimeline(progressOf("intelligence", 0.5), out);
    expect(result).toBe(out);
    expect(out.sceneIndex).toBe(3);
    expect(out.coreEnergy).toBe(1);
  });
});
