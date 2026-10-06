import { CatmullRomCurve3, Matrix4, Quaternion, Vector3 } from "three";

import { mulberry32, smoothstep } from "../../math";
import { local, progressOf } from "../../timeline/timeline";
import { FINALS_HUB } from "../layout";

/**
 * The execution path as DATA. Its gates are the SAME machined portal frames
 * that formed the chosen opportunity: a tight, twisting nest of frames that
 * telescopes out along the path (Unfold). Each gate is assembled from four
 * corner brackets and four bars: in Validate the bars hang open in smoked
 * glass (an untested plan); in Build they slide in, lock and turn to titanium;
 * in Elevate the path climbs and branches into a network. Contradictory
 * evidence unlocks the gates ahead (Crisis) and they are physically rebuilt
 * onto a revised direction (Adaptation).
 * Pure functions of progress — fully reversible.
 */

/** The chosen opportunity's sculpture sits centre-back of the final three. */
export const WINNER_POS: [number, number, number] = [
  FINALS_HUB[0],
  FINALS_HUB[1] + 4.2,
  FINALS_HUB[2] - 7,
];

export const GATE_SPACING = 5.6;
/** Frames that formed the chosen sculpture (the first gates of the path). */
export const SCULPTURE_ARCHES = 14;
/** The gate where contradictory evidence lands (the assumption). */
export const ASSUMPTION_GATE = 26;
/** Gates ahead of the assumption that destabilise and are rebuilt elsewhere. */
export const UNSTABLE = [27, 28, 29, 30, 31, 32, 33] as const;

/** Portal geometry in gate-local space: x across, y up, z along the path. */
export const GATE = {
  hw: 3.4,
  hh: 2.9,
  centreY: -0.3,
  radius: 0.85,
  bar: 0.24,
  depth: 0.42,
  stub: 0.5,
} as const;

const ORIGINAL_POINTS: [number, number, number][] = [
  [WINNER_POS[0], WINNER_POS[1], WINNER_POS[2]],
  [5.8, 3.0, -76],
  [4.4, 2.6, -102],
  [2.8, 2.9, -130],
  // Elevate: the path gains altitude.
  [1.3, 4.6, -158],
  [0.1, 5.9, -184],
  [-0.8, 6.5, -208],
  [-1.6, 6.8, -232],
  [-2.2, 7.0, -256],
];

export const originalPath = new CatmullRomCurve3(
  ORIGINAL_POINTS.map((p) => new Vector3(...p)),
  false,
  "centripetal",
);
const ORIGINAL_LENGTH = originalPath.getLength();

function pointAtDistance(curve: CatmullRomCurve3, length: number, d: number, out: Vector3) {
  return curve.getPointAt(Math.min(1, Math.max(0, d / length)), out);
}
function tangentAtDistance(curve: CatmullRomCurve3, length: number, d: number, out: Vector3) {
  return curve.getTangentAt(Math.min(1, Math.max(0, d / length)), out);
}

/** Distance along the original path of gate i. */
export const gateDistance = (i: number) => 4 + i * GATE_SPACING;

const branchPoint = pointAtDistance(
  originalPath,
  ORIGINAL_LENGTH,
  gateDistance(ASSUMPTION_GATE),
  new Vector3(),
);
const branchTangent = tangentAtDistance(
  originalPath,
  ORIGINAL_LENGTH,
  gateDistance(ASSUMPTION_GATE),
  new Vector3(),
);

/** The revised direction: leaves the assumption gate, turning right and rising. */
export const revisedPath = new CatmullRomCurve3(
  [
    branchPoint.clone(),
    branchPoint
      .clone()
      .addScaledVector(branchTangent, 7)
      .add(new Vector3(1.2, 0.2, 0)),
    branchPoint.clone().add(new Vector3(8.5, 0.8, -15)),
    branchPoint.clone().add(new Vector3(16, 1.4, -26)),
    branchPoint.clone().add(new Vector3(22, 1.8, -40)),
    branchPoint.clone().add(new Vector3(26, 2.0, -56)),
  ],
  false,
  "centripetal",
);
const REVISED_LENGTH = revisedPath.getLength();

/** Where the product surface emerges: just past the last rebuilt gate. */
export const PRODUCT_ANCHOR = (() => {
  const p = pointAtDistance(
    revisedPath,
    REVISED_LENGTH,
    (UNSTABLE.length + 1.4) * GATE_SPACING,
    new Vector3(),
  );
  return [p.x, p.y + 0.2, p.z] as [number, number, number];
})();

export interface GateFrame {
  position: Vector3;
  quaternion: Quaternion;
  scale: number;
}

const UP = new Vector3(0, 1, 0);
const m4 = new Matrix4();
const tmpT = new Vector3();
const tmpP = new Vector3();

