import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector3 } from "three";

import { S_SCALE } from "./core-design";
import { S_INNER, S_OUTER } from "./s-mark";

/**
 * The S channel as a MACHINED part, not an extruded letter. One crescent of the traced mark,
 * built in cross-section along its length (u: 0 = lower tip … 1 = upper tip; v: 0 = outer
 * rim … 1 = inner edge):
 *
 *   outer rim     a rounded wall, with a narrow champagne chamfer to each face
 *   main face     a gently convex surface (thickest at the rim)
 *   inner bevel   a crisp planar facet falling to a thin inner edge — where the logo's gold
 *                 light lives
 *   thickness     follows the crescent: full in the middle, closing to true points at both tips
 *
 * Front and back are mirrored. Facets are separate strips (hard, machined edges); each strip is
 * smooth across its own width. Group 0 = body metal, group 1 = champagne chamfers and lips.
 */
export const SHELL = {
  /** Thickness at the crescent's widest point (world units). */
  depth: 1.0,
  /** Where the main face turns into the inner bevel (v), and the face height there (× half-depth). */
  bevelAt: 0.7,
  bevelTop: 0.9,
  /** Height of the thin inner edge (× half-depth). */
  edge: 0.2,
  /** Outer chamfer width (v) and the rim height it starts from (× half-depth). */
  chamfer: 0.035,
  rim: 0.8,
} as const;

const SAMPLES = 200;
const outerCurve = new CatmullRomCurve3(
  S_OUTER.map(([x, y]) => new Vector3(x * S_SCALE, y * S_SCALE, 0)),
  false,
  "centripetal",
);
const innerCurve = new CatmullRomCurve3(
  S_INNER.map(([x, y]) => new Vector3(x * S_SCALE, y * S_SCALE, 0)),
  false,
  "centripetal",
);

/** Thickness (world) at u: full in the middle, closing to a point at each tip. */
export function shellThickness(u: number): number {
  return SHELL.depth * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, u)))), 0.7);
}

/** Front-face height (× half-thickness) at v across the channel. */
export function faceHeight(v: number): number {
  if (v <= SHELL.chamfer) return SHELL.rim + ((1 - SHELL.rim) * v) / SHELL.chamfer;
  if (v <= SHELL.bevelAt) {
    const s = (v - SHELL.chamfer) / (SHELL.bevelAt - SHELL.chamfer);
    return 1 - (1 - SHELL.bevelTop) * s * s;
  }
  const s = (Math.min(1, v) - SHELL.bevelAt) / (1 - SHELL.bevelAt);
  return SHELL.bevelTop + (SHELL.edge - SHELL.bevelTop) * s;
}

const o = new Vector3();
const i = new Vector3();
/** World point on the channel (upper-channel frame) at (u, v), on the front face (side 1) or back (−1). */
export function shellPoint(
  u: number,
  v: number,
  side: 1 | -1,
  lift = 0,
  out = new Vector3(),
): Vector3 {
  const uu = Math.min(1, Math.max(0, u));
  outerCurve.getPointAt(uu, o);
  innerCurve.getPointAt(uu, i);
  out.copy(o).lerp(i, v);
  out.z = side * (shellThickness(uu) * 0.5 * faceHeight(v) + lift);
  return out;
}

/** In-plane outward normal of the outer rim at u (pointing away from the inner edge). */
export function rimNormal(u: number, out = new Vector3()): Vector3 {
  const a = outerCurve.getPointAt(Math.max(0, u - 0.01));
  const b = outerCurve.getPointAt(Math.min(1, u + 0.01));
  out.set(-(b.y - a.y), b.x - a.x, 0).normalize();
  outerCurve.getPointAt(u, o);
  innerCurve.getPointAt(u, i);
  if (out.x * (o.x - i.x) + out.y * (o.y - i.y) < 0) out.negate();
  return out;
}

type Strip = { rows: Vector3[][]; group: 0 | 1 };

/** A strip of rows (one row per u sample) → triangles; `flip` reverses the winding. */
function addStrip(
  pos: number[],
  idx: number[],
  groups: { start: number; count: number; group: number }[],
  strip: Strip,
  flip: boolean,
) {
  const base = pos.length / 3;
  const cols = strip.rows[0].length;
  for (const row of strip.rows) for (const p of row) pos.push(p.x, p.y, p.z);
  const start = idx.length;
  for (let r = 0; r < strip.rows.length - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = base + r * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      if (flip) idx.push(a, b, d, b, e, d);
      else idx.push(a, d, b, b, d, e);
    }
  }
  groups.push({ start, count: idx.length - start, group: strip.group });
}

