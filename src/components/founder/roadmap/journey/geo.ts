import * as THREE from "three";

/** Seeded PRNG so every render of the landscape is identical. */
export function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Position-based noise: duplicated seam vertices move together, so meshes stay watertight. */
const noise = (x: number, y: number, z: number, seed: number) =>
  Math.sin(x * 6.1 + seed) * Math.cos(z * 5.3 + y * 2.9 + seed * 1.7);

/** The island's top: a gently undulating lathe from the centre to the rim. */
export function terrainGeometry(seed: number, radialSegments: number) {
  const g = new THREE.LatheGeometry(
    [
      [0, 0.14],
      [0.35, 0.15],
      [0.7, 0.13],
      [0.98, 0.11],
      [1.1, 0.09],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    radialSegments,
  );
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (Math.hypot(x, z) < 1.0) pos.setY(i, pos.getY(i) + 0.035 * noise(x, 0, z, seed));
  }
  g.computeVertexNormals();
  return g;
}

/** A thin earthy skirt between the grass and the rock. */
export function skirtGeometry(radialSegments: number) {
  return new THREE.LatheGeometry(
    [
      [1.1, 0.09],
      [1.12, 0.0],
      [1.09, -0.12],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    radialSegments,
  );
}

/** Wide shoulder tapering to a rough tip — the floating rock under an island. */
export function undersideGeometry(seed: number, radialSegments: number) {
  const g = new THREE.LatheGeometry(
    [
      [1.09, -0.12],
      [1.0, -0.4],
      [0.82, -0.82],
      [0.55, -1.28],
      [0.26, -1.72],
      [0.03, -2.0],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    radialSegments,
    0,
    Math.PI * 2,
  );
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y < -0.2) {
      const k = 0.13 * (1 + (-y - 0.2) * 0.2);
      pos.setXYZ(
        i,
        x * (1 + k * noise(x, y, z, seed)),
        y + 0.06 * noise(z, x, y, seed),
        z * (1 + k * noise(z, y, x, seed + 2)),
      );
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Smooth 2D value noise from hashed lattice points. */
function vnoise(x: number, z: number, seed: number) {
  const h = (i: number, j: number) => {
    const s = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fz = z - zi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = h(xi, zi);
  const b = h(xi + 1, zi);
  const c = h(xi, zi + 1);
  const d = h(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const ROCK_LOW = new THREE.Color("#6f8a63");
const ROCK_MID = new THREE.Color("#8b8274");
const ROCK_HIGH = new THREE.Color("#6e6a76");
const SNOW = new THREE.Color("#f7f4fa");

/**
 * A realistic mountain: a radial heightfield with a main summit, two
 * shoulders and ridged noise for gullies and spurs, coloured by altitude
 * (green foothills, bare rock, an irregular snowline). Sits flush on y = 0.
 * `userData.top` holds the summit position for placing a flag.
 */
export function mountainGeometry(seed: number, radius: number, height: number) {
  const rings = 34;
  const segs = 64;
  const peaks = [
    { x: 0, z: 0, h: 1, r: radius * 0.95 },
    { x: radius * 0.38, z: radius * 0.22, h: 0.55, r: radius * 0.6 },
    { x: -radius * 0.34, z: -radius * 0.3, h: 0.42, r: radius * 0.55 },
  ];
  const positions: number[] = [];
  const colors: number[] = [];
  const tmp = new THREE.Color();
  let top = { x: 0, y: -1, z: 0 };

  const heights: number[] = [];
  for (let r = 0; r <= rings; r++) {
    for (let s = 0; s < segs; s++) {
      const rr = (r / rings) * radius;
      const a = (s / segs) * Math.PI * 2;
      // Wobble the outline so the base is not a perfect circle.
      const wob = 1 + 0.12 * (vnoise(Math.cos(a) * 2 + 9, Math.sin(a) * 2 + 9, seed) - 0.5);
      const x = Math.cos(a) * rr * wob;
      const z = Math.sin(a) * rr * wob;
      let base = 0;
      for (const p of peaks) {
        const d = Math.hypot(x - p.x, z - p.z) / p.r;
        base = Math.max(base, p.h * Math.pow(Math.max(0, 1 - d), 1.35));
      }
      // Ridged multi-octave noise: sharp spurs and gullies, strongest mid-slope.
      let n = 0;
      let amp = 1;
      let freq = 2.4 / radius;
      for (let o = 0; o < 4; o++) {
        n += amp * (1 - Math.abs(vnoise(x * freq, z * freq, seed + o * 3) * 2 - 1));
        amp *= 0.5;
        freq *= 2.1;
      }
      n /= 1.875;
      const edge = Math.min(1, (1 - rr / radius) * 3.5);
      const hgt = Math.max(0, (base * (0.72 + 0.45 * n) - 0.04) * height * edge);
      heights.push(hgt);
      positions.push(x, hgt, z);
      if (hgt > top.y) top = { x, y: hgt, z };

      // Colour by altitude with noisy boundaries.
      const t = hgt / height;
      const j = vnoise(x * 7, z * 7, seed + 11) - 0.5;
      if (t + j * 0.18 > 0.66) tmp.copy(SNOW);
      else if (t + j * 0.2 > 0.5) tmp.lerpColors(ROCK_HIGH, SNOW, 0.35 + j);
      else if (t > 0.18 + j * 0.1)
        tmp.lerpColors(ROCK_MID, ROCK_HIGH, Math.min(1, (t - 0.18) / 0.3));
      else tmp.lerpColors(ROCK_LOW, ROCK_MID, Math.max(0, t / 0.18));
      colors.push(tmp.r, tmp.g, tmp.b);
    }
  }
  // The centre ring collapses to one point per segment — all at the origin.
  const index: number[] = [];
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segs; s++) {
      const s2 = (s + 1) % segs;
      const a = r * segs + s;
      const b = r * segs + s2;
      const c = (r + 1) * segs + s;
      const d = (r + 1) * segs + s2;
      index.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  g.userData.top = top;
  return g;
}

/** A craggy peak: a jittered cone, flat-shaded. */
export function peakGeometry(seed: number, radius: number, height: number, segments = 7) {
  const g = new THREE.ConeGeometry(radius, height, segments, 4);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = (y + height / 2) / height;
    const k = 0.22 * (1 - t);
    pos.setXYZ(
      i,
      x * (1 + k * noise(x, y, z, seed)),
      y + 0.05 * height * noise(z, y, x, seed),
      z * (1 + k * noise(z, x, y, seed + 1)),
    );
  }
  g.computeVertexNormals();
  return g;
}

/** Tree positions on the island's surface, keeping clear of structures. */
export function treePoints(
  seed: number,
  count: number,
  avoid: readonly (readonly [number, number, number])[],
) {
  const r = rng(seed);
  const pts: { x: number; z: number; s: number }[] = [];
  let guard = 0;
  while (pts.length < count && guard++ < count * 40) {
    const a = r() * Math.PI * 2;
    const d = 0.3 + Math.sqrt(r()) * 0.64;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
    pts.push({ x, z, s: 0.7 + r() * 0.7 });
  }
  return pts;
}

/** Vertical sky gradient: lavender overhead, pink, then peach at the horizon. */
export function skyTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#cdbfee");
    g.addColorStop(0.3, "#e0c9ea");
    g.addColorStop(0.55, "#efcadb");
    g.addColorStop(0.78, "#f7d8cb");
    g.addColorStop(1, "#f6e4da");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 512);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A soft cumulus puff, drawn from overlapping radial gradients. */
export function cloudTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (ctx) {
    const r = rng(11);
    for (let i = 0; i < 9; i++) {
      const x = 40 + r() * 176;
      const y = 50 + r() * 40;
      const rad = 28 + r() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(0.6, "rgba(255,244,250,0.22)");
      g.addColorStop(1, "rgba(255,244,250,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 128);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
