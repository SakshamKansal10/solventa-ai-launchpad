import { Euler, Matrix4, Quaternion, Vector3 } from "three";

import { smoothstep } from "../../math";
import { local, progressOf, ramp } from "../../timeline/timeline";
import { contextResponse } from "../context/context-model";
import { SLAB_CENTRE, SLAB_NORMAL } from "../product/product-model";
import { arrivalWindow, FRAMES, KERNEL, PORTS, TELESCOPE } from "./core-design";

/** Layers in gimbal order: the six frames, then the kernel. */
export const LAYERS = FRAMES.length + 1;

export interface EnginePose {
  visible: boolean;
  /** Engine placement (core-local origin for the opening, the product's place for the finale). */
  position: [number, number, number];
  yaw: number;
  pitch: number;
  /** Relative gimbal angle per layer (frames f1…f6, kernel). */
  angles: number[];
  /** Relative z offset per layer (telescoping). */
  offsets: number[];
  /** Per-layer arrival 0 → 1 (origin: flight in; finale: growth from the kernel). */
  arrive: number[];
  /** 1 = gimbal pins locked, 0 = retracted (free to telescope). */
  pins: number;
  /** How far each kernel half has slid aside (world units). */
  part: number;
  /** Kernel ignition and inference energy. */
  wake: number;
  energy: number;
  /** Ports and channels: how docked each founder signal is. */
  docked: number[];
  pulse: number;
  /** Aperture hairlines lit, per frame (they come on in sequence down the tunnel). */
  lit: boolean[];
  /** Distant glints seen through the aperture before the reveal. */
  hint: number;
}

const ORIGIN_PLACE: [number, number, number] = [0, 0, 0];
const FINALE_PLACE: [number, number, number] = [
  SLAB_CENTRE.x,
  SLAB_CENTRE.y + 1.2,
  SLAB_CENTRE.z - 6,
];
/** The finale engine turns its face toward the visitor (who stands on the product's normal). */
export const FINALE_YAW = Math.atan2(SLAB_NORMAL.x, SLAB_NORMAL.z);

/** A precise mechanical move: quick, then a soft landing (no overshoot). */
const settle = (x: number) => {
  const t = x <= 0 ? 0 : x >= 1 ? 1 : x;
  return 1 - Math.pow(1 - t, 3);
};

export function enginePose(p: number, finale: boolean): EnginePose {
  const angles = FRAMES.map((f) => f.rest).concat(KERNEL.rest);
  const offsets = new Array<number>(LAYERS).fill(0);
  if (finale) {
    const a = ramp(p, "return", 0.6, "finale", 0.6);
    const arrive = angles.map((_, i) => {
      const order = LAYERS - 1 - i;
      return settle((a - order * 0.075) / 0.42);
    });
    // Arrives in its working pose, then resolves: every layer aligns into one calm emblem.
    const resolve = smoothstep(0.55, 0.95, a);
    for (let i = 0; i < LAYERS; i++) {
      angles[i] *= 1 - resolve;
      offsets[i] = i === 0 ? 0 : -0.16 * resolve;
    }
    return {
      visible: p > progressOf("return", 0.55),
      position: FINALE_PLACE,
      yaw: FINALE_YAW + 0.32 * (1 - resolve) + 0.16 * resolve,
      pitch: -0.08,
      angles,
      offsets,
      arrive,
      pins: 1 - resolve,
      part: 0,
      wake: smoothstep(0.05, 0.4, a),
      energy: 0.7 + 0.3 * resolve,
      docked: [1, 1, 1, 1, 1, 1],
      pulse: 0,
      lit: FRAMES.map((_, i) => resolve > 0.5 + (FRAMES.length - 1 - i) * 0.06),
      hint: 0,
    };
  }

  const a = local(p, "awakening");
  const s = local(p, "passage");
  const ctx = contextResponse(p);
  const docked = [ctx.capital, ctx.skills, ctx.location, ctx.time, ctx.experience, ctx.access];
  // Each founder signal turns one inner layer, precisely.
  docked.forEach((d, i) => {
    angles[i + 1] += PORTS[i].step * settle(d);
  });
  // The passage: layers align outer → inner (a gimbal unlocking), pins retract, the layers
  // slide back into a narrowing square tunnel, then the kernel parts.
  for (let i = 0; i < LAYERS; i++) {
    const align = smoothstep(0.02 + i * 0.045, 0.15 + i * 0.045, s);
    angles[i] *= 1 - align;
    const tel = smoothstep(0.38 + i * 0.03, 0.56 + i * 0.03, s);
    offsets[i] = (i === 0 ? TELESCOPE.first : i === LAYERS - 1 ? 0 : TELESCOPE.step) * tel;
  }
  const arrive = angles.map((_, i) => {
    if (i === LAYERS - 1) return smoothstep(0.0, 0.12, a);
    const [w0, w1] = arrivalWindow(i);
    return (a - w0) / (w1 - w0);
  });
  const wake = smoothstep(0.0, 0.16, a);
  return {
    visible: p < progressOf("universe", 0.14),
    position: ORIGIN_PLACE,
    yaw: 0,
    pitch: 0,
    angles,
    offsets,
    arrive,
    pins: 1 - smoothstep(0.34, 0.42, s),
    part: 1.08 * smoothstep(0.56, 0.74, s),
    wake,
    energy:
      wake * (0.45 + 0.08 * docked.reduce((x, y) => x + y, 0)) + 0.9 * smoothstep(0.6, 0.8, s),
    docked,
    pulse: ctx.pulse,
    lit: FRAMES.map((_, i) => s > 0.42 + i * 0.045),
    hint: smoothstep(0.64, 0.82, s) * (1 - smoothstep(0.95, 1, s)),
  };
}

const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Y = new Vector3(0, 1, 0);
const scratch = { q: new Quaternion(), m: new Matrix4(), e: new Euler(), v: new Vector3() };

/** The engine's placement matrix. */
export function placement(pose: EnginePose, out: Matrix4): Matrix4 {
  scratch.e.set(pose.pitch, pose.yaw, 0, "YXZ");
  scratch.q.setFromEuler(scratch.e);
  return out.compose(scratch.v.set(...pose.position), scratch.q, new Vector3(1, 1, 1));
}

/** World matrices of every layer along the gimbal chain (no allocation after the first call). */
export function layerMatrices(pose: EnginePose, out: Matrix4[]): Matrix4[] {
  const parent = placement(pose, out[LAYERS] ?? (out[LAYERS] = new Matrix4()));
  let prev = parent;
  for (let i = 0; i < LAYERS; i++) {
    const axis = i < FRAMES.length ? FRAMES[i].axis : KERNEL.axis;
    scratch.q.setFromAxisAngle(axis === "x" ? AXIS_X : AXIS_Y, pose.angles[i]);
    scratch.m.compose(scratch.v.set(0, 0, pose.offsets[i]), scratch.q, new Vector3(1, 1, 1));
    const m = out[i] ?? (out[i] = new Matrix4());
    m.multiplyMatrices(prev, scratch.m);
    prev = m;
  }
  return out;
}

/** Port i's world position at rest (where a founder signal docks), on the outer frame's face. */
export function portPosition(i: number, out = new Vector3()): Vector3 {
  const f1 = FRAMES[0];
  out.set(PORTS[i].x, PORTS[i].y, f1.depth / 2 + 0.22);
  return out.applyAxisAngle(AXIS_Y, f1.rest);
}
