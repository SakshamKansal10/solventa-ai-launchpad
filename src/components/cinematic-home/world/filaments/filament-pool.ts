import {
  BufferGeometry,
  DataTexture,
  Float32BufferAttribute,
  FloatType,
  NearestFilter,
  RGBAFormat,
  Uint32BufferAttribute,
} from "three";

/**
 * THE gold filament — Solventia's connective language from the core to the
 * finale. Every filament in the experience is one cubic Bézier evaluated on the
 * GPU (see filament-material.ts); the CPU only writes 5 texels per filament:
 *
 *   t0  A.xyz   · s0        (visible span starts at s0 …)
 *   t1  C1.xyz  · s1        (… and ends at s1 — growth / retraction)
 *   t2  C2.xyz  · width     (world units)
 *   t3  B.xyz   · intensity (0 = hidden)
 *   t4  pulse · phase · violet · pulseSpeed
 *
 * So endpoints can follow moving nodes, filaments can grow, retract from
 * either end and carry information pulses — all from one draw call.
 */
export const TEXELS = 5;

export interface FilamentRange {
  start: number;
  count: number;
}

export interface FilamentParams {
  s0?: number;
  s1?: number;
  width: number;
  intensity: number;
  pulse?: number;
  phase?: number;
  violet?: number;
  speed?: number;
}

export class FilamentPool {
  readonly capacity: number;
  readonly data: Float32Array;
  readonly texture: DataTexture;
  private ranges = new Map<string, FilamentRange>();
  private next = 0;
  dirty = true;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.data = new Float32Array(capacity * TEXELS * 4);
    this.texture = new DataTexture(this.data, TEXELS, capacity, RGBAFormat, FloatType);
    this.texture.magFilter = NearestFilter;
    this.texture.minFilter = NearestFilter;
    this.texture.needsUpdate = true;
  }

  /** A stable, named block of filaments (idempotent — remounts reuse the same block). */
  range(name: string, count: number): FilamentRange {
    const existing = this.ranges.get(name);
    if (existing && existing.count >= count) return existing;
    const available = Math.max(0, Math.min(count, this.capacity - this.next));
    const range = { start: this.next, count: available };
    this.next += available;
    this.ranges.set(name, range);
    return range;
  }

  /** Curve control points: A → B with handles C1, C2. */
  curve(
    i: number,
    ax: number,
    ay: number,
    az: number,
    c1x: number,
    c1y: number,
    c1z: number,
    c2x: number,
    c2y: number,
    c2z: number,
    bx: number,
    by: number,
    bz: number,
  ) {
    const o = i * TEXELS * 4;
    const d = this.data;
    d[o] = ax;
    d[o + 1] = ay;
    d[o + 2] = az;
    d[o + 4] = c1x;
    d[o + 5] = c1y;
    d[o + 6] = c1z;
    d[o + 8] = c2x;
    d[o + 9] = c2y;
    d[o + 10] = c2z;
    d[o + 12] = bx;
    d[o + 13] = by;
    d[o + 14] = bz;
    this.dirty = true;
  }

  /** A → B bowed by (bx, by, bz) at both handles — the common gentle arc. */
  arc(
    i: number,
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    bendX = 0,
    bendY = 0,
    bendZ = 0,
  ) {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    this.curve(
      i,
      ax,
      ay,
      az,
      ax + dx / 3 + bendX,
      ay + dy / 3 + bendY,
      az + dz / 3 + bendZ,
      ax + (2 * dx) / 3 + bendX,
      ay + (2 * dy) / 3 + bendY,
      az + (2 * dz) / 3 + bendZ,
      bx,
      by,
      bz,
    );
  }

  params(i: number, p: FilamentParams) {
    const o = i * TEXELS * 4;
    const d = this.data;
    d[o + 3] = p.s0 ?? 0;
    d[o + 7] = p.s1 ?? 1;
    d[o + 11] = p.width;
    d[o + 15] = p.intensity;
    d[o + 16] = p.pulse ?? 0;
    d[o + 17] = p.phase ?? 0;
    d[o + 18] = p.violet ?? 0;
    d[o + 19] = p.speed ?? 0.25;
    this.dirty = true;
  }

  hide(i: number) {
    const o = i * TEXELS * 4;
    if (this.data[o + 15] !== 0) {
      this.data[o + 15] = 0;
      this.dirty = true;
    }
  }

  hideRange(range: FilamentRange) {
    for (let i = range.start; i < range.start + range.count; i++) this.hide(i);
  }
}

/** Ribbon geometry: (segments + 1) × 2 vertices per filament, all positions computed on the GPU. */
export function createFilamentGeometry(capacity: number, segments: number): BufferGeometry {
  const perFil = (segments + 1) * 2;
  const total = capacity * perFil;
  const fil = new Float32Array(total);
  const t = new Float32Array(total);
  const side = new Float32Array(total);
  const index = new Uint32Array(capacity * segments * 6);
  let v = 0;
  let k = 0;
  for (let f = 0; f < capacity; f++) {
    const base = v;
    for (let s = 0; s <= segments; s++) {
      for (const sd of [-1, 1]) {
        fil[v] = f;
        t[v] = s / segments;
        side[v] = sd;
        v++;
      }
    }
    for (let s = 0; s < segments; s++) {
      const a = base + s * 2;
      index[k++] = a;
      index[k++] = a + 1;
      index[k++] = a + 2;
      index[k++] = a + 1;
      index[k++] = a + 3;
      index[k++] = a + 2;
    }
  }
  const g = new BufferGeometry();
  // Unused by the shader (it builds positions from the data texture) but required by three.
  g.setAttribute("position", new Float32BufferAttribute(new Float32Array(total * 3), 3));
  g.setAttribute("aFil", new Float32BufferAttribute(fil, 1));
  g.setAttribute("aT", new Float32BufferAttribute(t, 1));
  g.setAttribute("aSide", new Float32BufferAttribute(side, 1));
  g.setIndex(new Uint32BufferAttribute(index, 1));
  return g;
}
