import { Matrix4, Quaternion, Vector3 } from "three";

import { smoothstep } from "../../math";
import { local, progressOf, ramp } from "../../timeline/timeline";
import { GATE_SPACING, revisedPath, UNSTABLE } from "../path/path-model";

/**
 * The product surface: a piece of the rebuilt architecture that becomes an
 * information surface and — without a cut — the real DOM interface.
 *
 * Its final pose faces back along the revised path (toward the traveller), so
 * when the camera squares up to it at VIEW_DISTANCE it fills the frame head-on:
 * the projected quad is an axis-aligned rectangle, and the DOM can be released
 * from its 3D transform into plain layout with no visible change.
 */
export const SLAB = { width: 6.4, height: 4, depth: 0.16 } as const;
/** Handoff lens (deg) and the distance at which the slab fills ~72% of the frame height. */
export const HANDOFF_FOV = 26;
export const VIEW_DISTANCE = SLAB.height / (0.72 * 2 * Math.tan((HANDOFF_FOV * Math.PI) / 360));

const REVISED_LENGTH = revisedPath.getLength();
const slabDistance = (UNSTABLE.length + 1.6) * GATE_SPACING;

export const SLAB_CENTRE = (() => {
  const p = revisedPath.getPointAt(Math.min(1, slabDistance / REVISED_LENGTH));
  return new Vector3(p.x, p.y + 0.6, p.z);
})();
/** Unit normal of the slab's face (points back toward the arriving camera). */
export const SLAB_NORMAL = (() => {
  const t = revisedPath.getTangentAt(Math.min(1, slabDistance / REVISED_LENGTH));
  return new Vector3(-t.x, 0, -t.z).normalize();
})();
export const SLAB_QUATERNION = (() => {
  const m = new Matrix4().lookAt(new Vector3(), SLAB_NORMAL.clone().negate(), new Vector3(0, 1, 0));
  return new Quaternion().setFromRotationMatrix(m);
})();

/** Camera eye facing the slab head-on, `back` further away and `up` higher. */
export function productEye(back: number, up = 0) {
  const pos = SLAB_CENTRE.clone()
    .addScaledVector(SLAB_NORMAL, VIEW_DISTANCE + back)
    .add(new Vector3(0, up, 0));
  return {
    position: [pos.x, pos.y, pos.z] as [number, number, number],
    target: [SLAB_CENTRE.x, SLAB_CENTRE.y + up * 0.15, SLAB_CENTRE.z] as [number, number, number],
  };
}

export interface SlabState {
  /** 0 → 1: detached from the rebuilt gate and squared up to the camera. */
  emerge: number;
  /** 0 → 1: how much the real DOM has taken over the surface. */
  dom: number;
  /** True once the DOM can be released into plain screen layout. */
  released: boolean;
  /** 0 → 1: the product surface turning back into spatial structure (return). */
  recede: number;
  visible: boolean;
}

export function slabState(p: number): SlabState {
  const hand = local(p, "handoff");
  const connected = local(p, "connected");
  return {
    emerge: smoothstep(0.0, 0.62, hand),
    // The DOM takes the surface over late in the handoff and hands it back as Connected begins.
    dom: smoothstep(0.62, 0.9, hand) * (1 - smoothstep(0.0, 0.22, connected)),
    released: hand >= 0.93 && connected <= 0.001,
    recede: ramp(p, "connected", 0.3, "return", 1),
    // Gone as the finale begins: nothing drifts beside the S while it forms.
    visible: hand > 0 && p < progressOf("finale", 0.02),
  };
}

/**
 * CSS matrix3d that maps an element of size (w × h) px, origin top-left, onto
 * the screen quad (x0,y0)…(x3,y3) [TL, TR, BR, BL] — the classic projective
 * "quad warp". Returns the 16 numbers in CSS (column-major) order.
 */
export function quadToMatrix3d(w: number, h: number, quad: [number, number][]): number[] {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  // Solve the homography from the unit square, then scale by the element size.
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  let g = 0;
  let hh = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const det = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / det;
    hh = (dx1 * dy3 - dx3 * dy1) / det;
  }
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + hh * x3;
  const c = x0;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + hh * y3;
  const f = y0;
  // Unit-square homography H; element coords (u·w, v·h) → divide by w, h.
  return [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1];
}
