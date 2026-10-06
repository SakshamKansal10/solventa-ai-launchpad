import { describe, expect, it } from "vitest";

import { CAPTIONS, captionOpacity } from "../overlay/copy";
import { progressOf } from "../timeline/timeline";
import {
  ASSUMPTION_GATE,
  createGateState,
  gateState,
  originalFrame,
  revisedFrame,
  SCULPTURE_ARCHES,
  UNSTABLE,
  WINNER_POS,
} from "./path/path-model";
import { quadToMatrix3d, slabState } from "./product/product-model";
import { createUniverse } from "./universe/universe-model";
import { createNodeFrame, nodeFrame, universePhases } from "./universe/universe-state";

/**
 * The story's pure models: every transformation is a function of scroll
 * progress, so it plays identically forwards, backwards, slow or fast.
 */
describe("universe convergence (state per frame)", () => {
  const model = createUniverse(360);
  const remaining = (p: number) => {
    const ph = universePhases(p);
    return model.rendered.filter((i) => {
      const f = nodeFrame(model.opportunities[i], model, ph, createNodeFrame());
      return f.visible && f.falling < 0.5 && f.energy > 0.05;
    }).length;
  };

  it("leaves exactly 9, then 3, then 1 living directions", () => {
    expect(remaining(progressOf("convergence", 1))).toBe(9);
    expect(remaining(progressOf("three", 0.16))).toBe(3);
    // …then the three hand over to their monumental sculptures.
    expect(remaining(progressOf("three", 0.4))).toBe(0);
    expect(remaining(progressOf("convergence", 0.3))).toBeGreaterThan(36);
  });

  it("is reversible: the same progress gives the same state whatever came before", () => {
    const o = model.opportunities[model.winner];
    const p = progressOf("convergence", 0.6);
    const a = { ...nodeFrame(o, model, universePhases(p), createNodeFrame()) };
    nodeFrame(o, model, universePhases(progressOf("selection", 0.9)), createNodeFrame());
    nodeFrame(o, model, universePhases(progressOf("universe", 0.1)), createNodeFrame());
    expect(nodeFrame(o, model, universePhases(p), createNodeFrame())).toEqual(a);
  });
});

describe("the opportunity becomes the path", () => {
  const st = createGateState();

  it("its arches start as the sculpture at the chosen opportunity and telescope out along the path", () => {
    gateState(5, progressOf("selection", 1), st);
    expect(
      st.position.distanceTo({ x: WINNER_POS[0], y: WINNER_POS[1], z: WINNER_POS[2] } as never),
    ).toBeLessThan(6);
    gateState(5, progressOf("unfold", 1), st);
    const onPath = originalFrame(5, {
      position: st.position.clone(),
      quaternion: st.quaternion.clone(),
      scale: 1,
    });
    expect(st.position.distanceTo(onPath.position)).toBeLessThan(1e-6);
    expect(SCULPTURE_ARCHES).toBeLessThan(ASSUMPTION_GATE);
  });

  it("is provisional in Validate and solid in Build", () => {
    gateState(20, progressOf("validate", 0.6), st);
    expect(st.solid).toBeLessThan(0.2);
    expect(st.crown).toBeLessThan(0.2);
    gateState(20, progressOf("elevate", 0.2), st);
    expect(st.solid).toBeGreaterThan(0.9);
    expect(st.crown).toBeGreaterThan(0.9);
  });

  it("contradictory evidence destabilises the future ahead; adaptation rebuilds it elsewhere", () => {
    const g = UNSTABLE[3];
    gateState(g, progressOf("crisis", 1), st);
    expect(st.unstable).toBeGreaterThan(0.9);
    gateState(ASSUMPTION_GATE, progressOf("crisis", 1), st);
    expect(st.unstable).toBeGreaterThan(0.2);
    expect(st.unstable).toBeLessThan(0.5);
    gateState(g, progressOf("adaptation", 1), st);
    expect(st.unstable).toBe(0);
    const slot = revisedFrame(3, {
      position: st.position.clone(),
      quaternion: st.quaternion.clone(),
      scale: 1,
    });
    expect(st.position.distanceTo(slot.position)).toBeLessThan(1e-6);
    // Scrolling back undoes it exactly.
    gateState(g, progressOf("validate", 0.5), st);
    expect(st.unstable).toBe(0);
  });
});

describe("product handoff", () => {
  it("quadToMatrix3d maps the element's corners onto the target quad", () => {
    const w = 400;
    const h = 250;
    const quad: [number, number][] = [
      [120, 80],
      [530, 110],
      [500, 380],
      [100, 330],
    ];
    const m = quadToMatrix3d(w, h, quad);
    const apply = (x: number, y: number) => {
      const X = m[0] * x + m[4] * y + m[12];
      const Y = m[1] * x + m[5] * y + m[13];
      const W = m[3] * x + m[7] * y + m[15];
      return [X / W, Y / W];
    };
    const corners = [apply(0, 0), apply(w, 0), apply(w, h), apply(0, h)];
    corners.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(quad[i][0], 6);
      expect(y).toBeCloseTo(quad[i][1], 6);
    });
  });

  it("the DOM takes over the surface late in the handoff and is released only for the product", () => {
    expect(slabState(progressOf("handoff", 0.3)).dom).toBe(0);
    expect(slabState(progressOf("handoff", 0.3)).released).toBe(false);
    expect(slabState(progressOf("product", 0.5))).toMatchObject({ dom: 1, released: true });
    expect(slabState(progressOf("connected", 0.5)).released).toBe(false);
    expect(slabState(progressOf("finale", 0.8)).visible).toBe(false);
  });
});

describe("copy timing", () => {
  it("every caption fades fully in inside its own span and is gone outside it", () => {
    for (const c of CAPTIONS) {
      const a = progressOf(c.span[0], c.span[1]);
      const b = c.span[3] > 1 ? 1 : progressOf(c.span[2], c.span[3]);
      expect(captionOpacity(c, (a + b) / 2)).toBeCloseTo(1, 5);
      if (a > 0.001) expect(captionOpacity(c, a - 0.001)).toBe(0);
    }
  });

  it("the finale line and CTA stay up at the very end", () => {
    const finale = CAPTIONS.find((c) => c.id === "finale")!;
    expect(captionOpacity(finale, 0.9999)).toBe(1);
  });
});
