import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector2, Vector3 } from "three";

/**
 * Sweeps a closed 2D profile along a 3D curve — the generator behind every
 * curved ceramic blade, rib, arch and metal clamp in the world. Optional taper
 * (profile scale along the length) and twist give the pieces their sculpted,
 * engineered silhouettes; flat caps close both ends.
 */
export interface SweepOptions {
  segments: number;
  /** Profile scale at u ∈ [0, 1] along the curve. */
  taper?: (u: number) => number;
  /** Profile rotation (radians) at u. */
  twist?: (u: number) => number;
  /** Fixed "up" used to orient the profile (more stable than Frenet frames). */
  up?: Vector3;
  caps?: boolean;
}

export function sweep(
  points: Vector3[] | CatmullRomCurve3,
  profile: Vector2[],
  {
    segments,
    taper = () => 1,
    twist = () => 0,
    up = new Vector3(0, 1, 0),
    caps = true,
  }: SweepOptions,
): BufferGeometry {
  const curve =
    points instanceof CatmullRomCurve3
      ? points
      : new CatmullRomCurve3(points, false, "centripetal");
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const ring = profile.length;
  const p = new Vector3();
  const t = new Vector3();
  const n = new Vector3();
  const b = new Vector3();
  const refUp = up.clone().normalize();

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t).normalize();
    // Side axis from a fixed up vector; fall back when the curve runs along it.
    b.crossVectors(t, refUp);
    if (b.lengthSq() < 1e-6) b.crossVectors(t, new Vector3(1, 0, 0));
    b.normalize();
    n.crossVectors(b, t).normalize();
    const s = taper(u);
    const a = twist(u);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let j = 0; j < ring; j++) {
      const px = (profile[j].x * ca - profile[j].y * sa) * s;
      const py = (profile[j].x * sa + profile[j].y * ca) * s;
      positions.push(
        p.x + b.x * px + n.x * py,
        p.y + b.y * px + n.y * py,
        p.z + b.z * px + n.z * py,
      );
      uvs.push(u, j / ring);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < ring; j++) {
      const a = i * ring + j;
      const bb = i * ring + ((j + 1) % ring);
      const c = (i + 1) * ring + j;
      const d = (i + 1) * ring + ((j + 1) % ring);
      indices.push(a, c, bb, bb, c, d);
    }
  }

  if (caps) {
    // Separate cap vertices so the caps shade flat.
    for (const end of [0, segments]) {
      const base = positions.length / 3;
      const centre = new Vector3();
      for (let j = 0; j < ring; j++) {
        const o = (end * ring + j) * 3;
        positions.push(positions[o], positions[o + 1], positions[o + 2]);
        uvs.push(end / segments, j / ring);
        centre.x += positions[o] / ring;
        centre.y += positions[o + 1] / ring;
        centre.z += positions[o + 2] / ring;
      }
      positions.push(centre.x, centre.y, centre.z);
      uvs.push(end / segments, 0.5);
      const c = base + ring;
      for (let j = 0; j < ring; j++) {
        const a = base + j;
        const bb = base + ((j + 1) % ring);
        if (end === 0) indices.push(c, bb, a);
        else indices.push(c, a, bb);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Rounded-rectangle profile (width × height, corner radius), counter-clockwise. */
export function roundedRect(width: number, height: number, radius: number, corner = 3): Vector2[] {
  const r = Math.min(radius, width / 2, height / 2);
  const hw = width / 2 - r;
  const hh = height / 2 - r;
  const pts: Vector2[] = [];
  const centres: [number, number, number][] = [
    [hw, -hh, -Math.PI / 2],
    [hw, hh, 0],
    [-hw, hh, Math.PI / 2],
    [-hw, -hh, Math.PI],
  ];
  for (const [cx, cy, start] of centres) {
    for (let i = 0; i <= corner; i++) {
      const a = start + (i / corner) * (Math.PI / 2);
      pts.push(new Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  }
  return pts;
}

/** Points along a circular arc in the XY plane (radius, from angle a0 to a1). */
export function arcPoints(radius: number, a0: number, a1: number, count: number, z = 0): Vector3[] {
  const pts: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const a = a0 + ((a1 - a0) * i) / (count - 1);
    pts.push(new Vector3(Math.cos(a) * radius, Math.sin(a) * radius, z));
  }
  return pts;
}

/** Soft taper: thin at both tips, full in the middle — a sculpted, non-extruded look. */
export const bladeTaper =
  (tip = 0.28, power = 0.6) =>
  (u: number) =>
    tip + (1 - tip) * Math.pow(Math.sin(Math.PI * u), power);
