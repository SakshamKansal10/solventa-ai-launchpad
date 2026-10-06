import { Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { createCameraPath } from "../camera/camera-path";
import { QUALITY_PRESETS } from "../performance/quality";
import { createNodeLayout, PATH_CLEARANCE } from "./node-layout";

describe("createNodeLayout", () => {
  it("places every node each tier asks for", () => {
    for (const preset of Object.values(QUALITY_PRESETS)) {
      expect(createNodeLayout(preset.nodeCount)).toHaveLength(preset.nodeCount);
    }
  });

  it("is deterministic — the same seed gives the same scene", () => {
    expect(createNodeLayout(60, 3)).toEqual(createNodeLayout(60, 3));
    expect(createNodeLayout(60, 3)).not.toEqual(createNodeLayout(60, 4));
  });

  it("never puts a node in the camera's way", () => {
    const path = createCameraPath();
    const along: Vector3[] = [];
    const look = new Vector3();
    for (let i = 0; i <= 3000; i++) {
      const point = new Vector3();
      path.sample(i / 3000, point, look);
      along.push(point);
    }
    const nodes = createNodeLayout(QUALITY_PRESETS.high.nodeCount);
    let closest = Infinity;
    const node = new Vector3();
    for (const n of nodes) {
      node.set(n.x, n.y, n.z);
      for (const point of along) closest = Math.min(closest, point.distanceTo(node));
    }
    // The layout checks against a sampled path; allow a sliver for the chords between samples.
    expect(closest).toBeGreaterThan(PATH_CLEARANCE - 0.05);
  });

  it("builds a cluster around the core and a field along the camera's travel", () => {
    const nodes = createNodeLayout(120);
    const orbit = nodes.filter((n) => n.orbit === 1);
    const field = nodes.filter((n) => n.orbit === 0);
    expect(orbit.length).toBe(48);
    for (const n of orbit) expect(Math.hypot(n.x, n.y, n.z)).toBeLessThan(5.3);
    expect(Math.min(...field.map((n) => n.z))).toBeLessThan(-25);
  });
});
