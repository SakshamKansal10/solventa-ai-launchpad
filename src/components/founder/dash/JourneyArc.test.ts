import { describe, expect, it } from "vitest";

import { at, segment } from "./JourneyArc";

describe("JourneyArc geometry", () => {
  it("places weeks on the brief's curve: x = 20 + 1160t, y = 200 − 520t + 520t²", () => {
    expect(at(0)).toEqual({ x: 20, y: 200 });
    expect(at(0.5)).toEqual({ x: 600, y: 70 });
    expect(at(1)).toEqual({ x: 1180, y: 200 });
  });

  it("draws a phase as the exact sub-curve (matches the reference's weeks 1–3 of 13)", () => {
    expect(segment(0, 2 / 12)).toBe("M20 200 Q116.7 156.7 213.3 127.8");
  });
});
