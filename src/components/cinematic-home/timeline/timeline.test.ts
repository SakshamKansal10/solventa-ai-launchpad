import { describe, expect, it } from "vitest";

import {
  between,
  buildSceneRanges,
  k,
  local,
  progressOf,
  ramp,
  SCENE_RANGES,
  SCENES,
  sampleKeys,
  sceneAt,
  TIMELINE_SCROLL_VH,
} from "./timeline";

describe("scene ranges", () => {
  it("run the whole story in order and cover 0 → 1 without gaps", () => {
    expect(SCENE_RANGES.map((r) => r.id)).toEqual([
      "void",
      "awakening",
      "context",
      "passage",
      "universe",
      "computation",
      "convergence",
      "three",
      "selection",
      "unfold",
      "validate",
      "build",
      "elevate",
      "evidence",
      "crisis",
      "adaptation",
      "handoff",
      "product",
      "connected",
      "return",
      "finale",
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
      { id: "void", label: "A", lengthVh: 100 },
      { id: "awakening", label: "B", lengthVh: 300 },
    ]);
    expect(ranges[0].end).toBeCloseTo(0.25);
    expect(ranges[1].end).toBe(1);
    expect(TIMELINE_SCROLL_VH).toBe(SCENES.reduce((sum, s) => sum + s.lengthVh, 0));
  });
});

describe("scene-anchored time", () => {
  it("progressOf and local are inverse inside a scene", () => {
    const p = progressOf("evidence", 0.37);
    expect(local(p, "evidence")).toBeCloseTo(0.37, 10);
    expect(local(0, "evidence")).toBe(0);
    expect(local(1, "evidence")).toBe(1);
  });

  it("sceneAt finds the scene a boundary starts and clamps outside 0 → 1", () => {
    expect(sceneAt(progressOf("unfold")).index).toBe(9);
    expect(sceneAt(-2)).toEqual({ index: 0, local: 0 });
    expect(sceneAt(9)).toEqual({ index: SCENE_RANGES.length - 1, local: 1 });
  });

  it("between and ramp are clamped 0 → 1 and ramp is eased", () => {
    expect(between(0.2, 0.3, 0.5)).toBe(0);
    expect(between(0.4, 0.3, 0.5)).toBeCloseTo(0.5);
    expect(between(0.6, 0.3, 0.5)).toBe(1);
    const mid = progressOf("build", 0.5);
    expect(ramp(mid, "build", 0, "build", 1)).toBeCloseTo(0.5);
    expect(ramp(progressOf("build", 0.25), "build", 0, "build", 1)).toBeLessThan(0.25);
  });

  it("an unknown scene id is an error, not a silent zero", () => {
    expect(() => progressOf("nope" as never)).toThrow(/Unknown scene/);
  });
});

describe("sampleKeys", () => {
  const keys = [k("validate", 0, 1), k("build", 0, 3)];

  it("passes exactly through each key and holds outside them", () => {
    expect(sampleKeys(keys, 0)).toBe(1);
    expect(sampleKeys(keys, progressOf("validate"))).toBe(1);
    expect(sampleKeys(keys, progressOf("build"))).toBe(3);
    expect(sampleKeys(keys, 1)).toBe(3);
  });

  it("eases between keys without overshooting", () => {
    let previous = -Infinity;
    for (let p = progressOf("validate"); p <= progressOf("build"); p += 0.0005) {
      const v = sampleKeys(keys, p);
      expect(v).toBeGreaterThanOrEqual(previous);
      expect(v).toBeLessThanOrEqual(3);
      previous = v;
    }
  });
});
