/**
 * The Intelligence Core — "the Engine" — as DATA (pure, deterministic); built
 * into geometry by IntelligenceCore.tsx and posed by core-motion.ts.
 *
 * Six nested, gimballed titanium frames around a smoked-glass kernel. Each
 * frame turns about an axis pinned to its parent (alternating y / x), so the
 * rest pose is a composed, gyroscopic structure — and every change of state
 * is a precise mechanical rotation, not a wobble. Inside the kernel, a
 * computational lattice carries violet inference pulses.
 *
 * The founder's six signals dock into PORTS on the outer frame; each one
 * turns one inner layer (the system visibly reconfigures around the founder).
 * For the passage the gimbal aligns into a telescoping square aperture that
 * narrows toward the kernel — the camera squeezes through it into the world.
 */

export interface FrameSpec {
  id: string;
  /** Outer half size (square), bar width, depth along z, corner radius. */
  half: number;
  bar: number;
  depth: number;
  radius: number;
  /** The axis this frame turns about, pinned to its parent. */
  axis: "x" | "y";
  /** Rest angle relative to its parent (radians). */
  rest: number;
  /** Champagne inlay on the inner edge. */
  inlay: boolean;
  /** Machined index marks on the front face (count per side). */
  ticks: number;
}

export const FRAMES: FrameSpec[] = [
  {
    id: "f1",
    half: 5.6,
    bar: 0.56,
    depth: 0.72,
    radius: 1.2,
    axis: "y",
    rest: 0.64,
    inlay: false,
    ticks: 5,
  },
  {
    id: "f2",
    half: 4.72,
    bar: 0.42,
    depth: 0.58,
    radius: 1,
    axis: "x",
    rest: 0.72,
    inlay: true,
    ticks: 0,
  },
  {
    id: "f3",
    half: 3.92,
    bar: 0.34,
    depth: 0.48,
    radius: 0.84,
    axis: "y",
    rest: -0.62,
    inlay: false,
    ticks: 3,
  },
  {
    id: "f4",
    half: 3.22,
    bar: 0.27,
    depth: 0.4,
    radius: 0.68,
    axis: "x",
    rest: -0.5,
    inlay: true,
    ticks: 0,
  },
  {
    id: "f5",
    half: 2.6,
    bar: 0.22,
    depth: 0.33,
    radius: 0.55,
    axis: "y",
    rest: 0.68,
    inlay: false,
    ticks: 0,
  },
  {
    id: "f6",
    half: 2.04,
    bar: 0.18,
    depth: 0.28,
    radius: 0.44,
    axis: "x",
    rest: 0.4,
    inlay: true,
    ticks: 0,
  },
];

/** The kernel: two smoked-glass halves (they part for the passage) around a lattice. */
export const KERNEL = { half: 0.98, radius: 0.16, axis: "y" as const, rest: 0.6 };

/** Lattice nodes inside the kernel: 4 × 3 × 3, no centre column (the halves split cleanly). */
export const LATTICE: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  for (const x of [-0.66, -0.22, 0.22, 0.66])
    for (const y of [-0.5, 0, 0.5]) for (const z of [-0.5, 0, 0.5]) out.push([x, y, z]);
  return out;
})();

/** Lattice struts: axis-aligned neighbours (index pairs). Cross-centre struts break when the kernel parts. */
export const STRUTS: [number, number][] = (() => {
  const out: [number, number][] = [];
  LATTICE.forEach((a, i) =>
    LATTICE.forEach((b, j) => {
      if (j <= i) return;
      const d = [Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])];
      const axes = d.filter((v) => v > 1e-6).length;
      if (
        axes === 1 &&
        (Math.abs(d[0] - 0.44) < 1e-6 || Math.abs(d[1] - 0.5) < 1e-6 || Math.abs(d[2] - 0.5) < 1e-6)
      )
        out.push([i, j]);
    }),
  );
  return out;
})();

/**
 * The six input ports on the outer frame's front face (frame-local), in the
 * order of the founder's signals: capital, skills, location, time, experience,
 * customer access. Each signal turns one inner layer (STEP radians): frames
 * f2…f6, then the kernel.
 */
export const PORTS: { x: number; y: number; step: number }[] = [
  { x: -5.32, y: 2.3, step: -0.42 },
  { x: 5.32, y: 2.3, step: 0.58 },
  { x: -2.0, y: 5.32, step: 0.4 },
  { x: 5.32, y: -2.3, step: -0.62 },
  { x: -5.32, y: -2.3, step: 0.38 },
  { x: 2.0, y: -5.32, step: -0.55 },
];

/** Aligned for the passage: each frame sits this far behind its parent (a narrowing square tunnel). */
export const TELESCOPE = { first: 2.0, step: -1.1 };

/** Pin length between frame i's inner edge and frame i+1's outer edge. */
export function pinSpan(i: number): [number, number] {
  const outer = FRAMES[i];
  const inner = FRAMES[i + 1];
  const from = inner ? inner.half - 0.04 : KERNEL.half - 0.02;
  return [from, outer.half - outer.bar + 0.04];
}

/** Awakening: when each layer flies in (inner layers first — the engine builds outward). */
export function arrivalWindow(layer: number): [number, number] {
  const order = FRAMES.length - 1 - layer; // f6 → 0 … f1 → 5
  const start = 0.07 + order * 0.1;
  return [start, start + 0.34];
}
