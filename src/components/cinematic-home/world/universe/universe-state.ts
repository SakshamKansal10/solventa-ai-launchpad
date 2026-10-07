import { smoothstep } from "../../math";
import { local, ramp } from "../../timeline/timeline";
import { SIGNALS, type SignalId } from "../context/context-model";
import { partialScore } from "./scoring";
import {
  CONVERGE_ANCHOR,
  TRUNK_ORIGIN,
  type Opportunity,
  type UniverseModel,
} from "./universe-model";

/**
 * Everything the universe shows is a PURE function of scroll progress — so
 * every transformation plays identically forwards, backwards, slow or fast.
 *
 * Motion grammar (from the art direction):
 *   good fit      → alignment (orientation converges) + solidity (glass → pearl)
 *   weak fit      → loss of energy, recedes into atmospheric depth
 *   conflict      → its connections retract
 *   new relevance → connections strengthen and carry pulses
 *   convergence   → survivors fold toward the promising region in formations
 */
export interface Phases {
  /** Distance the universe has "opened" to (nodes appear near → far). */
  revealFront: number;
  trunkGrow: number;
  branchGrow: number;
  /** Front distance of each context wave (Capital … Customer access). */
  waves: number[];
  /** Convergence stages 1–5 (360→120, →36, →9, →3, →1), each 0 → 1. */
  stages: number[];
  /** Finalists hand over to their monumental sculptures. */
  sculpt: number;
  /** The rest of the universe recedes as the chosen direction becomes a path. */
  fadeOut: number;
}

export function universePhases(p: number): Phases {
  const w = local(p, "computation");
  const waves = SIGNALS.map((_, k) => {
    const start = 0.04 + k * 0.115;
    return 96 * smoothstep(start, start + 0.38, w);
  });
  return {
    revealFront: 110 * ramp(p, "passage", 0.36, "passage", 0.62),
    trunkGrow: ramp(p, "passage", 0.62, "universe", 0.2),
    branchGrow: ramp(p, "universe", 0.12, "universe", 0.8),
    waves,
    stages: [
      ramp(p, "convergence", 0.02, "convergence", 0.27),
      ramp(p, "convergence", 0.27, "convergence", 0.52),
      ramp(p, "convergence", 0.52, "convergence", 0.84),
      ramp(p, "three", 0.0, "three", 0.24),
      ramp(p, "selection", 0.12, "selection", 0.78),
    ],
    sculpt: ramp(p, "three", 0.04, "three", 0.26),
    fadeOut: ramp(p, "unfold", 0.08, "unfold", 0.62),
  };
}

export interface NodeFrame {
  x: number;
  y: number;
  z: number;
  /** Internal light, 0 → ~1.6. */
  energy: number;
  /** 0 = glass (uncertain), 1 = pearl (confident). */
  solid: number;
  /** 0 = its own tilt, 1 = aligned with the system. */
  align: number;
  /** 0 = cool/neutral light, 1 = warm champagne. */
  warm: number;
  scale: number;
  /** Revealed weight of its worst conflicting signal (0 if no conflict). */
  conflict: number;
  /** 0 → 1 while it is falling away at its stage. */
  falling: number;
  visible: boolean;
}

