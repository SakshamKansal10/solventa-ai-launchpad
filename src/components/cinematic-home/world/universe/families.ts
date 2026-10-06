import {
  CapsuleGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  Matrix4,
  OctahedronGeometry,
  Quaternion,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { arcPoints, roundedRect, sweep } from "../geometry/sweep";

/**
 * Five opportunity architectures — miniature engineered objects, never spheres.
 * Each is split by material so a whole family is one draw call per part:
 *   seed   — dark central seed
 *   frame  — champagne structure + directional connectors
 *   shell  — the pearl surface (rendered as glass while the fit is uncertain)
 *   energy — the restrained internal light (tinted per instance)
 * Node-local units: about 1 across; +z faces "forward" (aligned = facing the visitor).
 */
export interface FamilyGeometry {
  seed: BufferGeometry;
  frame: BufferGeometry;
  shell: BufferGeometry;
  energy: BufferGeometry;
}

const Y = new Vector3(0, 1, 0);
const flat = (g: BufferGeometry) => (g.index ? g.toNonIndexed() : g);
const merge = (parts: BufferGeometry[]) => {
  const out = mergeGeometries(parts.map(flat));
  parts.forEach((p) => p !== out && p.dispose());
  return out;
};
const place = (g: BufferGeometry, pos: [number, number, number], dir?: Vector3, rotZ = 0) => {
  const q = dir
    ? new Quaternion().setFromUnitVectors(Y, dir.clone().normalize())
    : new Quaternion();
  if (rotZ) q.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), rotZ));
  g.applyMatrix4(new Matrix4().compose(new Vector3(...pos), q, new Vector3(1, 1, 1)));
  return g;
};
const rod = (from: [number, number, number], to: [number, number, number], r = 0.016) => {
  const a = new Vector3(...from);
  const b = new Vector3(...to);
  const len = a.distanceTo(b);
  const g = new CylinderGeometry(r, r, len, 6, 1);
  return place(g, [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2], b.clone().sub(a));
};
/** Short champagne connectors: where filaments plug in. */
const connectors = () => [
  rod([0, 0, 0.3], [0, 0, 0.62], 0.014),
  rod([0, 0, -0.3], [0, 0, -0.55], 0.014),
];

function studio(): FamilyGeometry {
  // Diamond frame with twin curved plates.
  const s = 0.46;
  const edges: [number, number, number][][] = [
    [
      [0, s, 0],
      [s, 0, 0],
    ],
    [
      [s, 0, 0],
      [0, -s, 0],
    ],
    [
      [0, -s, 0],
      [-s, 0, 0],
    ],
    [
      [-s, 0, 0],
      [0, s, 0],
    ],
  ];
  const frame = merge([...edges.map(([a, b]) => rod(a, b, 0.022)), ...connectors()]);
  const plate = (side: number) =>
    sweep(
      arcPoints(0.62, Math.PI / 2 - 0.55 * side - 0.35, Math.PI / 2 - 0.55 * side + 0.35, 6).map(
        (v) => new Vector3(v.x, 0, -v.y + 0.62),
      ),
      roundedRect(0.04, 0.5, 0.015, 2),
      { segments: 10 },
    );
  return {
    seed: new OctahedronGeometry(0.17, 0),
    frame,
    shell: merge([plate(1), plate(-1)]),
    energy: new RoundedBoxGeometry(0.09, 0.09, 0.09, 1, 0.02),
  };
}

