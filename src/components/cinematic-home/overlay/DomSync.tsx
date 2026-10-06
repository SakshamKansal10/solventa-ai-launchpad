import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Matrix4, Vector3 } from "three";

import { progressOf } from "../timeline/timeline";
import { quadToMatrix3d, SLAB } from "../world/product/product-model";
import { STAGE_COUNTS } from "../world/universe/universe-model";
import { universePhases } from "../world/universe/universe-state";
import { useWorld } from "../world/WorldContext";
import { CAPTIONS, captionOpacity, WAVE_LABELS } from "./copy";

/** Writes a style only when it changed — keeps per-frame DOM work to a handful of writes. */
const last = new WeakMap<HTMLElement, Record<string, string>>();
function setStyle(
  el: HTMLElement,
  key: "opacity" | "transform" | "visibility" | "pointerEvents",
  value: string,
) {
  let cache = last.get(el);
  if (!cache) {
    cache = {};
    last.set(el, cache);
  }
  if (cache[key] === value) return;
  cache[key] = value;
  el.style[key] = value;
}
const show = (el: HTMLElement, o: number) => {
  setStyle(el, "opacity", o.toFixed(3));
  setStyle(el, "visibility", o > 0.002 ? "visible" : "hidden");
};

/**
 * Inside the canvas, after every world has moved: drives the DOM overlay —
 * caption fades, labels projected onto their world anchors, the convergence
 * count, and the product panel mapped onto the slab (CSS homography) until
 * it is released as plain, interactive DOM.
 */
export function DomSync() {
  const { store, animate } = useWorld();
  const scratch = useMemo(
    () => ({ v: new Vector3(), m: new Matrix4(), corners: [0, 1, 2, 3].map(() => new Vector3()) }),
    [],
  );
  const countFrom = progressOf("universe", 0.55);
  /** The panel's first rasterisation is done right after load, invisibly, instead of mid-handoff. */
  const warmUntil = useMemo(() => ({ t: 0 }), []);
  const countTo = progressOf("selection", 0.68);

  useFrame((state) => {
    const s = store.state;
    const p = s.progress;
    const { width, height } = state.size;
    const dom = s.dom;

    for (const c of CAPTIONS) {
      const el = dom.captions.get(c.id);
      if (!el) continue;
      let o = captionOpacity(c, p);
      if (c.id === "void" && p < progressOf("void", 0.12)) o = 1;
      show(el, o);
      setStyle(el, "transform", `translate3d(0, ${((1 - o) * 10).toFixed(1)}px, 0)`);
    }
    for (const w of WAVE_LABELS) {
      const el = dom.captions.get(w.id);
      if (el)
        show(
          el,
          captionOpacity({ id: w.id, kind: "line", text: "", span: w.span, place: "lower" }, p),
        );
    }

    // Labels follow their world anchors.
    const cam = state.camera;
    for (const [id, el] of dom.anchors) {
      const a = s.anchors.get(id);
      if (!a || a.o <= 0.002) {
        show(el, 0);
        continue;
      }
      scratch.v.set(a.x, a.y, a.z).project(cam);
      const behind = scratch.v.z > 1 || scratch.v.z < -1;
      const x = (scratch.v.x * 0.5 + 0.5) * width;
      const y = (-scratch.v.y * 0.5 + 0.5) * height;
      const inside = x > -80 && x < width + 80 && y > 40 && y < height + 40;
      show(el, behind || !inside ? 0 : a.o);
      setStyle(el, "transform", `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`);
    }

    // The convergence count: changes only as a stage completes.
    if (dom.counter) {
      const ph = universePhases(p);
      let k = 0;
      while (k < 5 && ph.stages[k] > 0.5) k++;
      const o =
        p > countFrom && p < countTo
          ? Math.min(1, (p - countFrom) * 60, (countTo - p) * 60) * 0.85
          : 0;
      show(dom.counter, o);
      const text = String(STAGE_COUNTS[k]);
      if (dom.counter.textContent !== text) dom.counter.textContent = text;
    }

    // The product panel: mapped onto the slab while it is 3D, released once it faces the screen.
    const panel = dom.panel;
    if (panel) {
      const slab = s.slab;
      if (!warmUntil.t) warmUntil.t = performance.now() + 1500;
      // Not under ?freeze (tests, review frames): there the panel stays strictly hidden until its scene.
      const warming = animate && performance.now() < warmUntil.t;
      const o = slab.visible ? slab.dom : 0;
      if (warming && o < 0.001) {
        setStyle(panel, "opacity", "0.001");
        setStyle(panel, "visibility", "visible");
      } else show(panel, o);
      if (o > 0.002 || warming) {
        scratch.m.fromArray(slab.matrix);
        const hw = SLAB.width / 2;
        const hh = SLAB.height / 2;
        const z = SLAB.depth / 2 + 0.01;
        const pts: [number, number, number][] = [
          [-hw, hh, z],
          [hw, hh, z],
          [hw, -hh, z],
          [-hw, -hh, z],
        ];
        const quad = pts.map(([x, y, zz], i) => {
          const c = scratch.corners[i].set(x, y, zz).applyMatrix4(scratch.m).project(cam);
          return [(c.x * 0.5 + 0.5) * width, (-c.y * 0.5 + 0.5) * height] as [number, number];
        });
        const w = panel.offsetWidth || 1;
        const h = panel.offsetHeight || 1;
        // Phones: the slab is too small to carry the panel — it arrives centred, full width.
        setStyle(
          panel,
          "transform",
          width < 640
            ? `translate3d(${((width - w) / 2).toFixed(1)}px, ${((height - h) / 2 + 20).toFixed(1)}px, 0)`
            : `matrix3d(${quadToMatrix3d(w, h, quad)
                .map((n) => n.toFixed(6))
                .join(",")})`,
        );
      }
      setStyle(panel, "pointerEvents", slab.released && o > 0.95 ? "auto" : "none");
      if (panel.inert !== !(slab.released && o > 0.95)) panel.inert = !(slab.released && o > 0.95);
    }
  });

  return null;
}