export function createNodeFrame(): NodeFrame {
  return {
    x: 0,
    y: 0,
    z: 0,
    energy: 0,
    solid: 0,
    align: 0,
    warm: 0,
    scale: 0,
    conflict: 0,
    falling: 0,
    visible: false,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Distances from the trunk origin, cached per opportunity. */
const distCache = new WeakMap<Opportunity, number>();
function trunkDistance(o: Opportunity) {
  let d = distCache.get(o);
  if (d === undefined) {
    d = Math.hypot(
      o.rest[0] - TRUNK_ORIGIN[0],
      o.rest[1] - TRUNK_ORIGIN[1],
      o.rest[2] - TRUNK_ORIGIN[2],
    );
    distCache.set(o, d);
  }
  return d;
}

const revealed: Record<SignalId, number> = {
  capital: 0,
  skills: 0,
  location: 0,
  time: 0,
  experience: 0,
  access: 0,
};

/** One opportunity's visual state for these phases (writes into `out`; no allocation). */
export function nodeFrame(
  o: Opportunity,
  model: UniverseModel,
  ph: Phases,
  out: NodeFrame,
): NodeFrame {
  const d = trunkDistance(o);
  const appear = smoothstep(d - 4, d + 6, ph.revealFront);
  let know = 0;
  SIGNALS.forEach((sig, k) => {
    const r = smoothstep(d - 6, d + 3, ph.waves[k]);
    revealed[sig.id] = r;
    know += r / SIGNALS.length;
  });
  const s = partialScore(o.fits, revealed);
  const q = Math.min(1, Math.max(0, (s - 0.38) / (0.86 - 0.38)));

  // The worst conflicting signal, weighted by how much of it is known.
  let conflict = 0;
  for (const sig of SIGNALS) {
    if (o.fits[sig.id] < 0.35) conflict = Math.max(conflict, revealed[sig.id]);
  }

  let energy = appear * lerp(0.36, 0.1 + 1.45 * q * q, know);
  let solid = know * smoothstep(0.55, 0.82, q);
  let align = know * smoothstep(0.45, 0.85, q);
  const recede = know * (1 - smoothstep(0.22, 0.52, q));

  // Outward from the promising region (low fit drifts into the dark).
  let ox = o.rest[0] - CONVERGE_ANCHOR[0];
  let oy = o.rest[1] - CONVERGE_ANCHOR[1];
  let oz = o.rest[2] - CONVERGE_ANCHOR[2];
  const ol = Math.hypot(ox, oy, oz) || 1;
  ox /= ol;
  oy /= ol;
  oz /= ol;
  let x = o.rest[0] + ox * recede * 3.5;
  let y = o.rest[1] + oy * recede * 3.5;
  let z = o.rest[2] + oz * recede * 3.5;
  let scale = o.size * (0.35 + 0.65 * appear) * (1 - recede * 0.15);
  let falling = 0;
  let visible = appear > 0.001;

  // Convergence: survivors move through formations; the rest fall away.
  const stagger = 0.35 * Math.min(1, o.rank / 120);
  for (let k = 1; k <= 5; k++) {
    const f = ph.stages[k - 1];
    if (f <= 0) break;
    if (o.stage === k) {
      falling = f;
      energy *= 1 - 0.93 * f;
      solid *= 1 - f;
      align *= 1 - f;
      x += ox * (5 + 3 * k) * f;
      y += oy * (5 + 3 * k) * f;
      z += oz * (5 + 3 * k) * f - 6 * f;
      scale *= 1 - 0.4 * f;
      // Long gone once the next stage is well under way.
      const next = ph.stages[k] ?? 1;
      if (f >= 1 && next > 0.65) visible = false;
    } else if (o.stage === 0 || o.stage > k) {
      const ft = Math.min(1, Math.max(0, (f - stagger) / (1 - stagger)));
      const e = ft * ft * (3 - 2 * ft);
      let tx: number, ty: number, tz: number;
      if (k === 1) {
        tx = CONVERGE_ANCHOR[0] + (o.rest[0] - CONVERGE_ANCHOR[0]) * 0.55;
        ty = CONVERGE_ANCHOR[1] + (o.rest[1] - CONVERGE_ANCHOR[1]) * 0.55;
        tz = CONVERGE_ANCHOR[2] + (o.rest[2] - CONVERGE_ANCHOR[2]) * 0.42;
      } else {
        const target =
          k === 2
            ? model.formations.spiral.get(o.index)
            : k === 3
              ? model.formations.nine.get(o.index)
              : k === 4
                ? model.formations.three.get(o.index)
                : undefined;
        if (!target) continue;
        [tx, ty, tz] = target;
        if (k === 3) scale *= 1 + 0.25 * e;
        if (k === 4) scale *= 1 + 1.3 * e;
      }
      x = lerp(x, tx, e);
      y = lerp(y, ty, e);
      z = lerp(z, tz, e);
      if (k >= 2) {
        align = lerp(align, 1, e);
        solid = lerp(solid, 1, e);
      }
    }
  }

  // Finalists hand over to their sculptures; everything else recedes for the path.
  if (model.finalists.includes(o.index)) scale *= 1 - ph.sculpt;
  energy *= 1 - ph.fadeOut;
  scale *= 1 - 0.85 * ph.fadeOut;
  if (scale < 0.002) visible = false;

  out.x = x;
  out.y = y;
  out.z = z;
  out.energy = energy;
  out.solid = solid;
  out.align = align;
  out.warm = know * q;
  out.scale = scale;
  out.conflict = conflict;
  out.falling = falling;
  out.visible = visible;
  return out;
}
