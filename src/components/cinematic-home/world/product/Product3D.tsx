import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Euler,
  Group,
  MeshBasicMaterial,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { smoothstep } from "../../math";
import { local, ramp } from "../../timeline/timeline";
import { CHANNEL, S_SCALE } from "../core/core-design";
import { FINALE_PLACE, FINALE_YAW } from "../core/core-motion";
import { S_INNER, S_OUTER } from "../core/s-mark";
import { frameGeometry } from "../geometry/frames";
import { revisedFrame, UNSTABLE } from "../path/path-model";
import { useWorld } from "../WorldContext";
import { SLAB, SLAB_CENTRE, SLAB_NORMAL, SLAB_QUATERNION, slabState } from "./product-model";

/** The connected chain, in order (labels live in the DOM, anchored to these). */
export const CHAIN = ["Context", "Opportunity", "Evidence", "Path", "Progress"] as const;

/**
 * The slab's face IS the interface's silhouette: the real panel's structure (measured from
 * the DOM at desktop size, normalised x, y, w, h from its top-left) in the panel's own flat
 * colours, unlit. When the real DOM fades in on top, only its type and icons appear — the
 * surfaces were already there.
 */
type Tone = "base" | "band" | "card" | "line" | "pill";
const FACE: { r: [number, number, number, number]; tone: Tone }[] = [
  { r: [0, 0, 1, 1], tone: "base" },
  { r: [0, 0, 1, 0.081], tone: "band" },
  { r: [0, 0.0805, 1, 0.0018], tone: "line" },
  { r: [0.2375, 0.082, 0.0018, 0.918], tone: "line" },
  { r: [0.2624, 0.1008, 0.0878, 0.0508], tone: "pill" },
  { r: [0.8121, 0.1819, 0.1638, 0.1489], tone: "card" },
  { r: [0.2623, 0.394, 0.3471, 0.2657], tone: "card" },
  { r: [0.6286, 0.3939, 0.3473, 0.2658], tone: "card" },
  { r: [0.2623, 0.6904, 0.7136, 0.2427], tone: "card" },
];
const TONES: Record<Tone, string> = {
  base: "#0a0f19",
  band: "#0e131c",
  card: "#121720",
  line: "#1a1f29",
  pill: "#ece7dd",
};

/**
 * Connected: the interface's own relationships, drawn as gold routing across the surface it
 * already is — no new objects. Normalised face points (from the panel's layout, CHAIN order):
 * the founder context in the sidebar, the direction's headline, the confidence card (evidence),
 * the roadmap (path) and its stages (progress).
 */
const ROUTE: [number, number][] = [
  [0.12, 0.4],
  [0.5, 0.26],
  [0.89, 0.26],
  [0.45, 0.82],
  [0.85, 0.82],
];

const RIGHT = new Vector3()
  .crossVectors(new Vector3(0, 1, 0), SLAB_NORMAL)
  .normalize()
  .negate();

/** A route node in world space, on the slab's face as it is placed this frame. */
function routePoint(k: number, slab: Matrix4, out: Vector3): Vector3 {
  const [x, y] = ROUTE[k];
  return out
    .set((x - 0.5) * SLAB.width, (0.5 - y) * SLAB.height, SLAB.depth / 2 + 0.03)
    .applyMatrix4(slab);
}

/**
 * Scene 22 → 23: the routing leaves the surface and converges — on the emblem's centre and the
 * four points from which its outline is then drawn in light (where each channel's edges begin,
 * beside the kernel). World space, in the emblem's pose while it assembles; assigned left to
 * right, as are the route nodes, so the converging lines never cross.
 */
