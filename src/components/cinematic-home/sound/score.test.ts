import { describe, expect, it } from "vitest";

import { progressOf } from "../timeline/timeline";
import { CUES, cuesBetween, MAX_STEP, mixAt } from "./score";

describe("the score", () => {
  it("is silent at the very top and wakes in the void", () => {
    expect(mixAt(0).bed).toBe(0);
    expect(mixAt(progressOf("void", 0.6)).bed).toBeGreaterThan(0.3);
  });

  it("restricts the space in the passage, then opens it for the universe", () => {
    const tunnel = mixAt(progressOf("passage", 0.85));
    const world = mixAt(progressOf("universe", 0.3));
    expect(tunnel.cutoff).toBeLessThan(400);
    expect(tunnel.tension).toBeGreaterThan(0.4);
    expect(world.cutoff).toBeGreaterThan(2000);
    expect(world.width).toBeGreaterThan(0.9);
    expect(world.tension).toBe(0);
  });

  it("holds its breath before the one is chosen, then resolves", () => {
    expect(mixAt(progressOf("selection", 0.4)).master).toBeLessThan(0.6);
    expect(mixAt(progressOf("selection", 0.8)).master).toBe(1);
    const resolve = CUES.find((c) => c.kind === "resolve")!;
    expect(resolve.at).toBeGreaterThan(progressOf("selection", 0.5));
  });

  it("stays within safe levels everywhere", () => {
    for (let p = 0; p <= 1; p += 0.0025) {
      const m = mixAt(p);
      for (const v of [m.bed, m.tension, m.pad, m.width, m.pulse, m.master]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("places every cue inside the film, in order", () => {
    expect(CUES.length).toBeGreaterThan(40);
    CUES.forEach((c, i) => {
      expect(c.at).toBeGreaterThan(0);
      expect(c.at).toBeLessThan(1);
      if (i) expect(c.at).toBeGreaterThanOrEqual(CUES[i - 1].at);
    });
  });

  it("plays cues only while travelling forward — never on the way back or on a jump", () => {
    const reveal = CUES.find((c) => c.kind === "reveal")!;
    expect(cuesBetween(reveal.at - 0.001, reveal.at + 0.001).map((c) => c.kind)).toContain(
      "reveal",
    );
    expect(cuesBetween(reveal.at + 0.001, reveal.at - 0.001)).toEqual([]);
    expect(cuesBetween(0, 0.5)).toEqual([]);
    expect(cuesBetween(0.2, 0.2 + MAX_STEP * 2)).toEqual([]);
  });
});
