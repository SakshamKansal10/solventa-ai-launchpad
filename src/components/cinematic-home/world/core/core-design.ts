import { CatmullRomCurve3, Vector3 } from "three";

import { mulberry32 } from "../../math";

/**
 * The Intelligence Core as DATA: every piece of the sculpture is described
 * here (pure, deterministic), built into geometry by IntelligenceCore.tsx.
 *
 * Silhouette (seen from the visitor's side, +z): an S. The upper family of
 * ceramic shells wraps the upper-LEFT and back like a "C"; the lower family
 * wraps the lower-RIGHT like a reversed "C"; a dark spine leans along the S's
 * diagonal. Upper-right and lower-left stay open — deliberate negative space
 * through which the spine, glass and violet heart are seen. Broad shells are
 * paired with fine ribs (hierarchy), large pieces carry champagne edge inlays,
 * and the opening on +z is an engineered aperture: trimmed jambs, metal
 * lintel and sill.
 */

const DEG = Math.PI / 180;

export interface BladeSpec {
  id: string;
  /** Sweep path around the y axis: angle (deg), height and radius at start → end. */
  theta: [number, number];
  y: [number, number];
  /** Radius at start, middle (bulge) and end. */
  r: [number, number, number];
  width: number;
  thickness: number;
  twist: number;
  /** Mostly-vertical piece (the aperture jambs). */
  vertical?: boolean;
  /** Champagne inlay along one edge (+1 / −1 picks the edge). */
  trim?: 1 | -1;
  /** Champagne strut + clamp back to the spine. */
  strut?: boolean;
  /** Swings aside (±1) when the camera passes through the opening. */
  opens?: number;
  /** Assembly order 0 → 1 within the awakening. */
  order: number;
}

export const BLADES: BladeSpec[] = [
  // Upper family — a "C" around the upper-left and back.
  {
    id: "t1",
    theta: [107, 252],
    y: [3.4, 1.4],
    r: [5.6, 5.9, 5.2],
    width: 2.2,
    thickness: 0.2,
    twist: 0.22,
    trim: -1,
    order: 0.3,
  },
  {
    id: "t2",
    theta: [122, 282],
    y: [2.9, 0.4],
    r: [5.7, 6.2, 5.6],
    width: 1.15,
    thickness: 0.17,
    twist: 0.3,
    trim: 1,
    order: 0.42,
  },
  {
    id: "t3",
    theta: [96, 228],
    y: [5.0, 3.7],
    r: [3.7, 4.3, 3.9],
    width: 0.42,
    thickness: 0.14,
    twist: 0.15,
    order: 0.2,
  },
  {
    id: "t4",
    theta: [146, 302],
    y: [1.9, -0.3],
    r: [6.1, 6.5, 6.0],
    width: 0.32,
    thickness: 0.12,
    twist: 0.1,
    order: 0.5,
  },
  {
    id: "t5",
    theta: [102, 172],
    y: [5.5, 4.9],
    r: [2.4, 2.9, 2.6],
    width: 0.7,
    thickness: 0.15,
    twist: 0.2,
    order: 0.12,
  },
  {
    id: "t6",
    theta: [168, 258],
    y: [3.5, 2.2],
    r: [3.1, 3.5, 3.2],
    width: 0.95,
    thickness: 0.15,
    twist: 0.25,
    strut: true,
    order: 0.24,
  },
  // Lower family — a reversed "C" around the lower-right and back.
  {
    id: "b1",
    theta: [286, 431],
    y: [-1.5, -2.9],
    r: [5.2, 5.9, 5.6],
    width: 2.1,
    thickness: 0.2,
    twist: -0.22,
    trim: 1,
    order: 0.34,
  },
  {
    id: "b2",
    theta: [298, 418],
    y: [-2.9, -0.7],
    r: [5.7, 6.2, 5.7],
    width: 1.1,
    thickness: 0.17,
    twist: -0.3,
    trim: -1,
    order: 0.46,
  },
  {
    id: "b3",
    theta: [276, 410],
    y: [-5.0, -3.7],
    r: [3.7, 4.3, 3.9],
    width: 0.42,
    thickness: 0.14,
    twist: -0.15,
    order: 0.22,
  },
  {
    id: "b4",
    theta: [322, 452],
    y: [-2.6, -1.8],
    r: [6.1, 6.5, 6.0],
    width: 0.32,
    thickness: 0.12,
    twist: -0.1,
    order: 0.54,
  },
  {
    id: "b5",
    theta: [282, 352],
    y: [-5.5, -4.9],
    r: [2.4, 2.9, 2.6],
    width: 0.7,
    thickness: 0.15,
    twist: -0.2,
    order: 0.14,
  },
  {
    id: "b6",
    theta: [348, 438],
    y: [-3.5, -2.2],
    r: [3.1, 3.5, 3.2],
    width: 0.95,
    thickness: 0.15,
    twist: -0.25,
    strut: true,
    order: 0.28,
  },
  // The aperture: two broad front shells meeting at a narrow vertical slit,
  // champagne-inlaid along the slit. They swing apart as the camera arrives.
  {
    id: "j1",
    theta: [99, 97.5],
    y: [-1.9, 2.9],
    r: [5.75, 6.05, 5.7],
    width: 1.05,
    thickness: 0.22,
    twist: 0.06,
    vertical: true,
    trim: 1,
    opens: -1,
    order: 0.6,
  },
  {
    id: "j2",
    theta: [81, 82.5],
    y: [-2.2, 2.6],
    r: [5.7, 6.0, 5.75],
    width: 0.95,
    thickness: 0.22,
    twist: -0.05,
    vertical: true,
    trim: -1,
    opens: 1,
    order: 0.64,
  },
];

