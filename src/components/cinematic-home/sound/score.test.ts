import { describe, expect, it } from "vitest";

import { progressOf } from "../timeline/timeline";
import { createCueGate, CUES, cuesBetween, MAX_STEP, mixAt, REARM } from "./score";

describe("the score", () => {
  it("is silent at the very top and wakes in the void", () => {
    expect(mixAt(0).bed).toBe(0);
    expect(mixAt(progressOf("void", 0.6)).bed).toBeGreaterThan(0.3);
  });

  it("builds tension on the approach, restricts the space inside the lens, then opens it", () => {
    const approach = mixAt(progressOf("passage", 0.54));
    const barrel = mixAt(progressOf("passage", 0.65));
    const world = mixAt(progressOf("universe", 0.3));
    expect(approach.tension).toBeGreaterThan(0.4);
    expect(barrel.cutoff).toBeLessThan(400);
    expect(barrel.tension).toBe(0);
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

  it("places every cue inside the film, in order — and keeps the score sparse", () => {
    expect(CUES.length).toBeGreaterThan(12);
    expect(CUES.length).toBeLessThan(30);
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

  it("is soothing and minimal: no clicks, ticks, sweeps or risers, and no forward pulse", () => {
    const mechanical = [
      "evaluate",
      "compare",
      "gate",
      "flyby",
      "lock",
      "align",
      "unlock",
      "unfold",
    ];
    expect(CUES.filter((c) => mechanical.includes(c.kind))).toEqual([]);
    for (let i = 0; i <= 200; i++) expect(mixAt(i / 200).pulse).toBe(0);
  });

  it("opens with the signature motif and resolves it with the emblem and its name at the end", () => {
    expect(CUES[0].kind).toBe("motif");
    expect(CUES.at(-2)!.kind).toBe("signature");
    expect(CUES.at(-1)!.kind).toBe("wordmark");
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

  it("weighs the three futures in a near-silent pause, then resolves once", () => {
    const resolve = CUES.find((c) => c.kind === "resolve")!;
    expect(CUES.filter((c) => c.kind === "resolve")).toHaveLength(1);
    // The pause: the space drops to near-silence between the comparison and the resolution.
    expect(mixAt(progressOf("selection", 0.4)).master).toBeLessThan(0.6);
    expect(mixAt(progressOf("selection", 0.4)).bed).toBeLessThan(0.2);
    expect(resolve.at).toBeGreaterThan(progressOf("selection", 0.55));
  });

  it("approaches the identity narrowly, breathes, lands the S, then resolves into its name", () => {
    const signature = CUES.find((c) => c.kind === "signature")!;
    const wordmark = CUES.find((c) => c.kind === "wordmark")!;
    // The approach: the busy top end is gone and the space is narrow.
    expect(mixAt(progressOf("return", 0.8)).cutoff).toBeLessThan(500);
    expect(mixAt(progressOf("return", 0.8)).width).toBeLessThan(0.3);
    // The breath: a controlled reduction immediately before the S completes — not silence.
    const breath = mixAt(signature.at - 0.002).master;
    expect(breath).toBeLessThan(0.4);
    expect(breath).toBeGreaterThan(0.1);
    expect(mixAt(signature.at + 0.0005).master).toBe(1);
    // The tension is released with the S; nothing pending under the name and the CTA.
    expect(mixAt(signature.at + 0.001).tension).toBe(0);
    expect(mixAt(progressOf("finale", 0.9)).tension).toBe(0);
    // The name arrives a breath after the S (never the same sonic moment).
    expect(wordmark.at - signature.at).toBeGreaterThan(
      progressOf("finale", 0.06) - progressOf("finale", 0),
    );
    expect(signature.major && wordmark.major).toBe(true);
  });

  it("takes a breath of near-silence inside the lens, just before the universe opens", () => {
    const reveal = CUES.find((c) => c.kind === "reveal")!;
    for (const at of [0.62, 0.66, 0.7])
      expect(mixAt(progressOf("passage", at)).master).toBeLessThan(0.2);
    expect(reveal.at).toBeGreaterThan(progressOf("passage", 0.71));
    expect(reveal.at).toBeLessThan(progressOf("passage", 0.76));
  });
});
