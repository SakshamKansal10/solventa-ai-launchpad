import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Matrix4, Vector3 } from "three";

import { quadToMatrix3d, SLAB } from "../world/product/product-model";
import { useWorld } from "../world/WorldContext";
import { labelHalf, labelHeight, NAV_CLEARANCE, setStyle, show } from "./overlay-sync";

/**
 * Inside the canvas, after every world has moved: the overlay work that needs the WebGL camera —
 * labels projected onto their world anchors, and the product panel mapped onto the slab (CSS
 * homography) until it is released as plain, interactive DOM. Everything that follows the story
 * position alone (identity, captions, tone, count) runs on the page's own story loop
 * (overlay-sync), from hydration on.
 */
export function DomSync() {
  const { store, animate } = useWorld();
  const scratch = useMemo(
    () => ({ v: new Vector3(), m: new Matrix4(), corners: [0, 1, 2, 3].map(() => new Vector3()) }),
    [],
  );
  /** The panel's first rasterisation is done right after load, invisibly, instead of mid-handoff. */
  const warmUntil = useMemo(() => ({ t: 0 }), []);

  useFrame((state) => {
    const s = store.state;
    const { width, height } = state.size;
    const dom = s.dom;
    const shown = s.captionBoxes;

    // Labels follow their world anchors. Earlier labels (copy order) keep their place; a later
    // label that would overlap one already shown yields, softly, by how much it would cover.
    const cam = state.camera;
    const placed: { l: number; t: number; r: number; b: number }[] = [];
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
      const inside =
        x > -80 &&
        x < width + 80 &&
        y - (labelHeight.get(el) ?? 0) > NAV_CLEARANCE &&
        y < height + 40;
      // Phones keep the stage captions clear: milestone tags are left to the narrative there.
      const crowded = width < 640 && id.startsWith("milestone-");
      // Labels never clip at the screen edge (their size is measured once — text is fixed).
      let half = labelHalf.get(el);
      if (half === undefined && a.o > 0.002) {
        const body = el.firstElementChild as HTMLElement | null;
        half = body ? body.offsetWidth / 2 : 0;
        labelHalf.set(el, half);
        labelHeight.set(el, body ? body.offsetHeight : 0);
      }
      const cx = Math.min(Math.max(x, (half ?? 0) + 14), width - (half ?? 0) - 14);
      // …and never sit under a caption: they yield as the copy appears.
      let o = behind || !inside || crowded ? 0 : a.o;
      if (o > 0) {
        const h = labelHeight.get(el) ?? 0;
        const hw = half ?? 0;
        for (const { box, o: co } of shown) {
          const m = 10;
          if (cx + hw > box.l - m && cx - hw < box.r + m && y > box.t - m && y - h < box.b + m)
            o *= 1 - co;
        }
        for (const q of placed) {
          const ox = Math.min(cx + hw, q.r) - Math.max(cx - hw, q.l) + 6;
          const oy = Math.min(y, q.b) - Math.max(y - h, q.t) + 4;
          if (ox > 0 && oy > 0) o *= 1 - Math.min(1, ox / 18) * Math.min(1, oy / 8);
        }
        if (o > 0.3) placed.push({ l: cx - hw, t: y - h, r: cx + hw, b: y });
      }
      show(el, o);
      setStyle(el, "transform", `translate3d(${cx.toFixed(1)}px, ${y.toFixed(1)}px, 0)`);
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
            ? `translate3d(${((width - w) / 2).toFixed(1)}px, ${((height - h) / 2 + 20 + (1 - o) * 26).toFixed(1)}px, 0) scale(${(0.82 + 0.18 * o).toFixed(4)})`
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
