import { Vector3 } from "three";
import { describe, expect, it } from "vitest";

import {
  BASE_FOV,
  CAMERA_KEYS,
  createCameraPath,
  createTiming,
  curveParameter,
  FOCUS_KEYS,
  FOV_KEYS,
  fovForAspect,
  MAX_FOV,
  NEAR_KEYS,
} from "./camera-path";

describe("curveParameter", () => {
  const stops = [0, 0.1, 0.5, 1];

  it("reaches control point i exactly at its own progress", () => {
    stops.forEach((stop, i) => expect(curveParameter(stop, stops)).toBeCloseTo(i / 3, 12));
  });

  it("interpolates within a segment and clamps outside 0 → 1", () => {
    expect(curveParameter(0.3, stops)).toBeCloseTo((1 + 0.5) / 3, 12);
    expect(curveParameter(-1, stops)).toBe(0);
    expect(curveParameter(2, stops)).toBe(1);
  });
});

describe("createTiming", () => {
  const stops = [0, 0.1, 0.5, 1];
  const timing = createTiming(stops);

  it("still reaches every key exactly at its own progress", () => {
    stops.forEach((stop, i) => expect(timing(stop)).toBeCloseTo(i / 3, 12));
  });

  it("is monotone and changes speed smoothly (no jump at a key)", () => {
    let prev = timing(0);
    const speed = (p: number) => (timing(p + 1e-4) - timing(p - 1e-4)) / 2e-4;
    for (let i = 1; i <= 1000; i++) {
      const t = timing(i / 1000);
      expect(t).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = t;
    }
    for (const key of [0.1, 0.5]) {
      const before = speed(key - 2e-3);
      const after = speed(key + 2e-3);
      expect(Math.abs(after - before) / Math.max(before, after)).toBeLessThan(0.1);
    }
  });
});

describe("the camera journey", () => {
  const path = createCameraPath();
  const position = new Vector3();
  const target = new Vector3();

  it("keys run in scroll order and span the whole timeline", () => {
    expect(CAMERA_KEYS[0].at).toBe(0);
    expect(CAMERA_KEYS[CAMERA_KEYS.length - 1].at).toBe(1);
    for (let i = 1; i < CAMERA_KEYS.length; i++) {
      expect(CAMERA_KEYS[i].at).toBeGreaterThan(CAMERA_KEYS[i - 1].at);
    }
  });

  it("sits exactly on every key when scroll reaches it", () => {
    for (const key of CAMERA_KEYS) {
      path.sample(key.at, position, target);
      for (let a = 0; a < 3; a++) {
        expect(position.getComponent(a)).toBeCloseTo(key.position[a], 5);
        expect(target.getComponent(a)).toBeCloseTo(key.target[a], 5);
      }
    }
  });

  it("is continuous — no jumps, no NaN, never looking at its own position", () => {
    const previous = new Vector3();
    path.sample(0, previous, target);
    for (let i = 1; i <= 8000; i++) {
      path.sample(i / 8000, position, target);
      expect(Number.isFinite(position.x + position.y + position.z)).toBe(true);
      expect(position.distanceTo(target)).toBeGreaterThan(0.5);
      // A small scroll can never throw the camera across the world.
      expect(position.distanceTo(previous)).toBeLessThan(0.6);
      previous.copy(position);
    }
  });
});

describe("lens channels", () => {
  it("compresses in the passage and opens wide for the reveal", () => {
    const values = FOV_KEYS.map((k) => k.value);
    expect(Math.min(...values)).toBeLessThan(30);
    expect(Math.max(...values)).toBeGreaterThanOrEqual(48);
  });

  it("only uses a tiny near plane while architecture passes the lens", () => {
    expect(Math.min(...NEAR_KEYS.map((k) => k.value))).toBeLessThan(0.05);
    expect(NEAR_KEYS[NEAR_KEYS.length - 1].value).toBeGreaterThanOrEqual(0.1);
  });

  it("portrait framing focus is a bounded weight (negative = closer for tall subjects)", () => {
    for (const k of FOCUS_KEYS) {
      expect(k.value).toBeGreaterThanOrEqual(-0.6);
      expect(k.value).toBeLessThanOrEqual(1);
    }
  });
});

describe("fovForAspect", () => {
  it("keeps the scene's lens on landscape screens", () => {
    expect(fovForAspect(16 / 9)).toBe(BASE_FOV);
    expect(fovForAspect(1, 30)).toBe(30);
  });

  it("widens for portrait so the horizontal framing holds, within a cap", () => {
    const tablet = fovForAspect(3 / 4);
    const phone = fovForAspect(390 / 844);
    expect(tablet).toBeGreaterThan(BASE_FOV);
    expect(phone).toBeGreaterThan(tablet);
    expect(phone).toBeLessThanOrEqual(MAX_FOV);
  });

  it("ignores a degenerate size", () => {
    expect(fovForAspect(0)).toBe(BASE_FOV);
    expect(fovForAspect(Number.NaN)).toBe(BASE_FOV);
  });
});
