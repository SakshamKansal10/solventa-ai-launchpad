import { S_INNER, S_OUTER, type P2 } from "./s-mark";

/**
 * The Intelligence Core — "the Engine" — as DATA (pure, deterministic); built
 * into geometry by IntelligenceCore.tsx and posed by core-motion.ts.
 *
 * The Engine IS the Solventia S, engineered (s-mark.ts is traced from the real
 * logo). Three layers:
 *   A — structure: two point-symmetric titanium CHANNELS with the mark's exact
 *       crescent profiles: chamfered body, a machined inset cover, and the gold-lit
 *       inner rim facing the counter (the logo's inner light).
 *   B — kernel: a stack of smoked-glass computation WAFERS in the S's counter, with
 *       organised indigo routing and inference lights; each wafer splits to open the
 *       aperture the camera passes through.
 *   C — energy: signals routed along the S itself (reference channels, centre
 *       channels, the gold seam), activating in sequence.
 * World units: the S is S_SCALE·2 tall, centred on the origin, facing +z.
 */
export const S_SCALE = 5.6;

export const CHANNEL = {
  /** Body thickness along z, and its chamfer. */
  depth: 1.0,
  bevel: 0.07,
  /** The cover plate: how far its edges sit in from the body's (fraction toward the midline). */
  coverInset: 0.2,
  coverDepth: 0.12,
} as const;

/** Wafers in the counter (z positions, front first). Size in world units. */
export const WAFER = { w: 1.9, h: 3.1, radius: 0.26, thickness: 0.04 } as const;
export const WAFER_Z = [0.84, 0.42, 0, -0.42, -0.84];

/** Where each founder signal docks: channel (0 upper, 1 lower) and position along its outer edge. */
export const PORTS: { channel: 0 | 1; u: number }[] = [
  { channel: 0, u: 0.6 }, // capital
  { channel: 1, u: 0.6 }, // skills
  { channel: 0, u: 0.84 }, // location
  { channel: 1, u: 0.84 }, // time
  { channel: 0, u: 0.36 }, // experience
  { channel: 1, u: 0.36 }, // customer access
];

/** Assembly order inside the Awakening (local 0 → 1). */
export const ASSEMBLY = {
  /** Reference channels trace the S (a blueprint) before any metal arrives. */
  blueprint: [0.04, 0.3] as [number, number],
  /** The first precision channel, then its complement. */
  channels: [
    [0.16, 0.46],
    [0.32, 0.62],
  ] as [number, number][],
  /** Connectors join the channels to the kernel. */
  connectors: [0.56, 0.72] as [number, number],
  /** Optical layers settle (staggered per wafer). */
  wafer: (j: number): [number, number] => [0.6 + j * 0.045, 0.76 + j * 0.045],
  /** The kernel activates; computational pathways become visible. */
  kernel: [0.84, 0.96] as [number, number],
};

/** When each channel arrives (index 0 / 1) — used by the score. */
export function arrivalWindow(channel: number): [number, number] {
  const w = ASSEMBLY.channels[Math.min(1, Math.max(0, channel))];
  return [w[0], w[1]];
}

// ---- chain geometry (S units, upper channel) -------------------------------------------

const lerp2 = (a: P2, b: P2, t: number): [number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

/** Point at parameter u (0 = tip, 1 = far end) along a chain. */
export function chainAt(chain: readonly P2[], u: number): [number, number] {
  const f = Math.min(1, Math.max(0, u)) * (chain.length - 1);
  const i = Math.min(chain.length - 2, Math.floor(f));
  return lerp2(chain[i], chain[i + 1], f - i);
}

/** The channel's midline (between its outer and inner edges). */
export const S_MID: P2[] = S_OUTER.map((p, i) => lerp2(p, S_INNER[i], 0.5));

/** Unit normal of a chain at u, pointing AWAY from the other edge (outward for OUTER, into the counter for INNER). */
export function chainNormal(
  chain: readonly P2[],
  other: readonly P2[],
  u: number,
): [number, number] {
  const a = chainAt(chain, Math.max(0, u - 0.02));
  const b = chainAt(chain, Math.min(1, u + 0.02));
  let nx = -(b[1] - a[1]);
  let ny = b[0] - a[0];
  const l = Math.hypot(nx, ny) || 1;
  nx /= l;
  ny /= l;
  const p = chainAt(chain, u);
  const q = chainAt(other, u);
  if (nx * (p[0] - q[0]) + ny * (p[1] - q[1]) < 0) {
    nx = -nx;
    ny = -ny;
  }
  return [nx, ny];
}

/**
 * The crescent outline (S units): outer tip→end, then inner end→tip (shared points once).
 * `blunt` drops that many points at the tip so a chamfer never spikes at the sharp point.
 */
export function crescentOutline(inset = 0, blunt = 1): [number, number][] {
  const outer = S_OUTER.map((p, i) => lerp2(p, S_MID[i], inset));
  const inner = S_INNER.map((p, i) => lerp2(p, S_MID[i], inset));
  return [...outer.slice(blunt), ...inner.slice(blunt, -1).reverse()];
}

/** Four samples along a stretch of a chain, for a cubic through them (energy channels). */
export function chainSpan(chain: readonly P2[], u0: number, u1: number): [number, number][] {
  return [0, 1 / 3, 2 / 3, 1].map((t) => chainAt(chain, u0 + (u1 - u0) * t));
}

/** Port i's position on its channel (S units, upper-channel frame) and its outward normal. */
export function portLocal(i: number): { x: number; y: number; nx: number; ny: number } {
  const { u } = PORTS[i];
  const [x, y] = chainAt(S_OUTER, u);
  const [nx, ny] = chainNormal(S_OUTER, S_INNER, u);
  return { x, y, nx, ny };
}

/** Traces on each wafer: organised horizontal taps off a central bus (wafer-local units). */
export interface Trace {
  wafer: number;
  side: -1 | 1;
  /** Segment from (x0, y) to (x1, y); a pad sits at x1. */
  x0: number;
  x1: number;
  y: number;
}
export const TRACES: Trace[] = (() => {
  const out: Trace[] = [];
  const rows = [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2];
  WAFER_Z.forEach((_, j) => {
    rows.forEach((y, r) => {
      for (const side of [-1, 1] as const) {
        // Deterministic, organised variation: each wafer routes a different subset.
        if ((r * 3 + j * 5 + (side > 0 ? 2 : 0)) % 4 === 0) continue;
        const reach = 0.3 + ((r + j * 2 + (side > 0 ? 1 : 0)) % 3) * 0.16;
        out.push({ wafer: j, side, x0: side * 0.12, x1: side * Math.min(0.78, 0.12 + reach), y });
      }
    });
  });
  return out;
})();