const CONVERGE_TO = (() => {
  const place = new Matrix4().compose(
    new Vector3(...FINALE_PLACE),
    new Quaternion().setFromEuler(new Euler(-0.03, FINALE_YAW + 0.23, 0, "YXZ")),
    new Vector3(1, 1, 1),
  );
  const front = CHANNEL.depth / 2 + CHANNEL.coverDepth;
  const ends = [[0, 0] as const, S_OUTER[0], S_INNER[0]]
    .flatMap(([x, y], i) =>
      i === 0
        ? [[x, y]]
        : [
            [x, y],
            [-x, -y],
          ],
    )
    .map(([x, y]) => new Vector3(x * S_SCALE, y * S_SCALE, front).applyMatrix4(place))
    .sort((a, b) => a.dot(RIGHT) - b.dot(RIGHT));
  const byX = ROUTE.map((_, k) => k).sort((a, b) => ROUTE[a][0] - ROUTE[b][0]);
  return ROUTE.map((_, k) => ends[byX.indexOf(k)]);
})();

export function Product3D() {
  const { store, materials, filaments } = useWorld();
  const slab = useRef<Group>(null);
  const face = useRef<Group>(null);
  const geo = useMemo(
    () => ({
      bezel: frameGeometry({
        hw: SLAB.width / 2 + 0.08,
        hh: SLAB.height / 2 + 0.08,
        bar: 0.16,
        depth: SLAB.depth + 0.08,
        radius: 0.24,
      }),
      body: new RoundedBoxGeometry(SLAB.width, SLAB.height, SLAB.depth, 4, 0.12),
      facePlane: new PlaneGeometry(1, 1),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  const fil = useMemo(() => filaments.range("product", 8 + CHAIN.length), [filaments]);
  // Flat, unlit, untoned: exactly the DOM panel's colours, so the handoff adds only type.
  const faceTones = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(TONES) as Tone[]).map((t) => [
          t,
          new MeshBasicMaterial({ color: TONES[t], toneMapped: false, fog: false }),
        ]),
      ) as Record<Tone, MeshBasicMaterial>,
    [],
  );
  useEffect(() => () => Object.values(faceTones).forEach((m) => m.dispose()), [faceTones]);
  const scratch = useMemo(
    () => ({
      from: { position: new Vector3(), quaternion: new Quaternion(), scale: 1 },
      a: new Vector3(),
      b: new Vector3(),
      n: new Vector3(),
    }),
    [],
  );

  useFrame((state) => {
    const s = store.state;
    const p = s.progress;
    const st = slabState(p);
    // Phones: the panel grows out of the slab full-width, so the small slab withdraws beneath it.
    const yieldToPanel = state.size.width < 640 ? smoothstep(0.15, 0.5, st.dom) : 0;
    const g = slab.current;
    if (!g) return;
    g.visible = st.visible;
    s.slab.visible = st.visible;
    if (!st.visible) {
      filaments.hideRange(fil);
      CHAIN.forEach((_, k) => s.anchors.set(`chain-${k}`, { x: 0, y: 0, z: 0, o: 0 }));
      return;
    }
    // Emerge: from the last rebuilt gate's opening, travel forward, square up to the camera.
    revisedFrame(UNSTABLE.length - 1, scratch.from);
    const e = st.emerge;
    const ease = e * e * (3 - 2 * e);
    g.position.lerpVectors(scratch.from.position, SLAB_CENTRE, ease);
    g.position.y += Math.sin(ease * Math.PI) * 1.2;
    g.quaternion.slerpQuaternions(scratch.from.quaternion, SLAB_QUATERNION, ease);
    g.scale.setScalar(Math.max(0.0001, (0.35 + 0.65 * ease) * (1 - yieldToPanel)));
    // Return: the surface leans back into depth and dissolves into structure.
    const r = st.recede;
    g.position.addScaledVector(SLAB_NORMAL, -r * 16).addScaledVector(RIGHT, -r * 5);
    g.rotateY(-r * 0.6);
    g.scale.multiplyScalar(1 - 0.5 * r);
    g.updateMatrixWorld();
    g.matrixWorld.toArray(s.slab.matrix);
    s.slab.dom = st.dom;
    s.slab.released = st.released;
    // The abstract layout recedes as the real interface takes over.
    if (face.current) face.current.visible = st.dom < 0.98;
    if (face.current) face.current.scale.setScalar(1 - 0.02 * st.dom);

    // Connected: as the type leaves the surface, its relationships light up across it — context
    // → opportunity → evidence → path → progress — one continuous gold route, node by node.
    const connected = local(p, "connected");
    const back = local(p, "return");
    const leave = 1 - ramp(p, "return", 0.18, "return", 0.6);
    const { a, b, n } = scratch;
    n.set(0, 0, 1).transformDirection(g.matrixWorld);
    CHAIN.forEach((_, k) => {
      routePoint(k, g.matrixWorld, a);
      const lit = smoothstep(0.14 + k * 0.08, 0.26 + k * 0.08, connected) * leave;
      s.anchors.set(`chain-${k}`, { x: a.x, y: a.y + 0.28, z: a.z, o: lit });
    });
    for (let k = 0; k < CHAIN.length - 1; k++) {
      const idx = fil.start + k;
      const grow = smoothstep(0.18 + k * 0.08, 0.3 + k * 0.08, connected);
      if (grow <= 0.01 || leave <= 0.01) {
        filaments.hide(idx);
        continue;
      }
      routePoint(k, g.matrixWorld, a);
      routePoint(k + 1, g.matrixWorld, b);
      // A shallow bow off the surface keeps the route on the face, never through it.
      const bow = 0.12 * g.scale.x;
      filaments.arc(idx, a.x, a.y, a.z, b.x, b.y, b.z, n.x * bow, n.y * bow, n.z * bow);
      filaments.params(idx, {
        s1: grow,
        width: 0.03,
        intensity: 1.15 * leave,
        pulse: 1.2,
        phase: k * 0.2,
        speed: 0.3,
      });
    }
    for (let k = CHAIN.length - 1; k < 8; k++) filaments.hide(fil.start + k);

    // The return: the routing leaves the surface — each node sends its light to where the emblem
    // will form, rising, then arriving face-on — and the streaks land as the S is drawn in light.
    for (let k = 0; k < CHAIN.length; k++) {
      const idx = fil.start + 8 + k;
      const head = smoothstep(0.08 + k * 0.03, 0.4 + k * 0.03, back);
      const tail = smoothstep(0.34 + k * 0.03, 0.62 + k * 0.03, back);
      if (head <= 0.01 || head - tail < 0.004) {
        filaments.hide(idx);
        continue;
      }
      routePoint(k, g.matrixWorld, a);
      const to = CONVERGE_TO[k];
      filaments.curve(
        idx,
        a.x,
        a.y,
        a.z,
        a.x + (to.x - a.x) * 0.2,
        a.y + 3.2,
        a.z + (to.z - a.z) * 0.2,
        to.x + SLAB_NORMAL.x * 5,
        to.y + 0.6,
        to.z + SLAB_NORMAL.z * 5,
        to.x,
        to.y,
        to.z,
      );
      filaments.params(idx, {
        s0: tail,
        s1: head,
        width: 0.045,
        intensity: 1.25,
        pulse: 0.9,
        phase: k * 0.17,
        speed: 0.45,
      });
    }
  });

  return (
    <group ref={slab}>
      <mesh geometry={geo.body} material={materials.graphite} />
      <mesh geometry={geo.bezel} material={materials.titanium} />
      <group ref={face} position={[0, 0, SLAB.depth / 2 + 0.006]}>
        {FACE.map(({ r: [x, y, w, h], tone }, i) => (
          <mesh
            key={i}
            geometry={geo.facePlane}
            material={faceTones[tone]}
            position={[
              (x + w / 2 - 0.5) * SLAB.width,
              (0.5 - (y + h / 2)) * SLAB.height,
              i * 0.002,
            ]}
            scale={[w * SLAB.width, h * SLAB.height, 1]}
          />
        ))}
      </group>
    </group>
  );
}
