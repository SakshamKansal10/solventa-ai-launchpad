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

import { frameGeometry, plateGeometry } from "../geometry/frames";
import { roundedRect, sweep } from "../geometry/sweep";

/**
 * Five opportunity architectures — miniature engineered DECISION OBJECTS,
 * never spheres or organic forms. Every family shares one anatomy, split by
 * material so a whole family is one draw call per part:
 *   seed   — dark graphite logic kernel
 *   frame  — titanium precision frame + directional connectors (the family's shape)
 *   shell  — the resolution surface: smoked glass while uncertain, pearl once confident
 *   energy — the confidence light (indigo while computing, gold when it fits)
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
  // A rounded-square frame holding twin optical panes.
  const frame = frameGeometry({
    hw: 0.44,
    hh: 0.44,
    bar: 0.075,
    depth: 0.07,
    radius: 0.12,
    curveSegments: 3,
    bevel: 0,
  });
  const panes = [-0.09, 0.09].map((z) => {
    const g = plateGeometry(0.27, 0.27, 0.02, 0.07, 0, 3);
    g.translate(0, 0, z);
    return g;
  });
  return {
    seed: new RoundedBoxGeometry(0.16, 0.16, 0.16, 1, 0.03),
    frame: merge([frame, ...connectors()]),
    shell: merge(panes),
    energy: new RoundedBoxGeometry(0.12, 0.12, 0.12, 1, 0.02),
  };
}

function product(): FamilyGeometry {
  // A pearl lens held in a champagne U-bracket.
  const lens = new LatheGeometry(
    [
      [0, -0.08],
      [0.18, -0.05],
      [0.25, -0.02],
      [0.27, 0],
      [0.25, 0.02],
      [0.18, 0.05],
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
    energy: place(new IcosahedronGeometry(0.085, 1), [0, 0, 0.1]),
  };
}

function media(): FamilyGeometry {
  // A portrait frame with three signal bars (a channel), behind a vertical pane.
  const frame = frameGeometry({
    hw: 0.27,
    hh: 0.46,
    bar: 0.045,
    depth: 0.06,
    radius: 0.08,
    curveSegments: 3,
    bevel: 0,
  });
  const bars = [-0.16, 0, 0.16].map((y, k) =>
    place(new RoundedBoxGeometry(0.3 - k * 0.06, 0.035, 0.04, 1, 0.01), [0, y, 0.02]),
  );
  const pane = plateGeometry(0.17, 0.33, 0.02, 0.05, 0, 3);
  pane.translate(0, 0, -0.07);
  const seed = new CapsuleGeometry(0.06, 0.2, 3, 8);
  seed.rotateZ(Math.PI / 2);
  seed.translate(0, 0, -0.16);
  return {
    seed,
    frame: merge([frame, ...bars, ...connectors()]),
    shell: pane,
    energy: new RoundedBoxGeometry(0.05, 0.36, 0.05, 1, 0.01),
  };
}

function local(): FamilyGeometry {
  // A diamond frame on a vertical locator pin — a position held precisely.
  const frame = frameGeometry({
    hw: 0.36,
    hh: 0.36,
    bar: 0.05,
    depth: 0.06,
    radius: 0.06,
    curveSegments: 3,
    bevel: 0,
  });
  frame.rotateZ(Math.PI / 4);
  const pane = plateGeometry(0.2, 0.2, 0.02, 0.03, 0, 3);
  pane.rotateZ(Math.PI / 4);
  return {
    seed: new OctahedronGeometry(0.13, 0),
    frame: merge([frame, rod([0, -0.62, 0], [0, 0.62, 0], 0.016), ...connectors()]),
    shell: pane,
    energy: place(new RoundedBoxGeometry(0.11, 0.11, 0.11, 1, 0.02), [0, 0, 0.08]),
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
    shell: new CylinderGeometry(r * 0.78, r * 0.78, h * 0.84, 3, 1),
    energy: new RoundedBoxGeometry(0.1, 0.22, 0.1, 1, 0.02),
  };
}

export function buildFamilies(): FamilyGeometry[] {
  return [studio(), product(), media(), local(), venture()];
}
