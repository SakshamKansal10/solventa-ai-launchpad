import { ExtrudeGeometry, Path, Shape } from "three";

/**
 * Solventia's structural primitive: the machined rounded-square FRAME. The
 * core's gimbal layers, the winning direction, the execution gates and the
 * product surface are all built from it, so the world reads as one engineered
 * system (never ribs or bones — straight runs, precise radii, chamfered edges).
 */

/** A rounded rectangle centred on the origin (half sizes, corner radius). */
function traceRoundedRect<T extends Path>(path: T, hw: number, hh: number, r: number): T {
  // three.js fixes hole winding itself (ExtrudeGeometry reverses clockwise holes).
  const rr = Math.max(0.001, Math.min(r, hw, hh));
  path.moveTo(-hw + rr, -hh);
  path.lineTo(hw - rr, -hh);
  path.absarc(hw - rr, -hh + rr, rr, -Math.PI / 2, 0, false);
  path.lineTo(hw, hh - rr);
  path.absarc(hw - rr, hh - rr, rr, 0, Math.PI / 2, false);
  path.lineTo(-hw + rr, hh);
  path.absarc(-hw + rr, hh - rr, rr, Math.PI / 2, Math.PI, false);
  path.lineTo(-hw, -hh + rr);
  path.absarc(-hw + rr, -hh + rr, rr, Math.PI, Math.PI * 1.5, false);
  return path;
}

export interface FrameOptions {
  /** Half width / half height of the OUTER edge. */
  hw: number;
  hh: number;
  /** Bar width (outer edge → inner edge). */
  bar: number;
  /** Thickness along z (centred on z = 0). */
  depth: number;
  radius: number;
  /** Chamfer size; machined edges catch the light. */
  bevel?: number;
  curveSegments?: number;
}

/** A closed machined frame (rounded rectangle with a rounded-rectangle aperture). */
export function frameGeometry(o: FrameOptions): ExtrudeGeometry {
  const bevel = o.bevel ?? Math.min(0.04, o.bar * 0.18, o.depth * 0.2);
  const shape = traceRoundedRect(new Shape(), o.hw - bevel, o.hh - bevel, o.radius - bevel);
  const inner = Math.max(0.02, o.radius - o.bar);
  shape.holes.push(
    traceRoundedRect(new Path(), o.hw - o.bar + bevel, o.hh - o.bar + bevel, inner + bevel),
  );
  const depth = Math.max(0.001, o.depth - bevel * 2);
  const g = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: o.curveSegments ?? 10,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/**
 * A fine strip on the frame's front face along its inner edge — the gold
 * conductive inlay (or an emissive hairline).
 */
export function inlayGeometry(o: FrameOptions, width = 0.05, inset = 0.035): ExtrudeGeometry {
  const hw = o.hw - o.bar + inset + width;
  const hh = o.hh - o.bar + inset + width;
  const r = Math.max(0.02, o.radius - o.bar + inset + width);
  const shape = traceRoundedRect(new Shape(), hw, hh, r);
  shape.holes.push(traceRoundedRect(new Path(), hw - width, hh - width, Math.max(0.01, r - width)));
  const g = new ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: false,
    curveSegments: o.curveSegments ?? 10,
  });
  g.translate(0, 0, o.depth / 2);
  return g;
}

/** A solid rounded-rectangle plate (panes, slabs), centred on z = 0. */
export function plateGeometry(
  hw: number,
  hh: number,
  depth: number,
  radius: number,
  bevel = 0.02,
  curveSegments = 6,
) {
  const shape = traceRoundedRect(new Shape(), hw - bevel, hh - bevel, radius - bevel);
  const d = Math.max(0.001, depth - bevel * 2);
  const g = new ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments,
  });
  g.translate(0, 0, -d / 2);
  return g;
}

/**
 * One corner bracket of a frame: a quarter of the rounded corner plus a short
 * stub along each side, arc centre at the origin, occupying the +x/+y quadrant
 * (rotate by multiples of 90° for the other corners). Gates are assembled
 * from four of these and four straight bars — so they can visibly lock
 * together, or come apart.
 */
export function cornerGeometry(
  radius: number,
  bar: number,
  depth: number,
  stub: number,
  curveSegments = 10,
) {
  const r = radius;
  const ri = Math.max(0.02, r - bar);
  const bevel = Math.min(0.03, bar * 0.18, depth * 0.2);
  const shape = new Shape();
  shape.moveTo(r - bevel, -stub);
  shape.lineTo(r - bevel, 0);
  shape.absarc(0, 0, r - bevel, 0, Math.PI / 2, false);
  shape.lineTo(-stub, r - bevel);
  shape.lineTo(-stub, ri + bevel);
  shape.lineTo(0, ri + bevel);
  shape.absarc(0, 0, ri + bevel, Math.PI / 2, 0, true);
  shape.lineTo(ri + bevel, -stub);
  shape.lineTo(r - bevel, -stub);
  const d = Math.max(0.001, depth - bevel * 2);
  const g = new ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments,
  });
  g.translate(0, 0, -d / 2);
  return g;
}
