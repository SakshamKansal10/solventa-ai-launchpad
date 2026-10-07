import {
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  RingGeometry,
  Shape,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";

import { crescentOutline } from "./core-design";
import { S_OUTER } from "./s-mark";

/**
 * The Engine's optical kernel — a LENS in the S's counter, where the logo has its light.
 *
 *   bezels   machined rings front and rear (the front one champagne)
 *   barrel   the dark tube between them (the camera later travels through it)
 *   planes   three annular computation planes with organised radial traces
 *   iris     eight blades, each a miniature of the S's own crescent; closed, they leave a
 *            pinhole through which the warm core light shows; open, they reveal what the
 *            lens contains
 *
 * Lens-local units = world units; the optical axis is +z.
 */
export const LENS = {
  /** Bezel ring radii and depth. */
  inner: 1.12,
  outer: 1.32,
  bezelDepth: 0.16,
  /** Barrel radius and half-length (its ends sit inside the bezels). */
  barrel: 1.12,
  half: 0.52,
  /** Computation planes: annulus radii and z positions (front to back). */
  planeInner: 0.62,
  planeOuter: 1.08,
  /** Iris: blade count, pivot radius, chord length, z. */
  blades: 8,
  pivot: 1.0,
  chord: 1.18,
  irisZ: 0.44,
} as const;

/** A machined ring: rounded rectangular section from r0 to r1, depth d, facing +z. */
function ring(r0: number, r1: number, d: number): BufferGeometry {
  const c = 0.03;
  const prof = [
    [r0, -d / 2 + c],
    [r0 + c, -d / 2],
    [r1 - c, -d / 2],
    [r1, -d / 2 + c],
    [r1, d / 2 - c],
    [r1 - c, d / 2],
    [r0 + c, d / 2],
    [r0, d / 2 - c],
    [r0, -d / 2 + c],
  ].map(([x, y]) => new Vector2(x, y));
  return new LatheGeometry(prof, 96).rotateX(Math.PI / 2);
}

/** One iris blade: the S's upper crescent, normalised so its chord runs from the pivot along +x. */
function blade(): BufferGeometry {
  const pts = crescentOutline(0, 1);
  const [ax, ay] = S_OUTER[0];
  const [bx, by] = S_OUTER[S_OUTER.length - 1];
  const len = Math.hypot(bx - ax, by - ay);
  const ang = Math.atan2(by - ay, bx - ax);
  const k = LENS.chord / len;
  const shape = new Shape(
    pts.map(([x, y]) => {
      const dx = x - ax;
      const dy = y - ay;
      return new Vector2(
        (dx * Math.cos(-ang) - dy * Math.sin(-ang)) * k,
        (dx * Math.sin(-ang) + dy * Math.cos(-ang)) * k,
      );
    }),
  );
  const g = new ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -0.009);
  return g;
}

export function buildLens() {
  return {
    bezel: ring(LENS.inner, LENS.outer, LENS.bezelDepth),
    barrel: new CylinderGeometry(LENS.barrel, LENS.barrel, LENS.half * 2, 72, 1, true).rotateX(
      Math.PI / 2,
    ),
    plane: new RingGeometry(LENS.planeInner, LENS.planeOuter, 72, 1),
    // A fine champagne lip on the front bezel's inner edge (the only bright metal of the lens).
    lip: new TorusGeometry(LENS.inner + 0.004, 0.012, 8, 120).translate(0, 0, LENS.bezelDepth / 2),
    blade: blade(),
  };
}

const q = new Quaternion();
const AXIS = new Vector3(0, 0, 1);
/**
 * Iris blade k's local matrix: pinned on a circle, chord swung inward when closed (open = 0)
 * and outward behind the bezel when open (open = 1).
 */
export function bladeMatrix(k: number, open: number, out: Matrix4): Matrix4 {
  const phi = (k / LENS.blades) * Math.PI * 2;
  const closed = phi + Math.PI + 0.42;
  const swing = closed - 1.15 * open;
  q.setFromAxisAngle(AXIS, swing);
  return out.compose(
    new Vector3(Math.cos(phi) * LENS.pivot, Math.sin(phi) * LENS.pivot, LENS.irisZ + k * 0.0035),
    q,
    new Vector3(1, 1, 1),
  );
}

/** Radial traces on each computation plane: angle, start and end radius (organised, not random). */
export const LENS_TRACES: { plane: number; angle: number; r0: number; r1: number }[] = (() => {
  const out: { plane: number; angle: number; r0: number; r1: number }[] = [];
  for (let plane = 0; plane < 3; plane++) {
    const n = 12;
    for (let j = 0; j < n; j++) {
      if ((j + plane * 2) % 4 === 3) continue;
      const angle = ((j + plane * 0.5) / n) * Math.PI * 2;
      const reach = 0.62 + ((j * 7 + plane * 3) % 4) * 0.1;
      out.push({
        plane,
        angle,
        r0: LENS.planeInner + 0.06,
        r1: Math.min(LENS.planeOuter - 0.05, reach + 0.3),
      });
    }
  }
  return out;
})();