/** The channel shell (upper channel; the lower is the same part turned 180° about z). */
export function buildShell(): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const groups: { start: number; count: number; group: number }[] = [];
  const us = Array.from({ length: SAMPLES + 1 }, (_, k) => 0.002 + (0.996 * k) / SAMPLES);
  const face = (vs: number[], side: 1 | -1): Vector3[][] =>
    us.map((u) => vs.map((v) => shellPoint(u, v, side)));
  const lin = (a: number, b: number, n: number) =>
    Array.from({ length: n + 1 }, (_, k) => a + ((b - a) * k) / n);

  for (const side of [1, -1] as const) {
    const flip = side > 0;
    // Champagne chamfer from the rim to the face.
    addStrip(pos, idx, groups, { rows: face([0, SHELL.chamfer], side), group: 1 }, flip);
    // The convex main face.
    addStrip(
      pos,
      idx,
      groups,
      { rows: face(lin(SHELL.chamfer, SHELL.bevelAt, 14), side), group: 0 },
      flip,
    );
    // The inner bevel — one crisp facet.
    addStrip(pos, idx, groups, { rows: face([SHELL.bevelAt, 0.985], side), group: 0 }, flip);
    // A fine champagne lip on the inner edge (it catches the counter's light).
    addStrip(pos, idx, groups, { rows: face([0.985, 1], side), group: 1 }, flip);
  }
  // Outer wall: a rounded rim between the two chamfers (bulging slightly outward).
  const n = new Vector3();
  const wall = us.map((u) => {
    const t = shellThickness(u);
    rimNormal(u, n);
    outerCurve.getPointAt(u, o);
    return lin(-1, 1, 8).map((s) => {
      const bulge = 0.05 * t * Math.cos((s * Math.PI) / 2);
      return new Vector3(o.x + n.x * bulge, o.y + n.y * bulge, s * t * 0.5 * SHELL.rim);
    });
  });
  addStrip(pos, idx, groups, { rows: wall, group: 0 }, true);
  // Inner wall: the thin edge between the two lips.
  const inner = us.map((u) => {
    const t = shellThickness(u);
    innerCurve.getPointAt(u, i);
    return lin(-1, 1, 2).map((s) => new Vector3(i.x, i.y, s * t * 0.5 * SHELL.edge));
  });
  addStrip(pos, idx, groups, { rows: inner, group: 0 }, false);

  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  for (const gr of groups) g.addGroup(gr.start, gr.count, gr.group);
  g.computeVertexNormals();
  return g;
}

/**
 * Machined detail on the front and back faces: a precision groove along the channel's midline
 * (where its energy runs), with a champagne lip, and transverse panel seams. Thin strips lying
 * on the surface. Returns [dark parts, champagne parts].
 */
export function buildFaceDetail(): [BufferGeometry, BufferGeometry] {
  const dark: number[] = [];
  const darkIdx: number[] = [];
  const lit: number[] = [];
  const litIdx: number[] = [];
  const quadStrip = (pos: number[], idx: number[], rows: [Vector3, Vector3][], flip: boolean) => {
    const base = pos.length / 3;
    for (const [a, b] of rows) pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    for (let r = 0; r < rows.length - 1; r++) {
      const a = base + r * 2;
      if (flip) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  };
  const width = (u: number) => outerCurve.getPointAt(u).distanceTo(innerCurve.getPointAt(u));
  for (const side of [1, -1] as const) {
    const flip = side > 0;
    // The groove: a dark channel along v ≈ 0.42, about 0.07 wide, from tip to tip (narrowing).
    const groove: [Vector3, Vector3][] = [];
    const lip: [Vector3, Vector3][] = [];
    for (let k = 0; k <= 160; k++) {
      const u = 0.07 + (0.86 * k) / 160;
      const w = Math.max(0.2, width(u));
      const half = Math.min(0.035, 0.04 * w) / w;
      const c = 0.42;
      groove.push([shellPoint(u, c - half, side, 0.004), shellPoint(u, c + half, side, 0.004)]);
      lip.push([
        shellPoint(u, c - half - 0.012 / w, side, 0.005),
        shellPoint(u, c - half, side, 0.005),
      ]);
    }
    quadStrip(dark, darkIdx, groove, flip);
    quadStrip(lit, litIdx, lip, flip);
    // Panel seams across the main face.
    for (const su of [0.31, 0.5, 0.69]) {
      const w = width(su);
      const du = 0.006 / Math.max(0.5, w);
      const rows: [Vector3, Vector3][] = [];
      for (let k = 0; k <= 12; k++) {
        const v = SHELL.chamfer + 0.01 + ((SHELL.bevelAt - SHELL.chamfer - 0.02) * k) / 12;
        rows.push([shellPoint(su - du, v, side, 0.004), shellPoint(su + du, v, side, 0.004)]);
      }
      quadStrip(dark, darkIdx, rows, !flip);
    }
  }
  const make = (pos: number[], idx: number[]) => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  return [make(dark, darkIdx), make(lit, litIdx)];
}

/**
 * The gold inner light (the logo's lit counter): gradient strips on the inner bevel of each face —
 * bright at the edge, fading up the facet — and a band across the thin inner wall. Vertex colours
 * carry the gradient (brightest along the middle of the curve, falling away to the tips).
 */
export function buildSeamLight(): BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const glow = (u: number) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.6);
  const M = 120;
  const band = (at: (u: number, s: 0 | 1) => Vector3, fade: boolean, flip: boolean) => {
    const base = pos.length / 3;
    for (let k = 0; k <= M; k++) {
      const u = 0.01 + (0.98 * k) / M;
      const g = glow(u);
      for (const s of [0, 1] as const) {
        const p = at(u, s);
        pos.push(p.x, p.y, p.z);
        const c = fade && s === 1 ? 0 : g;
        col.push(c, c, c);
      }
      if (k < M) {
        const a = base + k * 2;
        if (flip) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  };
  for (const side of [1, -1] as const) {
    band((u, s) => shellPoint(u, s === 0 ? 0.998 : 0.93, side, 0.006), true, side < 0);
  }
  band(
    (u, s) => {
      const t = shellThickness(u);
      innerCurve.getPointAt(u, i);
      const n = rimNormal(u).negate();
      return new Vector3(
        i.x + n.x * 0.006,
        i.y + n.y * 0.006,
        (s === 0 ? -1 : 1) * t * 0.5 * SHELL.edge,
      );
    },
    false,
    false,
  );
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}