/** Orientation whose local +z runs along `tangent` (gates face the traveller). */
function alongQuaternion(tangent: Vector3, out: Quaternion) {
  m4.lookAt(new Vector3(), tangent.clone().negate(), UP);
  return out.setFromRotationMatrix(m4);
}

/** Gate i's resting frame on the ORIGINAL path. */
export function originalFrame(i: number, out: GateFrame): GateFrame {
  const d = gateDistance(i);
  pointAtDistance(originalPath, ORIGINAL_LENGTH, d, out.position);
  tangentAtDistance(originalPath, ORIGINAL_LENGTH, d, tmpT);
  alongQuaternion(tmpT, out.quaternion);
  out.scale = 1;
  return out;
}

/** Slot j on the REVISED path (j = 0 is the first rebuilt gate). */
export function revisedFrame(j: number, out: GateFrame): GateFrame {
  const d = (j + 1) * GATE_SPACING;
  pointAtDistance(revisedPath, REVISED_LENGTH, d, out.position);
  tangentAtDistance(revisedPath, REVISED_LENGTH, d, tmpT);
  alongQuaternion(tmpT, out.quaternion);
  out.scale = 1;
  return out;
}

/** Frame i inside the chosen sculpture: a tight nest that twists as it recedes. */
export function sculptureFrame(i: number, out: GateFrame): GateFrame {
  const depth = i * 0.34;
  originalFrame(0, out);
  tmpT.set(0, 0, -1).applyQuaternion(out.quaternion);
  out.position
    .set(WINNER_POS[0], WINNER_POS[1] + 0.9, WINNER_POS[2])
    .addScaledVector(tmpT, depth - 2.2);
  const twist = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), i * 0.21 - 0.9);
  out.quaternion.multiply(twist);
  out.scale = 0.62 - i * 0.018;
  return out;
}

export interface GateState extends GateFrame {
  /** 0 → 1 visibility (arrival). */
  present: number;
  /** 0 = provisional glass, 1 = ceramic. */
  solid: number;
  /** The bars: 0 = hanging open, unlocked; 1 = slid in and locked. */
  crown: number;
  /** Instability from contradictory evidence (0 → 1). */
  unstable: number;
  /** The gate is offset/rotated by instability (per-gate seeded). */
  wobble: [number, number, number];
}

export function createGateState(): GateState {
  return {
    position: new Vector3(),
    quaternion: new Quaternion(),
    scale: 1,
    present: 0,
    solid: 0,
    crown: 0,
    unstable: 0,
    wobble: [0, 0, 0],
  };
}

const seeds = Array.from({ length: 64 }, (_, i) => {
  const r = mulberry32(500 + i * 31);
  return [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1] as [number, number, number];
});

const tmpFrame = { position: new Vector3(), quaternion: new Quaternion(), scale: 1 };
const tmpFrame2 = { position: new Vector3(), quaternion: new Quaternion(), scale: 1 };

