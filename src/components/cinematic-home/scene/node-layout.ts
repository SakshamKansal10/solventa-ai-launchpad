import { Vector3 } from "three";

import { createCameraPath, type CameraPath } from "../camera/camera-path";
import { mulberry32 } from "../math";
import { progressOf } from "../timeline/timeline";

/** One placeholder data node: where it rests and how it moves. */
export interface NodeSpec {
  x: number;
  y: number;
  z: number;
  /** Scale multiplier. */
  size: number;
  /** Drift phase (rad) and speed (rad/s). */
  phase: number;
  speed: number;
  /** Self-rotation speed (rad/s). */
  spin: number;
  /** Drift direction. */
  dx: number;
  dy: number;
  dz: number;
  /** Palette index: 0 pearl · 1 violet · 2 champagne. */
  tone: 0 | 1 | 2;
  /** 1 = part of the cluster around the core (responds to its energy). */
  orbit: 0 | 1;
}

/** No node rests closer than this to the camera's path — nothing ever clips the lens. */
export const PATH_CLEARANCE = 1.1;

const PATH_SAMPLES = 240;

/**
 * Deterministic placeholder layout: a loose cluster around the core plus a
 * field scattered along the travelling part of the camera path. Same seed,
 * same layout — every load and every test sees the identical scene.
 */
export function createNodeLayout(
  count: number,
  seed = 7,
  path: CameraPath = createCameraPath(),
): NodeSpec[] {
  const rand = mulberry32(seed);

  // The camera path as a polyline, for the clearance check.
  const samples: Vector3[] = [];
  const look = new Vector3();
  for (let i = 0; i <= PATH_SAMPLES; i++) {
    const point = new Vector3();
    path.sample(i / PATH_SAMPLES, point, look);
    samples.push(point);
  }
  const clearOfPath = (v: Vector3) => {
    const min = PATH_CLEARANCE * PATH_CLEARANCE;
    for (const s of samples) if (s.distanceToSquared(v) < min) return false;
    return true;
  };

  const orbitCount = Math.round(count * 0.4);
  const travelStart = progressOf("direction");
  // The field continues past the camera's last position, so the final frames
  // still look into nodes rather than an empty void.
  const end = new Vector3();
  const endHeading = new Vector3();
  path.sample(1, end, endHeading);
  endHeading.sub(end).normalize();
  const nodes: NodeSpec[] = [];
  const candidate = new Vector3();
  const anchor = new Vector3();
  let attempts = 0;

  while (nodes.length < count && attempts < count * 80) {
    attempts++;
    const orbit = nodes.length < orbitCount;
    if (orbit) {
      // Uniform direction on a (slightly flattened) sphere around the core.
      const u = rand() * 2 - 1;
      const theta = rand() * Math.PI * 2;
      const r = 2.6 + rand() * 2.6;
      const s = Math.sqrt(1 - u * u);
      candidate.set(Math.cos(theta) * s * r, u * r * 0.75, Math.sin(theta) * s * r);
    } else {
      // Scattered around a random point on the travelling part of the path —
      // or, for the last stretch, on its continuation ahead of the camera.
      const u = travelStart + rand() * (1.25 - travelStart);
      if (u <= 1) path.sample(u, anchor, look);
      else anchor.copy(end).addScaledVector(endHeading, (u - 1) * 48);
      const angle = rand() * Math.PI * 2;
      const radius = 1.6 + rand() * 5;
      candidate.set(
        anchor.x + Math.cos(angle) * radius,
        anchor.y + Math.sin(angle) * radius * 0.7,
        anchor.z + (rand() - 0.5) * 3,
      );
    }
    if (!clearOfPath(candidate)) continue;

    const tone = rand();
    nodes.push({
      x: candidate.x,
      y: candidate.y,
      z: candidate.z,
      size: 0.7 + rand() * 0.7,
      phase: rand() * Math.PI * 2,
      speed: 0.25 + rand() * 0.5,
      spin: (rand() - 0.5) * 0.8,
      dx: rand() * 2 - 1,
      dy: rand() * 2 - 1,
      dz: rand() * 2 - 1,
      tone: tone < 0.7 ? 0 : tone < 0.9 ? 1 : 2,
      orbit: orbit ? 1 : 0,
    });
  }
  return nodes;
}
