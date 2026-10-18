import * as THREE from "three";

export type JourneyViewMode = "timeline" | "map";

export interface PhaseVisual {
  state: "completed" | "current" | "future";
}

export interface JourneyLayout {
  positions: THREE.Vector3[];
}

/** Island positions along a gently rising, zig-zagging path. The horizontal
 * spread follows the canvas aspect so the journey never reaches the edges. The
 * Map view lays the same islands out as a wider winding trail seen from above. */
export function buildLayout(count: number, aspect: number, mode: JourneyViewMode): JourneyLayout {
  const half = Math.min(6.8, Math.max(3.6, aspect * 3.1));
  const positions: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = -half + t * half * 2;
    const odd = i % 2 === 1;
    if (mode === "map") {
      positions.push(new THREE.Vector3(x, 0, odd ? -1.7 : 1.2));
    } else {
      positions.push(new THREE.Vector3(x, -0.55 + t * 1.7 + (odd ? 0.35 : -0.1), odd ? -1.1 : 0.5));
    }
  }
  return { positions };
}
