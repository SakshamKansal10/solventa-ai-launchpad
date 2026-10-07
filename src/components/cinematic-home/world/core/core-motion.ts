import { Vector3 } from "three";

import { smoothstep } from "../../math";
import { local, progressOf, ramp } from "../../timeline/timeline";
import { contextResponse } from "../context/context-model";
import { SLAB_CENTRE, SLAB_NORMAL } from "../product/product-model";
import { ASSEMBLY, CHANNEL, PORTS, portLocal, S_SCALE, WAFER_Z } from "./core-design";

export interface ChannelPose {
  /** Offset from the channel's rest place (world units) and rotation (radians, xyz). */
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  /** 0 → 1 arrival (0 = not yet visible). */
  arrive: number;
}

export interface WaferPose {
  arrive: number;
  /** Rest z plus any settling offset. */
  z: number;
  /** Calibration slide (x) from a founder signal. */
  slide: number;
  /** Aperture: how far each half has moved aside (world units). */
  split: number;
  /** Trace / inference brightness 0 → 1. */
  glow: number;
}

export interface EnginePose {
  visible: boolean;
  /** Engine placement: the origin for the opening, the product's place for the finale. */
  position: [number, number, number];
  yaw: number;
  pitch: number;
  channels: [ChannelPose, ChannelPose];
  wafers: WaferPose[];
  /** Reference channels drawing the S (0 → 1), and their fade once the metal is in place. */
  blueprint: number;
  blueprintFade: number;
  connectors: number;
  /** Kernel activation and inference energy. */
  kernel: number;
  energy: number;
  /** The gold inner light along the S (the logo's lit counter). */
  seam: number;
  /** Energy travelling along the S's centre channels (0 → 1 drawn). */
  route: number;
  docked: number[];
  pulse: number;
  /** Gold signal leading the camera into the aperture (0 = none … 1 = gone deep). */
  signal: number;
  /** Faint structure far ahead, glimpsed through the aperture. */
  hint: number;
}

const ORIGIN_PLACE: [number, number, number] = [0, 0, 0];
/** Where the S emblem resolves in the finale (behind the receding product surface). */
export const FINALE_PLACE: [number, number, number] = [
  SLAB_CENTRE.x,
  SLAB_CENTRE.y + 1.4,
  SLAB_CENTRE.z - 6,
];
/** The finale engine faces the visitor (who stands on the product's normal). */
export const FINALE_YAW = Math.atan2(SLAB_NORMAL.x, SLAB_NORMAL.z);

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** A precise mechanical move: quick, then a soft landing (no overshoot). */
const settle = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const within = (a: number, [w0, w1]: [number, number]) => clamp01((a - w0) / (w1 - w0));

function restChannel(arrive: number): ChannelPose {
  return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, arrive };
}

