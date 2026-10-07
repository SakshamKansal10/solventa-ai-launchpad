import { describe, expect, it } from "vitest";

import { progressOf } from "../timeline/timeline";
import { createCueGate, CUES, cuesBetween, MAX_STEP, mixAt, REARM } from "./score";

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

  it("never re-triggers a cue when the visitor moves back and forth around its boundary", () => {
    const reveal = CUES.find((c) => c.kind === "reveal")!;
    const gate = createCueGate(reveal.at - 0.004);
    const fired: string[] = [];
    // Wiggle across the boundary, within the re-arm margin.
    for (const p of [0.002, -0.002, 0.003, -0.003, 0.001].map((d) => reveal.at + d))
      fired.push(...gate.step(p).map((c) => c.kind));
    expect(fired.filter((k) => k === "reveal")).toHaveLength(1);
    // Back well before it, then forward again: it plays again.
    gate.step(reveal.at - REARM * 1.5);
    expect(gate.step(reveal.at + 0.001).map((c) => c.kind)).toContain("reveal");
  });

  it("marks computation with discrete events — one per context wave reaching each territory", () => {
    const evaluations = CUES.filter((c) => c.kind === "evaluate");
    expect(evaluations).toHaveLength(30);
    for (const c of evaluations) {
      expect(c.at).toBeGreaterThan(progressOf("computation", 0));
      expect(c.at).toBeLessThan(progressOf("computation", 1));
    }
  });

  it("opens with the signature motif and resolves it with the emblem at the end", () => {
    expect(CUES[0].kind).toBe("motif");
    expect(CUES.at(-1)!.kind).toBe("signature");
    expect(CUES.filter((c) => c.major).map((c) => c.kind)).toEqual(
      expect.arrayContaining([
        "kernel",
        "reveal",
        "resolve",
        "disruption",
        "stabilize",
        "signature",
      ]),
    );
  });

  it("brings the identity motif back, softly, as the pathways converge — before the signature", () => {
    const motifs = CUES.filter((c) => c.kind === "motif");
    const signature = CUES.find((c) => c.kind === "signature")!;
    expect(motifs).toHaveLength(2);
    expect(motifs[1].index).toBe(1);
    expect(motifs[1].at).toBeGreaterThan(progressOf("return", 0));
    expect(motifs[1].at).toBeLessThan(signature.at);
  });

  it("compares the three futures with one focused pulse each, before the near-silent pause", () => {
    const pulses = CUES.filter((c) => c.kind === "compare");
    expect(pulses.map((c) => c.index)).toEqual([0, 0.5, 1]);
    const resolve = CUES.find((c) => c.kind === "resolve")!;
    for (const c of pulses) expect(c.at).toBeLessThan(progressOf("selection", 0));
    // The pause: the space drops to near-silence between the comparison and the resolution.
    expect(mixAt(progressOf("selection", 0.4)).master).toBeLessThan(0.6);
    expect(mixAt(progressOf("selection", 0.4)).bed).toBeLessThan(0.2);
    expect(resolve.at).toBeGreaterThan(progressOf("selection", 0.55));
  });

  it("takes a breath of near-silence just before the universe opens", () => {
    const reveal = CUES.find((c) => c.kind === "reveal")!;
    expect(mixAt(progressOf("passage", 0.93)).master).toBeLessThan(0.4);
    expect(reveal.at).toBeGreaterThan(progressOf("passage", 0.93));
  });
});