/** Every gate's state at progress p (writes into `out`). */
export function gateState(i: number, p: number, out: GateState): GateState {
  const unfold = local(p, "unfold");
  // 1) Where it is: sculpture → original path (telescoping) → revised path (adaptation).
  originalFrame(i, out);
  let telescope = 1;
  if (i < SCULPTURE_ARCHES) {
    telescope = smoothstep(0.08 + i * 0.035, 0.42 + i * 0.035, unfold);
    sculptureFrame(i, tmpFrame);
    out.position.lerpVectors(tmpFrame.position, out.position, telescope);
    out.quaternion.slerpQuaternions(tmpFrame.quaternion, out.quaternion, telescope);
    out.scale = tmpFrame.scale + (1 - tmpFrame.scale) * telescope;
    // The sculpture emerges where its opportunity stood, as the final three appear.
    out.present = smoothstep(0.04 + i * 0.012, 0.3 + i * 0.012, local(p, "three"));
  } else {
    // Further gates unfold out of the path ahead as it extends, rising into place.
    const a =
      smoothstep(
        0.5 + (i - SCULPTURE_ARCHES) * 0.022,
        0.62 + (i - SCULPTURE_ARCHES) * 0.022,
        unfold,
      ) + (p > progressOf("unfold", 1) ? 1 : 0);
    const arrive = Math.min(1, a);
    out.position.y -= (1 - arrive) * 7;
    out.scale *= 0.6 + 0.4 * arrive;
    out.present = arrive;
  }

  // 2) Construction: Validate is provisional; Build locks crowns and solidifies; Elevate grows.
  const build = smoothstep(progressOf("build", 0), progressOf("build", 0.75), p);
  const lockDelay = (i % 12) * 0.02;
  out.crown = smoothstep(lockDelay, lockDelay + 0.5, build);
  out.solid = smoothstep(0.1 + lockDelay, 0.6 + lockDelay, build);
  if (i < SCULPTURE_ARCHES) {
    // As a sculpture it is complete, gaining solidity while it is chosen; as it
    // telescopes into a path it becomes provisional again — a plan to validate.
    const chosen =
      0.3 + 0.7 * smoothstep(progressOf("selection", 0.15), progressOf("selection", 0.8), p);
    out.crown = 1 + (out.crown - 1) * telescope;
    out.solid = chosen + (out.solid - chosen) * telescope;
  }
  const elevate = smoothstep(progressOf("elevate", 0), progressOf("elevate", 0.8), p);
  out.scale *= 1 + 0.32 * elevate * smoothstep(8, 20, i);

  // 3) Crisis: instability propagates forward from the assumption gate.
  out.unstable = 0;
  out.wobble = [0, 0, 0];
  const k = UNSTABLE.indexOf(i as (typeof UNSTABLE)[number]);
  if (i === ASSUMPTION_GATE || k >= 0) {
    const crisis = local(p, "crisis");
    const start = i === ASSUMPTION_GATE ? 0 : 0.12 + k * 0.08;
    out.unstable = smoothstep(start, start + 0.45, crisis) * (i === ASSUMPTION_GATE ? 0.35 : 1);
  }
  // 4) Adaptation: the unstable section relocates onto the revised direction and re-stabilises.
  if (k >= 0) {
    const adapt = local(p, "adaptation");
    const r = smoothstep(0.08 + k * 0.075, 0.42 + k * 0.075, adapt);
    if (r > 0) {
      revisedFrame(k, tmpFrame2);
      // A curved transfer: lifted mid-flight so components visibly travel through space.
      const lift = Math.sin(r * Math.PI) * 3.5;
      tmpP.lerpVectors(out.position, tmpFrame2.position, r);
      tmpP.y += lift;
      out.position.copy(tmpP);
      out.quaternion.slerp(tmpFrame2.quaternion, r);
      out.unstable *= 1 - r;
    }
  }
  if (i === ASSUMPTION_GATE) out.unstable *= 1 - smoothstep(0.3, 0.8, local(p, "adaptation"));
  const w = seeds[i % seeds.length];
  out.wobble = [w[0] * out.unstable, w[1] * out.unstable, w[2] * out.unstable];
  // Contradiction reads as lost solidity — the structure turns provisional again.
  out.solid *= 1 - 0.85 * out.unstable;
  out.crown *= 1 - 0.7 * out.unstable;
  return out;
}

/** Milestones hanging above the path (gate index, label, stage). */
export const MILESTONES: { gate: number; label: string; stage: "validate" | "build" }[] = [
  { gate: 3, label: "Speak to potential customers", stage: "validate" },
  { gate: 6, label: "Test the problem", stage: "validate" },
  { gate: 9, label: "Test willingness to pay", stage: "validate" },
  { gate: 13, label: "Create first prototype", stage: "build" },
  { gate: 16, label: "Gather early feedback", stage: "build" },
  { gate: 19, label: "Improve the offering", stage: "build" },
];

/** Camera position/target along the path at distance d (eye slightly above centre). */
export function pathEye(d: number): {
  position: [number, number, number];
  target: [number, number, number];
} {
  const p = pointAtDistance(originalPath, ORIGINAL_LENGTH, d, new Vector3());
  const t = pointAtDistance(originalPath, ORIGINAL_LENGTH, d + 16, new Vector3());
  return { position: [p.x, p.y + 0.45, p.z], target: [t.x, t.y + 0.2, t.z] };
}

/** Camera along the revised path at distance d. */
export function revisedEye(d: number): {
  position: [number, number, number];
  target: [number, number, number];
} {
  const p = pointAtDistance(revisedPath, REVISED_LENGTH, d, new Vector3());
  const t = pointAtDistance(revisedPath, REVISED_LENGTH, d + 14, new Vector3());
  return { position: [p.x, p.y + 0.5, p.z], target: [t.x, t.y + 0.2, t.z] };
}

/**
 * Camera beside / above the original path at distance d: `side` units to the
 * traveller's right (negative = left) and `up` above, looking `ahead` units on.
 */
export function sideEye(
  d: number,
  side: number,
  up: number,
  ahead = 14,
): { position: [number, number, number]; target: [number, number, number] } {
  const p = pointAtDistance(originalPath, ORIGINAL_LENGTH, d, new Vector3());
  const t = pointAtDistance(originalPath, ORIGINAL_LENGTH, d + ahead, new Vector3());
  const tangent = tangentAtDistance(originalPath, ORIGINAL_LENGTH, d, new Vector3());
  const right = new Vector3().crossVectors(tangent, UP).normalize();
  return {
    position: [p.x + right.x * side, p.y + up, p.z + right.z * side],
    target: [t.x, t.y - 0.6, t.z],
  };
}
