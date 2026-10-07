import { progressOf, type SceneId } from "../timeline/timeline";
import { FINALS_HUB } from "../world/layout";
import { pathEye, revisedEye, sideEye, WINNER_POS } from "../world/path/path-model";
import { productEye } from "../world/product/product-model";
import type { CameraKey, Vec3 } from "./camera-path";

type Eye = { position: [number, number, number]; target: [number, number, number] };
/** Aim below the subject so it sits in the upper half of the frame, above the copy. */
const lower = (eye: Eye, by: number): Eye => ({
  position: eye.position,
  target: [eye.target[0], eye.target[1] - by, eye.target[2]],
});
const raise = (eye: Eye, up: number, back = 0): Eye => ({
  position: [eye.position[0], eye.position[1] + up, eye.position[2] + back],
  target: eye.target,
});

const key = (scene: SceneId, at: number, position: Vec3, target: Vec3): CameraKey => ({
  at: progressOf(scene, at),
  position,
  target,
});

/**
 * The whole camera journey, anchored to scenes (world units; core at origin,
 * opening on +z, universe centred at UNIVERSE_CENTER, path running −z).
 * Slow dolly, controlled orbit, macro approach, pass-through, reveal.
 */
export const CAMERA_PATH_KEYS: CameraKey[] = [
  // A — the void: far out, almost nothing to see; an extremely slow drift forward.
  key("void", 0, [0, 2.4, 74], [0, 0.4, 0]),
  key("void", 1, [0.5, 1.8, 58], [0, 0.4, 0]),
  // Awakening — close enough to see the precision: the S is drawn in light, its first channel
  // passes the lens, the wafers settle; then a pull back reveals the whole Engine.
  key("awakening", 0.24, [1.2, 1.1, 21], [0, 0.4, 0]),
  key("awakening", 0.46, [3.4, 0.7, 12.5], [-0.4, 0.3, 0]),
  key("awakening", 0.72, [4.6, 0.5, 10.5], [0.2, 0, 0]),
  key("awakening", 1, [8.5, 1.6, 25], [-3.6, -0.6, 0]),
  // Context — a controlled orbit within the S's readable front arc while the signals dock.
  key("context", 0.4, [12, 2.2, 17], [-2.6, 0, 0]),
  key("context", 0.75, [6, 1.4, 19.5], [-2.2, 0.2, 0]),
  key("context", 1, [2.2, 0.9, 16.5], [0, 0.3, 0]),
  // B — the Engine aligns into a square aperture; the camera squeezes through the narrowing
  // tunnel of frames, between the parting kernel halves, and out into the world.
  key("passage", 0.3, [0.9, 0.75, 13.5], [0, 0.3, 0]),
  key("passage", 0.5, [0.3, 0.5, 8], [0, 0.3, -3]),
  key("passage", 0.64, [0.14, 0.42, 3.4], [0, 0.32, -8]),
  key("passage", 0.76, [0.08, 0.38, -1.6], [0, 0.25, -12]),
  key("passage", 0.88, [0.2, 0.36, -5.2], [0, -0.4, -18]),
  key("passage", 1, [1.3, 0.7, -9], [0, -1.4, -32]),
  // C/D — the reveal: up out of the aperture to a true overlook of the whole constellation.
  key("universe", 0.45, [0.2, 7.5, -4.5], [1.5, -3.5, -45]),
  key("universe", 1, [-1.8, 13.5, 2.5], [3, -4.5, -47]),
  // E — computation, travelled: glide past the capability matrix, then across to the
  // capital terraces, then turn toward the emerging region where the survivors gather.
  key("computation", 0.32, [-7, 3.6, -16.5], [-17, 2, -28]),
  key("computation", 0.64, [5, 6.2, -22], [17, 3.8, -37]),
  key("computation", 1, [4.5, 6.2, -15], [5, -1, -40]),
  // F/G — toward the promising region; the nine.
  key("convergence", 0.5, [6, 3.2, -21], [7, -1, -42]),
  key("convergence", 1, [6.2, 2.6, -24], [6, 0.8, -46]),
  // H — between the three futures (each could be its own world).
  // Each is framed whole — three distinct architectures, never cropped.
  key(
    "three",
    0.2,
    [-5, 2.8, -32.5],
    [FINALS_HUB[0] - 7.5, FINALS_HUB[1] + 0.8, FINALS_HUB[2] + 1],
  ),
  key("three", 0.34, [4.6, 2.8, -38], [WINNER_POS[0], WINNER_POS[1] + 0.8, WINNER_POS[2]]),
  key(
    "three",
    0.48,
    [15.5, 2.4, -34.5],
    [FINALS_HUB[0] + 7.5, FINALS_HUB[1] - 1, FINALS_HUB[2] - 0.5],
  ),
  // The comparison: all three held in one frame while the six signals run into each.
  key("three", 0.64, [6, 3.6, -23], [FINALS_HUB[0], FINALS_HUB[1] + 1.4, FINALS_HUB[2] - 3]),
  key("three", 1, [6.05, 3.55, -23.6], [FINALS_HUB[0], FINALS_HUB[1] + 1.3, FINALS_HUB[2] - 3]),
  key("selection", 0.3, [6.1, 3.5, -25], [FINALS_HUB[0], FINALS_HUB[1] + 1.2, FINALS_HUB[2] - 3]),
  // I — settle on the one; silence.
  key("selection", 0.6, [6.2, 3.0, -37], [WINNER_POS[0], WINNER_POS[1] - 0.6, WINNER_POS[2]]),
  key("selection", 1, [6.4, 3.2, -40.5], [WINNER_POS[0], WINNER_POS[1] - 0.9, WINNER_POS[2]]),
  // J — the opportunity becomes a path: orbit to its side, then turn and move with it.
  key("unfold", 0.3, [11.5, 4.6, -45], [WINNER_POS[0], WINNER_POS[1] + 0.8, WINNER_POS[2] - 2]),
  key("unfold", 0.62, [8.6, 5.2, -47], [...pathEye(18).target]),
  { at: progressOf("unfold", 1), ...pathEye(4) },
  // Validate → Build → Elevate: one evolving world, travelled through.
  { at: progressOf("validate", 0.5), ...pathEye(30) },
  { at: progressOf("validate", 1), ...pathEye(56) },
  // Build: step outside and track alongside — watch the gates lock and the deck form.
  { at: progressOf("build", 0.4), ...sideEye(74, 7, 1.6) },
  { at: progressOf("build", 1), ...sideEye(98, 7.5, 2.4) },
  // Elevate: gain altitude over the branching network.
  { at: progressOf("elevate", 0.5), ...sideEye(106, 10, 18, 22) },
  { at: progressOf("elevate", 1), ...sideEye(118, 6, 22, 24) },
  // Evidence arrives; then the crisis — pull back to see the future lose integrity.
  { at: progressOf("evidence", 0.3), ...raise(pathEye(122), 7) },
  { at: progressOf("evidence", 1), ...pathEye(138) },
  { at: progressOf("crisis", 0.6), ...raise(pathEye(132), 5.6, 2) },
  { at: progressOf("crisis", 1), ...raise(pathEye(133), 6.6, 4) },
  // Adaptation — inside the transformation, following the rebuilt direction.
  { at: progressOf("adaptation", 0.35), ...pathEye(146) },
  { at: progressOf("adaptation", 0.7), ...revisedEye(12) },
  { at: progressOf("adaptation", 1), ...revisedEye(24) },
  // The product surface emerges ahead; the camera squares up to it.
  { at: progressOf("handoff", 0.5), ...revisedEye(32) },
  { at: progressOf("handoff", 1), ...productEye(0) },
  { at: progressOf("product", 1), ...productEye(0) },
  { at: progressOf("connected", 1), ...productEye(3.5) },
  { at: progressOf("return", 1), ...productEye(14, 4) },
  { at: progressOf("finale", 0.3), ...lower(productEye(28, 5.5), 3) },
  // The protected hold: the composition is still while the identity and CTA land.
  { at: progressOf("finale", 0.62), ...lower(productEye(29.5, 5.2), 3.15) },
  { at: progressOf("finale", 1), ...lower(productEye(29.8, 5.2), 3.17) },
];