export function enginePose(p: number, finale: boolean): EnginePose {
  if (finale) {
    // The return: the S reappears — first as light, then as structure — and resolves.
    const a = ramp(p, "return", 0.3, "finale", 0.5);
    const resolve = smoothstep(0.62, 0.95, a);
    const wafers = WAFER_Z.map((z, j) => ({
      arrive: settle((a - 0.42 - j * 0.04) / 0.24),
      z,
      slide: 0,
      split: 0,
      // In the emblem the kernel is quiet: the counter reads as lit space, as on the logo.
      glow: 0.3 * smoothstep(0.6, 0.9, a),
    }));
    const c0 = settle((a - 0.14) / 0.34);
    const c1 = settle((a - 0.24) / 0.34);
    return {
      visible: p > progressOf("return", 0.28),
      position: FINALE_PLACE,
      yaw: FINALE_YAW + 0.16 * (1 - resolve) + 0.07,
      pitch: -0.03,
      // As at the beginning, each half of the S descends onto the line of light already drawn
      // for it, from just in front of the emblem — it lands, it does not fly in from elsewhere.
      channels: [
        {
          x: -1.6 * (1 - c0),
          y: 1.2 * (1 - c0),
          z: 7 * (1 - c0),
          rx: 0.28 * (1 - c0),
          ry: -0.34 * (1 - c0),
          rz: 0.12 * (1 - c0),
          arrive: c0,
        },
        {
          x: 1.6 * (1 - c1),
          y: -1.2 * (1 - c1),
          z: 7 * (1 - c1),
          rx: -0.28 * (1 - c1),
          ry: 0.34 * (1 - c1),
          rz: -0.12 * (1 - c1),
          arrive: c1,
        },
      ],
      wafers,
      blueprint: smoothstep(0.0, 0.3, a),
      blueprintFade: smoothstep(0.5, 0.75, a),
      connectors: smoothstep(0.5, 0.68, a),
      kernel: smoothstep(0.55, 0.85, a),
      energy: 0.6 + 0.4 * resolve,
      seam: smoothstep(0.58, 0.95, a),
      route: smoothstep(0.62, 0.95, a),
      docked: [1, 1, 1, 1, 1, 1],
      pulse: 0,
      signal: 0,
      hint: 0,
    };
  }

  const a = local(p, "awakening");
  const s = local(p, "passage");
  const ctx = contextResponse(p);
  const docked = [ctx.capital, ctx.skills, ctx.location, ctx.time, ctx.experience, ctx.access];

  // The aperture: the channels part (point-symmetric), each wafer splits, front first.
  const open = smoothstep(0.1, 0.42, s);
  const channels: [ChannelPose, ChannelPose] = [
    restChannel(within(a, ASSEMBLY.channels[0] as [number, number])),
    restChannel(within(a, ASSEMBLY.channels[1] as [number, number])),
  ];
  channels[0].x = -1.1 * open;
  channels[0].y = 0.45 * open;
  channels[0].ry = -0.22 * open;
  channels[1].x = 1.1 * open;
  channels[1].y = -0.45 * open;
  channels[1].ry = 0.22 * open;

  const kernel = smoothstep(ASSEMBLY.kernel[0], ASSEMBLY.kernel[1], a);
  const wafers = WAFER_Z.map((z, j) => {
    const arrive = within(a, ASSEMBLY.wafer(j));
    // Each founder signal calibrates one wafer: a precise lateral step.
    const slide = j < docked.length ? (j % 2 ? 1 : -1) * 0.14 * settle(docked[j]) : 0;
    // The iris opens while the lens is still a detail in frame; the planes then turn like a lock.
    const split =
      1.3 * (j === 0 ? smoothstep(0.32, 0.47, s) : smoothstep(0.38 + j * 0.04, 0.54 + j * 0.04, s));
    return {
      arrive,
      z,
      slide: slide * (1 - open),
      split,
      glow:
        kernel * (0.5 + 0.1 * docked.reduce((x, y) => x + y, 0)) + 0.6 * smoothstep(0.35, 0.6, s),
    };
  });

  return {
    visible: p < progressOf("universe", 0.14),
    position: ORIGIN_PLACE,
    yaw: 0,
    pitch: 0,
    channels,
    wafers,
    blueprint: smoothstep(ASSEMBLY.blueprint[0], ASSEMBLY.blueprint[1], a),
    blueprintFade: smoothstep(0.55, 0.8, a),
    connectors: smoothstep(ASSEMBLY.connectors[0], ASSEMBLY.connectors[1], a),
    kernel,
    energy:
      kernel * (0.45 + 0.08 * docked.reduce((x, y) => x + y, 0)) + 0.9 * smoothstep(0.6, 0.8, s),
    // Peripheral light dims as the camera closes on the aperture.
    seam: smoothstep(0.66, 0.92, a) * (1 - 0.85 * smoothstep(0.3, 0.46, s)),
    route: smoothstep(0.86, 1, a),
    docked,
    pulse: ctx.pulse,
    signal: clamp01((s - 0.34) / 0.52),
    hint: 0,
  };
}

/** Port i's world position at rest (where a founder signal docks), off the channel's outer edge. */
export function portPosition(i: number, out = new Vector3()): Vector3 {
  const { x, y, nx, ny } = portLocal(i);
  const sign = PORTS[i].channel === 0 ? 1 : -1;
  return out.set(
    sign * (x * S_SCALE + nx * 0.42),
    sign * (y * S_SCALE + ny * 0.42),
    CHANNEL.depth / 2 + 0.25,
  );
}