export interface GlassSpec {
  id: string;
  theta: [number, number];
  y: [number, number];
  r: number;
  width: number;
  order: number;
}

export const GLASS: GlassSpec[] = [
  { id: "g1", theta: [150, 236], y: [2.7, 1.1], r: 4.4, width: 1.5, order: 0.7 },
  { id: "g2", theta: [330, 416], y: [-1.1, -2.7], r: 4.4, width: 1.5, order: 0.76 },
  { id: "g3", theta: [236, 262], y: [2.2, -2.2], r: 1.7, width: 1.1, order: 0.82 },
];

/** The dark S-spine: leans along the S's diagonal (top-left → bottom-right). */
export const SPINE_POINTS: [number, number, number][] = [
  [-0.9, 5.7, -0.4],
  [-1.2, 3.0, 0.2],
  [0, 0, 0],
  [1.2, -3.0, -0.2],
  [0.9, -5.7, 0.4],
];

/** Champagne collars along the spine (u along the spine). */
export const COLLARS = [0.24, 0.5, 0.76];

export function bladeCurve(spec: BladeSpec | GlassSpec, samples = 9): CatmullRomCurve3 {
  const pts: Vector3[] = [];
  const isBlade = Array.isArray((spec as BladeSpec).r);
  for (let i = 0; i < samples; i++) {
    const u = i / (samples - 1);
    const theta = (spec.theta[0] + (spec.theta[1] - spec.theta[0]) * u) * DEG;
    const y = spec.y[0] + (spec.y[1] - spec.y[0]) * u;
    let r: number;
    if (isBlade) {
      const [r0, rm, r1] = (spec as BladeSpec).r;
      const bulge = Math.sin(u * Math.PI);
      r = u < 0.5 ? r0 + (rm - r0) * bulge : r1 + (rm - r1) * bulge;
    } else {
      r = (spec as GlassSpec).r;
    }
    pts.push(new Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
  }
  return new CatmullRomCurve3(pts, false, "centripetal");
}

/** Where each piece flies in from: far out in the dark, on a curved approach. */
export interface Approach {
  from: [number, number, number];
  bow: [number, number, number];
  /** Spin (radians about y) still to unwind at the start. */
  spin: number;
}

export function approachFor(id: string, index: number): Approach {
  const rand = mulberry32(1000 + index * 97 + id.charCodeAt(0) * 13 + id.charCodeAt(1));
  const angle = rand() * Math.PI * 2;
  const dist = 26 + rand() * 22;
  return {
    from: [Math.cos(angle) * dist, (rand() - 0.5) * 22, -18 - rand() * 34],
    bow: [(rand() - 0.5) * 18, 6 + rand() * 8, (rand() - 0.5) * 12],
    spin: (rand() < 0.5 ? -1 : 1) * (1.1 + rand() * 1.5),
  };
}