function product(): FamilyGeometry {
  // A pearl lens held in a champagne U-bracket.
  const lens = new LatheGeometry(
    [
      [0, -0.08],
      [0.22, -0.06],
      [0.32, -0.02],
      [0.34, 0],
      [0.32, 0.02],
      [0.22, 0.06],
      [0, 0.08],
    ].map(([x, y]) => new Vector2(x, y)),
    18,
  );
  lens.rotateX(Math.PI / 2);
  // A fine champagne rim around the lens, held by two clamps — an optical instrument.
  const rimPts = Array.from({ length: 33 }, (_, i) => {
    const t = (i / 32) * Math.PI * 2;
    return new Vector3(Math.cos(t) * 0.375, Math.sin(t) * 0.375, 0);
  });
  const rim = sweep(rimPts, roundedRect(0.035, 0.07, 0.015, 2), {
    segments: 28,
    up: new Vector3(0, 0, 1),
    caps: false,
  });
  const clamps = [1, -1].map((side) =>
    place(new RoundedBoxGeometry(0.1, 0.16, 0.12, 1, 0.02), [side * 0.4, 0, 0]),
  );
  const seed = new CapsuleGeometry(0.08, 0.26, 3, 8);
  seed.rotateZ(Math.PI / 2);
  seed.translate(0, 0, -0.18);
  return {
    seed,
    frame: merge([rim, ...clamps, ...connectors()]),
    shell: lens,
    energy: place(new IcosahedronGeometry(0.06, 1), [0, 0, 0.1]),
  };
}

function media(): FamilyGeometry {
  // A spindle with three fins and a pearl collar band.
  const spindle = new LatheGeometry(
    [
      [0, -0.5],
      [0.05, -0.38],
      [0.11, 0],
      [0.05, 0.38],
      [0, 0.5],
    ].map(([x, y]) => new Vector2(x, y)),
    10,
  );
  const fins = [0, 1, 2].map((k) => {
    const a = (k / 3) * Math.PI * 2;
    const fin = new RoundedBoxGeometry(0.03, 0.66, 0.2, 1, 0.01);
    fin.translate(0, 0, 0.22);
    fin.rotateY(a);
    return fin;
  });
  const band = new LatheGeometry(
    [
      [0.26, -0.07],
      [0.31, -0.07],
      [0.33, 0],
      [0.31, 0.07],
      [0.26, 0.07],
    ].map(([x, y]) => new Vector2(x, y)),
    16,
  );
  return {
    seed: spindle,
    frame: merge([...fins, ...connectors()]),
    shell: band,
    energy: new RoundedBoxGeometry(0.035, 0.3, 0.035, 1, 0.01),
  };
}

function local(): FamilyGeometry {
  // A curved petal shell crossed by two pins.
  const petal = sweep(
    arcPoints(0.48, Math.PI * 0.12, Math.PI * 0.88, 9).map((v) => new Vector3(v.x, 0, -v.y + 0.3)),
    roundedRect(0.045, 0.52, 0.02, 2),
    { segments: 16, taper: (u) => 0.55 + 0.45 * Math.sin(Math.PI * u) },
  );
  return {
    seed: new IcosahedronGeometry(0.16, 1),
    frame: merge([
      rod([-0.4, -0.3, 0], [0.4, 0.3, 0], 0.018),
      rod([-0.4, 0.3, 0], [0.4, -0.3, 0], 0.018),
      ...connectors(),
    ]),
    shell: petal,
    energy: place(new IcosahedronGeometry(0.055, 0), [0, 0, 0.12]),
  };
}

function venture(): FamilyGeometry {
  // A prism: pearl body, champagne edges, a small dark seed inside.
  const r = 0.4;
  const h = 0.8;
  const corner = (k: number, y: number): [number, number, number] => {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 2;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  };
  const edges = [0, 1, 2].flatMap((k) => [
    rod(corner(k, -h / 2), corner(k, h / 2), 0.018),
    rod(corner(k, h / 2), corner((k + 1) % 3, h / 2), 0.018),
    rod(corner(k, -h / 2), corner((k + 1) % 3, -h / 2), 0.018),
  ]);
  return {
    seed: new OctahedronGeometry(0.13, 0),
    frame: merge([...edges, ...connectors()]),
    shell: new CylinderGeometry(r * 0.94, r * 0.94, h * 0.96, 3, 1),
    energy: new RoundedBoxGeometry(0.07, 0.16, 0.07, 1, 0.02),
  };
}

export function buildFamilies(): FamilyGeometry[] {
  return [studio(), product(), media(), local(), venture()];
}
