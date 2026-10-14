import { progressOf, type SceneId } from "../timeline/timeline";
import { FINALS_HUB } from "../world/layout";
import { frameEye, pathEye, revisedEye, sideEye, WINNER_POS } from "../world/path/path-model";
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
  // A — the void, discovered: the film opens so close to the S's edges that the signals running
  // along them read as abstract curves; the camera draws back and the curves resolve into the
  // S. The metal then lands on those lines while the camera arcs gently around the Engine.
  key("void", 0, [-1, 3.3, 6.8], [-2.7, 2.4, 0]),
  key("void", 1, [-0.4, 2.5, 12.5], [-1.4, 1.4, 0]),
  key("awakening", 0.24, [1.2, 1.1, 21], [0, 0.4, 0]),
  key("awakening", 0.46, [3, 0.8, 15.5], [-0.3, 0.3, 0]),
  key("awakening", 0.72, [4.2, 0.6, 13.5], [0.2, 0, 0]),
  key("awakening", 1, [8.5, 1.6, 25], [-3.6, -0.6, 0]),
  // The camera stops on the complete Engine before the founder's signals arrive.
  key("context", 0.1, [8.6, 1.62, 24.8], [-3.6, -0.6, 0]),
  // Context — a controlled orbit within the S's readable front arc while the signals dock.
  key("context", 0.4, [11, 2.4, 29], [-1.4, 0, 0]),
  key("context", 0.75, [4, 1.6, 30], [-1, 0.2, 0]),
  key("context", 1, [2.2, 0.9, 20], [0, 0.3, 0]),
  // B — the aperture. The channels part; the camera centres on the lens; the iris opens on a
  // pinpoint of light; the camera enters the barrel (its planes pass the lens) and leaves it
  // into a world far larger than the machine that contained it.
  key("passage", 0.25, [0.6, 0.35, 11], [0, 0.05, 0]),
  key("passage", 0.45, [0.06, 0.04, 4.2], [0, 0, -2]),
  key("passage", 0.56, [0, 0, 1.4], [0, 0, -6]),
  key("passage", 0.64, [0, 0, -0.9], [0, -0.05, -12]),
  key("passage", 0.72, [0, -0.1, -3.4], [0, -0.6, -22]),
  key("passage", 0.86, [0.4, 1.4, -7.5], [0.6, -2.2, -34]),
  key("passage", 1, [0.9, 3.4, -8.5], [1, -3, -40]),
  // C/D — the reveal: up out of the aperture to a true overlook of the whole constellation.
  key("universe", 0.45, [0.2, 7.5, -4.5], [1.5, -3.5, -45]),
  // …and over the whole constellation, once it is all there.
  key("universe", 0.62, [0.1, 7.9, -4.2], [1.6, -3.6, -45]),
  // One arc from here to the nine: a gentle rise to the crest of the overlook, then a steady
  // descent, always moving forward into the world — never back out and in again.
  key("universe", 1, [-0.6, 9.6, -2.6], [2, -3.8, -45.5]),
  // E — computation, in the same world: no cut to a new view. The overlook glides down and
  // across while the founder's waves visibly cross everything below it, settling toward the
  // region where the survivors gather.
  key("computation", 0.35, [0.6, 9.4, -5.4], [3, -3.2, -45]),
  key("computation", 0.7, [2.6, 8.4, -9], [4.4, -2.2, -44]),
  key("computation", 1, [4.4, 6.8, -13], [5.4, -1.2, -42]),
  // F/G — toward the promising region; the nine.
  key("convergence", 0.5, [6, 3.2, -21], [7, -1, -42]),
  key("convergence", 1, [6.2, 2.6, -24], [6, 0.8, -46]),
  // H — the three futures grow out of the lattice columns in front of a camera that only settles:
  // no push in and back out. It eases down, below them, for the comparison — all three held in
  // one frame while the six signals rise into each — then it stops and waits.
  key("three", 0.5, [6, 0.4, -25.5], [FINALS_HUB[0], FINALS_HUB[1] + 2.2, FINALS_HUB[2] - 2]),
  key("three", 1, [6.02, 0.45, -26], [FINALS_HUB[0], FINALS_HUB[1] + 2.2, FINALS_HUB[2] - 2]),
  key("selection", 0.3, [6.05, 0.55, -27], [FINALS_HUB[0], FINALS_HUB[1] + 2.3, FINALS_HUB[2] - 2]),
  // I — settle on the one; silence.
  key("selection", 0.6, [6.2, 2.2, -38.5], [WINNER_POS[0], WINNER_POS[1] - 0.2, WINNER_POS[2]]),
  key("selection", 1, [6.3, 2.4, -41.5], [WINNER_POS[0], WINNER_POS[1] - 0.5, WINNER_POS[2]]),
  // J — the opportunity becomes a path: orbit to its side, then turn and move with it.
  key("unfold", 0.3, [11.5, 4.6, -45], [WINNER_POS[0], WINNER_POS[1] + 0.8, WINNER_POS[2] - 2]),
  key("unfold", 0.62, [8.6, 5.2, -47], [...pathEye(18).target]),
  { at: progressOf("unfold", 1), ...pathEye(4) },
  // Validate → Build → Elevate → evidence: ONE carried camera, always on the left of the road,
  // in one steady glide — it rises out of the corridor it was inside, travels alongside at a
  // constant height while the gates lock, and only climbs once, as the branches grow (Elevate);
  // over the network it watches the evidence travel in.
  { at: progressOf("validate", 0.4), ...sideEye(24, -8.5, 6, 16) },
  { at: progressOf("validate", 1), ...sideEye(52, -9, 5.5, 18) },
  { at: progressOf("build", 1), ...sideEye(88, -9.5, 5, 18) },
  { at: progressOf("elevate", 1), ...frameEye(118, -15, 16, 138, -14, 8) },
  // The camera's aim follows the evidence in: out along the branch channel, then over the last
  // gate's crown, then down into the assumption.
  { at: progressOf("evidence", 0.35), ...frameEye(122, -14, 15, 142, -15, 10) },
  { at: progressOf("evidence", 0.6), ...frameEye(127, -13, 11.5, 144, -4, 6) },
  { at: progressOf("evidence", 1), ...frameEye(132, -12, 8, 146, -3, 1.5) },
  // The consequence: further out on the same side, where the dependent section can be seen
  // failing in profile — the assumption at the left of frame, what rested on it to the right.
  // Then the camera stops while the other possibilities appear.
  { at: progressOf("crisis", 0.3), ...sideEye(141, -14, 8, 11) },
  { at: progressOf("crisis", 0.65), ...sideEye(151, -19, 9.5, 9) },
  { at: progressOf("crisis", 1), ...sideEye(152, -18.6, 9.2, 9) },
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
  // The camera arrives as the S's edge closes, then only drifts — a slow settle through the name.
  { at: progressOf("finale", 0.32), ...lower(productEye(27.5, 5.3), 2.4) },
  // The protected hold: the composition is still while the identity and CTA land.
  { at: progressOf("finale", 0.72), ...lower(productEye(25.5, 5), 2.25) },
  { at: progressOf("finale", 1), ...lower(productEye(25.7, 5), 2.27) },
];
