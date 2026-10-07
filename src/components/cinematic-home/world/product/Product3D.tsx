import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CapsuleGeometry,
  Euler,
  Group,
  MeshBasicMaterial,
  LatheGeometry,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { smoothstep } from "../../math";
import { local, ramp } from "../../timeline/timeline";
import { CHANNEL, S_SCALE } from "../core/core-design";
import { FINALE_PLACE, FINALE_YAW } from "../core/core-motion";
import { S_INNER, S_OUTER } from "../core/s-mark";
import { frameGeometry, inlayGeometry } from "../geometry/frames";
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

const RIGHT = new Vector3()
  .crossVectors(new Vector3(0, 1, 0), SLAB_NORMAL)
  .normalize()
  .negate();

/** Where link k of the connected chain floats, in front of the product surface. */
function tokenPosition(k: number, out: Vector3): Vector3 {
  const along = k / (CHAIN.length - 1);
  out
    .copy(SLAB_CENTRE)
    .addScaledVector(RIGHT, -1.2 + along * 7.8)
    .addScaledVector(SLAB_NORMAL, 4.2 + Math.sin(along * Math.PI) * 1.5);
  out.y += -2.1 + Math.sin(along * Math.PI * 1.2) * 1.1;
  return out;
}

/**
 * Scene 22 → 23: the remaining pathways converge — on the emblem's centre and the four points
 * from which its outline is then drawn in light (where each channel's edges begin, beside the
 * kernel). World space, in the emblem's pose while it assembles; assigned left to right, so
 * the converging lines never cross.
 */
const CONVERGE_TO = (() => {
  const place = new Matrix4().compose(
    new Vector3(...FINALE_PLACE),
    new Quaternion().setFromEuler(new Euler(-0.03, FINALE_YAW + 0.23, 0, "YXZ")),
    new Vector3(1, 1, 1),
  );
  const front = CHANNEL.depth / 2 + CHANNEL.coverDepth;
  return [[0, 0] as const, S_OUTER[0], S_INNER[0]]
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
})();

export function Product3D() {
  const { store, materials, filaments } = useWorld();
  const slab = useRef<Group>(null);
  const face = useRef<Group>(null);
  const tokens = useRef<(Group | null)[]>([]);
  const tile = useRef<Mesh>(null);
  const geo = useMemo(() => {
    const token = new CapsuleGeometry(0.42, 0.55, 4, 14);
    token.rotateZ(Math.PI / 2);
    const lensProfile = [
      [0, -0.12],
      [0.36, -0.08],
      [0.52, 0],
      [0.36, 0.08],
      [0, 0.12],
    ].map(([x, y]) => new Vector2(x, y));
    const ringProfile = [
      [0.56, -0.07],
      [0.66, -0.07],
      [0.68, 0],
      [0.66, 0.07],
      [0.56, 0.07],
    ].map(([x, y]) => new Vector2(x, y));
    return {
      lens: new LatheGeometry(lensProfile, 28).rotateX(Math.PI / 2),
      ring: new LatheGeometry(ringProfile, 32).rotateX(Math.PI / 2),
      pane: new RoundedBoxGeometry(1.3, 0.85, 0.05, 2, 0.03),
      // The path token is a gate — the same machined portal the visitor travelled through.
      gate: frameGeometry({ hw: 0.62, hh: 0.52, bar: 0.1, depth: 0.16, radius: 0.16 }),
      gateInlay: inlayGeometry(
        { hw: 0.62, hh: 0.52, bar: 0.1, depth: 0.16, radius: 0.16 },
        0.03,
        0.02,
      ),
      bezel: frameGeometry({
        hw: SLAB.width / 2 + 0.08,
        hh: SLAB.height / 2 + 0.08,
        bar: 0.16,
        depth: SLAB.depth + 0.08,
        radius: 0.24,
      }),
      needle: new RoundedBoxGeometry(0.05, 0.46, 0.05, 1, 0.02),
      body: new RoundedBoxGeometry(SLAB.width, SLAB.height, SLAB.depth, 4, 0.12),
      facePlane: new PlaneGeometry(1, 1),
      token,
      band: new LatheGeometry(
        [
          [0.46, -0.13],
          [0.53, -0.13],
          [0.55, 0],
          [0.53, 0.13],
          [0.46, 0.13],
        ].map(([x, y]) => new Vector2(x, y)),
        28,
      ).rotateZ(Math.PI / 2),
      tile: new RoundedBoxGeometry(2.8, 1.5, 0.06, 2, 0.05),
    };
  }, []);
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
      v: new Vector3(),
      q: new Quaternion(),
      m: new Matrix4(),
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
      tokens.current.forEach((t) => t && (t.visible = false));
      if (tile.current) tile.current.visible = false;
      CHAIN.forEach((_, k) => s.anchors.set(`chain-${k}`, { x: 0, y: 0, z: 0, o: 0 }));
      s.anchors.set("isolated", { x: 0, y: 0, z: 0, o: 0 });
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

    // Connected: an isolated answer (no history, no links) dissolves; the chain persists.
    const connected = local(p, "connected");
    const chainIn = smoothstep(0.12, 0.6, connected) * (1 - ramp(p, "return", 0.3, "return", 1));
    CHAIN.forEach((label, k) => {
      const t = tokens.current[k];
      if (!t) return;
      const appear =
        smoothstep(0.12 + k * 0.08, 0.32 + k * 0.08, connected) *
        (1 - ramp(p, "return", 0.2, "return", 0.9));
      t.visible = appear > 0.01;
      tokenPosition(k, t.position);
      t.quaternion.copy(SLAB_QUATERNION);
      t.scale.setScalar(appear);
      s.anchors.set(`chain-${k}`, {
        x: t.position.x,
        y: t.position.y + 0.95,
        z: t.position.z,
        o: appear,
      });
      void label;
    });
    for (let k = 0; k < CHAIN.length - 1; k++) {
      const a = tokens.current[k];
      const b = tokens.current[k + 1];
      const idx = fil.start + k;
      const grow = smoothstep(0.2 + k * 0.08, 0.4 + k * 0.08, connected) * chainIn;
      if (!a || !b || grow <= 0.01) {
        filaments.hide(idx);
        continue;
      }
      filaments.arc(
        idx,
        a.position.x,
        a.position.y,
        a.position.z,
        b.position.x,
        b.position.y,
        b.position.z,
        0,
        0.5,
        0,
      );
      filaments.params(idx, {
        s1: grow,
        width: 0.05,
        intensity: 1,
        pulse: 1.2,
        phase: k * 0.2,
        speed: 0.3,
      });
    }
    // The chain is fed by the surface it came from.
    const feed = fil.start + 5;
    if (chainIn > 0.01 && tokens.current[0]) {
      const a = tokens.current[0].position;
      filaments.arc(feed, g.position.x, g.position.y, g.position.z, a.x, a.y, a.z, 0, 0.8, 0);
      filaments.params(feed, {
        s1: chainIn,
        width: 0.04,
        intensity: 0.8,
        pulse: 1,
        phase: 0.5,
        speed: 0.3,
      });
    } else filaments.hide(feed);
    filaments.hide(fil.start + 4);
    filaments.hide(fil.start + 6);
    filaments.hide(fil.start + 7);

    // The return: as the chain dissolves, each link sends its light to where the emblem will
    // form — rising, then arriving face-on — and the streaks land as the S is drawn in light.
    const back = local(p, "return");
    for (let k = 0; k < CHAIN.length; k++) {
      const idx = fil.start + 8 + k;
      const head = smoothstep(0.08 + k * 0.03, 0.4 + k * 0.03, back);
      const tail = smoothstep(0.34 + k * 0.03, 0.62 + k * 0.03, back);
      if (head <= 0.01 || head - tail < 0.004) {
        filaments.hide(idx);
        continue;
      }
      const a = tokenPosition(k, scratch.v);
      const b = CONVERGE_TO[k];
      filaments.curve(
        idx,
        a.x,
        a.y,
        a.z,
        a.x + (b.x - a.x) * 0.2,
        a.y + 3.2,
        a.z + (b.z - a.z) * 0.2,
        b.x + SLAB_NORMAL.x * 5,
        b.y + 0.6,
        b.z + SLAB_NORMAL.z * 5,
        b.x,
        b.y,
        b.z,
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

    if (tile.current) {
      const show = smoothstep(0.06, 0.2, connected) * (1 - smoothstep(0.42, 0.7, connected));
      tile.current.visible = show > 0.01;
      tile.current.position
        .copy(SLAB_CENTRE)
        .addScaledVector(RIGHT, -6.4)
        .addScaledVector(SLAB_NORMAL, 4.5)
        .add(scratch.v.set(0, 0.9 - (1 - show) * 0.6, 0));
      tile.current.quaternion.copy(SLAB_QUATERNION);
      tile.current.scale.setScalar(0.6 + 0.4 * show);
      s.anchors.set("isolated", {
        x: tile.current.position.x,
        y: tile.current.position.y,
        z: tile.current.position.z,
        o: show,
      });
    }
  });

  return (
    <>
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
      {CHAIN.map((label, k) => (
        <group
          key={label}
          ref={(el) => {
            tokens.current[k] = el;
          }}
          visible={false}
        >
          {/* Each link is an object the visitor has already met in the film. */}
          {k === 0 && (
            <>
              <mesh geometry={geo.ring} material={materials.champagne} />
              <mesh
                geometry={geo.needle}
                material={materials.violet}
                rotation={[0, 0, -0.9]}
                position={[0.1, 0.12, 0.05]}
              />
            </>
          )}
          {k === 1 && (
            <>
              <mesh geometry={geo.lens} material={materials.pearl} />
              <mesh geometry={geo.ring} material={materials.champagne} scale={0.82} />
            </>
          )}
          {k === 2 && (
            <>
              <mesh geometry={geo.pane} material={materials.glass} renderOrder={2} />
              <mesh geometry={geo.ring} material={materials.champagne} scale={[1.05, 0.7, 1]} />
            </>
          )}
          {k === 3 && (
            <>
              <mesh geometry={geo.gate} material={materials.titanium} />
              <mesh geometry={geo.gateInlay} material={materials.champagne} />
            </>
          )}
          {k === 4 && (
            <>
              <mesh geometry={geo.token} material={materials.pearl} scale={0.7} />
              <mesh geometry={geo.band} material={materials.champagne} scale={0.7} />
            </>
          )}
        </group>
      ))}
      <mesh
        ref={tile}
        geometry={geo.tile}
        material={materials.glass}
        visible={false}
        renderOrder={2}
      />
    </>
  );
}
