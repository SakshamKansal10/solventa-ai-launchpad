import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
  type PointLight,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { createCameraPath } from "../../camera/camera-path";
import { smoothstep } from "../../math";
import { local, progressOf } from "../../timeline/timeline";
import { frameGeometry, plateGeometry } from "../geometry/frames";
import { COLORS } from "../layout";
import { useWorld } from "../WorldContext";
import {
  ASSEMBLY,
  CHANNEL,
  chainAt,
  chainNormal,
  chainSpan,
  crescentOutline,
  PORTS,
  portLocal,
  S_MID,
  S_SCALE,
  TRACES,
  WAFER,
  WAFER_Z,
} from "./core-design";
import { enginePose, type EnginePose } from "./core-motion";
import { S_INNER, S_OUTER } from "./s-mark";

/** Distant signals in the void (appear at local `at`), and the bow of their run in. */
const VOID_SIGNALS: {
  from: [number, number, number];
  bend: [number, number, number];
  at: number;
}[] = [
  { from: [-22, 8, -16], bend: [5, 5, 8], at: 0.16 },
  { from: [27, -6, -34], bend: [-6, 4, 10], at: 0.48 },
  { from: [-7, -12, -52], bend: [3, -5, 12], at: 0.76 },
];
/** Faint distant structure glimpsed through the aperture before the reveal. */
const HINTS: [number, number, number][] = [
  [-9, 1.5, -30],
  [7, -2.5, -38],
  [1.5, 4.5, -47],
  [-4, -3.5, -54],
];
/** Founder-signal weights in the illustrative scoring model (channel width). */
const WEIGHTS = [0.22, 0.22, 0.1, 0.16, 0.14, 0.16];
/** Inner-edge points where connectors reach into the counter. */
const STRUT_U = [0.2, 0.42];
const GOLD = new Color(COLORS.edgeGold);
/** The lit inner bevel: a deeper gold, so it reads as light on metal rather than paint. */
const SEAM_GOLD = new Color("#E2A95A");
const INDIGO = new Color(COLORS.indigo);
const VIOLET = new Color(COLORS.violetGlow);

/** The S channel's crescent, extruded: `inset` toward the midline, `depth` along z at `z`. */
function crescent(inset: number, depth: number, bevel: number, z: number) {
  const pts = crescentOutline(inset).map(([x, y]) => new Vector2(x * S_SCALE, y * S_SCALE));
  const d = Math.max(0.001, depth - bevel * 2);
  const g = new ExtrudeGeometry(new Shape(pts), {
    depth: d,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 1,
  });
  g.translate(0, 0, z - d / 2);
  return g;
}

/**
 * The gold inner light — the logo's lit inner bevel. Three bands along the concave edge,
 * brightest along the curve and falling away toward the tip and the far end: a gradient
 * strip on the front face and on the back face (bright at the edge, fading into the metal),
 * and a band just off the edge across the depth (for oblique views into the counter).
 */
function seamRibbon() {
  const M = 48;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const glow = (u: number) => (u < 0.66 ? Math.pow(Math.sin((Math.PI * u) / 0.66), 0.55) : 0);
  const band = (at: (u: number, side: 0 | 1) => [number, number, number], fadeInner: boolean) => {
    const base = pos.length / 3;
    for (let i = 0; i <= M; i++) {
      const u = i / M;
      const g = glow(u);
      for (const side of [0, 1] as const) {
        pos.push(...at(u, side));
        const k = fadeInner && side === 1 ? 0 : g;
        col.push(k, k, k);
      }
      if (i < M) {
        const a = base + i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  };
  const front = CHANNEL.depth / 2 + 0.004;
  for (const z of [front, -front]) {
    band((u, side) => {
      const [x, y] = chainAt(S_INNER, u);
      const [nx, ny] = chainNormal(S_INNER, S_OUTER, u);
      const into = side === 0 ? -0.01 : 0.17; // from the edge into the metal
      return [(x - nx * (into / S_SCALE)) * S_SCALE, (y - ny * (into / S_SCALE)) * S_SCALE, z];
    }, true);
  }
  band((u, side) => {
    const [x, y] = chainAt(S_INNER, u);
    const [nx, ny] = chainNormal(S_INNER, S_OUTER, u);
    return [x * S_SCALE + nx * 0.04, y * S_SCALE + ny * 0.04, side === 0 ? -0.4 : 0.4];
  }, false);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

function buildEngine() {
  const front = CHANNEL.depth / 2;
  return {
    body: crescent(0, CHANNEL.depth, CHANNEL.bevel, 0),
    // A champagne pinstripe between the body and the machined covers (front and back).
    stripe: [front, -front].map((z) =>
      crescent(CHANNEL.coverInset - 0.035, 0.03, 0, z + Math.sign(z) * 0.01),
    ),
    cover: [front, -front].map((z) =>
      crescent(CHANNEL.coverInset, CHANNEL.coverDepth, 0.025, z + Math.sign(z) * 0.035),
    ),
    seam: seamRibbon(),
    wafer: plateGeometry(WAFER.w / 4, WAFER.h / 2, WAFER.thickness, WAFER.radius, 0, 6),
    waferRim: frameGeometry({
      hw: WAFER.w / 4,
      hh: WAFER.h / 2,
      bar: 0.022,
      depth: WAFER.thickness + 0.012,
      radius: WAFER.radius,
      bevel: 0,
      curveSegments: 6,
    }),
    unit: new BoxGeometry(1, 1, 1),
    pad: new BoxGeometry(0.07, 0.07, 0.012),
    strut: new CylinderGeometry(0.05, 0.05, 1, 12, 1).translate(0, 0.5, 0),
    collar: new CylinderGeometry(0.1, 0.1, 0.12, 16, 1),
    socket: new RoundedBoxGeometry(0.62, 0.36, 0.34, 2, 0.06),
  };
}

const ONE = new Vector3(1, 1, 1);
const Z_AXIS = new Vector3(0, 0, 1);
const Y_AXIS = new Vector3(0, 1, 0);
const BASE = [new Quaternion(), new Quaternion().setFromAxisAngle(Z_AXIS, Math.PI)];

interface Flight {
  from: Vector3;
  via: Vector3;
  turn: Quaternion;
}

export function IntelligenceCore({ variant = "origin" }: { variant?: "origin" | "finale" }) {
  const finale = variant === "finale";
  const { store, materials, filaments, animate } = useWorld();
  const root = useRef<Group>(null);
  const channelGroups = useRef<(Group | null)[]>([]);
  const wafers = useRef<InstancedMesh>(null);
  const rims = useRef<InstancedMesh>(null);
  const traces = useRef<InstancedMesh>(null);
  const pads = useRef<InstancedMesh>(null);
  const struts = useRef<InstancedMesh>(null);
  const collars = useRef<InstancedMesh>(null);
  const sockets = useRef<InstancedMesh>(null);
  const portLights = useRef<InstancedMesh>(null);
  const violetLight = useRef<PointLight>(null);
  const goldLight = useRef<PointLight>(null);
  const built = useMemo(() => buildEngine(), []);
  const seamMaterial = useMemo(
    () => new MeshBasicMaterial({ color: GOLD.clone(), vertexColors: true, side: DoubleSide }),
    [],
  );
  const fil = useMemo(() => filaments.range(`core-${variant}`, 42), [filaments, variant]);

  // Flights in (origin): fixed points derived from the camera path, so pure in scroll. The first
  // channel sweeps past the lens; its complement rises out of the dark beyond.
  const flights = useMemo<Flight[]>(() => {
    const path = createCameraPath();
    const P = new Vector3();
    const T = new Vector3();
    path.sample(progressOf("awakening", ASSEMBLY.channels[0][0]), P, T);
    const fwd = T.clone().sub(P).normalize();
    const right = new Vector3().crossVectors(fwd, Y_AXIS).normalize();
    return [
      {
        from: P.clone()
          .addScaledVector(fwd, 3)
          .addScaledVector(right, 4.5)
          .add(new Vector3(0, 1.5, 0)),
        via: P.clone().addScaledVector(fwd, 14).addScaledVector(right, 2),
        turn: new Quaternion().setFromEuler(new Euler(0.5, -1.0, 0.9)),
      },
      {
        from: new Vector3(10, -16, -34),
        via: new Vector3(4, -6, -12),
        turn: new Quaternion().setFromEuler(new Euler(-0.5, 0.9, -0.7)),
      },
    ];
  }, []);

  const scratch = useMemo(
    () => ({
      place: new Matrix4(),
      ch: [new Matrix4(), new Matrix4()],
      rest: [new Matrix4(), new Matrix4()],
      lock: [new Matrix4(), new Matrix4()],
      m: new Matrix4(),
      q: new Quaternion(),
      q2: new Quaternion(),
      e: new Euler(),
      v: new Vector3(),
      w: new Vector3(),
      pos: new Vector3(),
      scl: new Vector3(),
      o: new Object3D(),
      c: new Color(),
      pts: [0, 1, 2, 3].map(() => new Vector3()),
    }),
    [],
  );

  // Per-instance colour buffers exist from the first frame, so the warm-up compiles the right
  // programs (creating them later would recompile mid-scroll, e.g. when the finale appears).
  useLayoutEffect(() => {
    const black = new Color(0, 0, 0);
    for (const mesh of [rims.current, traces.current, pads.current, portLights.current]) {
      if (!mesh) continue;
      for (let i = 0; i < mesh.count; i++) mesh.setColorAt(i, black);
    }
  }, []);

  useEffect(
    () => () => {
      built.body.dispose();
      built.stripe.forEach((g) => g.dispose());
      built.cover.forEach((g) => g.dispose());
      [
        built.seam,
        built.wafer,
        built.waferRim,
        built.unit,
        built.pad,
        built.strut,
        built.collar,
        built.socket,
      ].forEach((g) => g.dispose());
      seamMaterial.dispose();
    },
    [built, seamMaterial],
  );

  useFrame(() => {
    const group = root.current;
    if (!group) return;
    const s = store.state;
    const p = s.progress;
    const pose = enginePose(p, finale);
    group.visible = pose.visible;
    if (!pose.visible) {
      filaments.hideRange(fil);
      if (violetLight.current) violetLight.current.intensity = 0;
      if (goldLight.current) goldLight.current.intensity = 0;
      return;
    }
    const t = animate ? s.time : 0;
    const { place, ch, rest, lock, m, q, q2, e, v, w, pos, scl, o, c, pts } = scratch;

    // Engine placement.
    e.set(pose.pitch, pose.yaw, 0, "YXZ");
    place.compose(v.set(...pose.position), q.setFromEuler(e), ONE);

    // Channels: placement × offset × rotation × base (the lower channel is the upper, turned 180°).
    pose.channels.forEach((cp, k) => {
      const g = channelGroups.current[k];
      e.set(cp.rx, cp.ry, cp.rz);
      q.setFromEuler(e).multiply(BASE[k]);
      rest[k].multiplyMatrices(place, m.compose(v.set(cp.x, cp.y, cp.z), q, ONE));
      lock[k].multiplyMatrices(place, m.makeRotationFromQuaternion(BASE[k]));
      const u = Math.min(1, Math.max(0, cp.arrive));
      if (u < 1 && !finale) {
        const f = flights[k];
        const ease = 1 - Math.pow(1 - u, 2.4);
        pos.copy(f.from).multiplyScalar((1 - ease) * (1 - ease));
        pos
          .addScaledVector(f.via, 2 * (1 - ease) * ease)
          .addScaledVector(v.set(cp.x, cp.y, cp.z), ease * ease);
        q2.copy(f.turn)
          .multiply(BASE[k])
          .slerp(q, smoothstep(0.2, 1, u));
        ch[k].multiplyMatrices(place, m.compose(pos, q2, ONE));
      } else {
        ch[k].copy(rest[k]);
      }
      if (g) {
        g.visible = u > 0;
        g.matrix.copy(ch[k]);
        g.matrixWorldNeedsUpdate = true;
      }
    });

    // Kernel wafers: settle in, calibrate with the founder's signals, split for the aperture.
    const W4 = WAFER.w / 4;
    if (wafers.current && rims.current) {
      let n = 0;
      pose.wafers.forEach((wf, j) => {
        const arrive = Math.min(1, Math.max(0, wf.arrive));
        const settleZ = (1 - arrive) * (j % 2 ? -5 : 5);
        for (const side of [-1, 1]) {
          o.position.set(side * (W4 + wf.split) + wf.slide, 0, wf.z + settleZ);
          o.rotation.set(0, 0, 0);
          o.scale.setScalar(arrive > 0.001 ? 1 : 0.0001);
          o.updateMatrix();
          m.multiplyMatrices(place, o.matrix);
          wafers.current!.setMatrixAt(n, m);
          rims.current!.setMatrixAt(n, m);
          // Hairline rims: quiet while computing, brighter only as the aperture opens.
          const edge = arrive * (0.06 + 0.14 * wf.glow + 0.16 * smoothstep(0.02, 0.4, wf.split));
          rims.current!.setColorAt(n, c.copy(INDIGO).multiplyScalar(edge));
          n++;
        }
      });
      wafers.current.instanceMatrix.needsUpdate = true;
      rims.current.instanceMatrix.needsUpdate = true;
      if (rims.current.instanceColor) rims.current.instanceColor.needsUpdate = true;
    }
    // Traces and inference pads: organised routing; pads light in sequence.
    if (traces.current && pads.current) {
      TRACES.forEach((tr, i) => {
        const wf = pose.wafers[tr.wafer];
        const arrive = Math.min(1, Math.max(0, wf.arrive));
        const settleZ = (1 - arrive) * (tr.wafer % 2 ? -5 : 5);
        const dx = tr.side * wf.split + wf.slide;
        const z = wf.z + settleZ + WAFER.thickness / 2 + 0.006;
        o.position.set((tr.x0 + tr.x1) / 2 + dx, tr.y, z);
        o.rotation.set(0, 0, 0);
        o.scale.set(Math.abs(tr.x1 - tr.x0), 0.012, 0.008);
        if (arrive < 0.001) o.scale.setScalar(0.0001);
        o.updateMatrix();
        traces.current!.setMatrixAt(i, m.multiplyMatrices(place, o.matrix));
        o.position.set(tr.x1 + dx, tr.y, z);
        o.scale.setScalar(arrive < 0.001 ? 0.0001 : 1);
        o.updateMatrix();
        pads.current!.setMatrixAt(i, m.multiplyMatrices(place, o.matrix));
        const wave = 0.5 + 0.5 * Math.sin(t * 2.1 - i * 0.61 + tr.y * 2.2);
        const sweep = smoothstep(0, 1, wf.glow * 3 - (i / TRACES.length) * 2);
        traces.current!.setColorAt(
          i,
          c.copy(INDIGO).multiplyScalar(sweep * (0.12 + 0.24 * wf.glow)),
        );
        // The signal's own pad flashes gold as it is absorbed.
        const flash =
          tr.wafer < pose.docked.length
            ? pose.docked[tr.wafer] * (1 - pose.docked[tr.wafer]) * 4
            : 0;
        c.copy(VIOLET)
          .multiplyScalar(sweep * (0.18 + 0.7 * wf.glow * wave))
          .lerp(GOLD, Math.min(1, flash));
        pads.current!.setColorAt(i, c);
      });
      for (const mesh of [traces.current, pads.current]) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }

    // Connectors: precision struts from each channel's inner edge into the counter.
    if (struts.current && collars.current) {
      let n = 0;
      for (let k = 0; k < 2; k++) {
        for (const u of STRUT_U) {
          const [x, y] = chainAt(S_INNER, u);
          const [nx, ny] = chainNormal(S_INNER, S_OUTER, u);
          const len = 0.62 * pose.connectors;
          o.position.set(x * S_SCALE, y * S_SCALE, 0);
          o.quaternion.setFromUnitVectors(Y_AXIS, v.set(nx, ny, 0));
          o.scale.set(1, Math.max(0.0001, len), 1);
          o.updateMatrix();
          struts.current.setMatrixAt(n, m.multiplyMatrices(ch[k], o.matrix));
          o.position.set(x * S_SCALE + nx * len, y * S_SCALE + ny * len, 0);
          o.scale.setScalar(pose.connectors > 0.02 ? 1 : 0.0001);
          o.updateMatrix();
          collars.current.setMatrixAt(n, m.multiplyMatrices(ch[k], o.matrix));
          n++;
        }
      }
      struts.current.instanceMatrix.needsUpdate = true;
      collars.current.instanceMatrix.needsUpdate = true;
    }

    // Ports on the outer edges: idle indigo → gold once the founder's signal has docked.
    if (sockets.current && portLights.current) {
      PORTS.forEach((pt, i) => {
        const { x, y, nx, ny } = portLocal(i);
        // A port exists only with its channel (never floating ahead of the metal).
        const present = pose.channels[pt.channel].arrive > 0.001 ? 1 : 0.0001;
        o.position.set(x * S_SCALE + nx * 0.16, y * S_SCALE + ny * 0.16, CHANNEL.depth / 2 + 0.02);
        o.quaternion.setFromUnitVectors(Y_AXIS, v.set(nx, ny, 0));
        o.scale.setScalar(present);
        o.updateMatrix();
        sockets.current!.setMatrixAt(i, m.multiplyMatrices(ch[pt.channel], o.matrix));
        o.position.z += 0.19;
        o.scale.set(0.34 * present, 0.06 * present, 0.02 * present);
        o.updateMatrix();
        portLights.current!.setMatrixAt(i, m.multiplyMatrices(ch[pt.channel], o.matrix));
        const d = pose.docked[i];
        c.copy(INDIGO)
          .multiplyScalar(0.4 * pose.kernel)
          .lerp(GOLD, d);
        portLights.current!.setColorAt(i, c.multiplyScalar(0.6 + 0.8 * d));
      });
      sockets.current.instanceMatrix.needsUpdate = true;
      portLights.current.instanceMatrix.needsUpdate = true;
      if (portLights.current.instanceColor) portLights.current.instanceColor.needsUpdate = true;
    }

    // The gold inner light, and the two constant-count lights.
    seamMaterial.color
      .copy(SEAM_GOLD)
      .multiplyScalar(pose.seam * (finale ? 1.3 : 0.95 + 0.25 * pose.pulse));
    for (const g of channelGroups.current) {
      const seam = g?.children.find((ch) => ch.userData.seam);
      if (seam) seam.visible = pose.seam > 0.01;
    }
    if (violetLight.current) {
      violetLight.current.position.setFromMatrixPosition(place);
      violetLight.current.intensity = pose.kernel * (2 + pose.energy * 4 + pose.pulse * 3);
    }
    if (goldLight.current) {
      goldLight.current.position.copy(v.set(0, 0, 1.3).applyMatrix4(place));
      goldLight.current.intensity = pose.seam * (finale ? 18 : 13);
    }

    // ---- Filaments ------------------------------------------------------------------
    renderFilaments(pose, fil.start, finale, p, t);
    for (let j = 41; j < fil.count; j++) filaments.hide(fil.start + j);

    function cubicThrough(idx: number, a: Vector3, b: Vector3, c2: Vector3, d: Vector3) {
      filaments.curve(
        idx,
        a.x,
        a.y,
        a.z,
        (-5 * a.x + 18 * b.x - 9 * c2.x + 2 * d.x) / 6,
        (-5 * a.y + 18 * b.y - 9 * c2.y + 2 * d.y) / 6,
        (-5 * a.z + 18 * b.z - 9 * c2.z + 2 * d.z) / 6,
        (2 * a.x - 9 * b.x + 18 * c2.x - 5 * d.x) / 6,
        (2 * a.y - 9 * b.y + 18 * c2.y - 5 * d.y) / 6,
        (2 * a.z - 9 * b.z + 18 * c2.z - 5 * d.z) / 6,
        d.x,
        d.y,
        d.z,
      );
    }

    function spanTo(
      matrix: Matrix4,
      chain: readonly (readonly [number, number])[],
      u0: number,
      u1: number,
      z: number,
    ) {
      chainSpan(chain, u0, u1).forEach(([x, y], i) =>
        pts[i].set(x * S_SCALE, y * S_SCALE, z).applyMatrix4(matrix),
      );
    }

    function renderFilaments(
      pose: EnginePose,
      base: number,
      finale: boolean,
      p: number,
      t: number,
    ) {
      const front = CHANNEL.depth / 2 + CHANNEL.coverDepth + 0.05;
      // 0–15: the S drawn in light — reference channels (outer + inner, both channels), then
      // the inner ones stay as the gold seam once the metal is in place.
      for (let k = 0; k < 2; k++) {
        const bp = Math.min(1, Math.max(0, (pose.blueprint - k * 0.12) / 0.88));
        for (let ci = 0; ci < 2; ci++) {
          const innerChain = ci === 1;
          for (let sIdx = 0; sIdx < 4; sIdx++) {
            const idx = base + k * 8 + ci * 4 + sIdx;
            const grow = Math.min(1, Math.max(0, bp * 4 - sIdx));
            const fadeOuter = innerChain ? 0 : pose.blueprintFade;
            const seamOn = innerChain ? pose.seam : 0;
            const intensity =
              grow *
              ((1 - fadeOuter) * (finale ? 1.15 : 0.75) * (innerChain ? 1 - pose.seam : 1) +
                seamOn * 1.1);
            if (intensity <= 0.01) {
              filaments.hide(idx);
              continue;
            }
            const chain = innerChain ? S_INNER : S_OUTER;
            // Before its channel arrives the blueprint sits where the metal will lock (in the
            // finale: the emblem's final place — the S is drawn in light, then the metal lands).
            const mtx = pose.channels[k].arrive >= 1 ? ch[k] : finale ? lock[k] : rest[k];
            spanTo(mtx, chain, sIdx / 4, (sIdx + 1) / 4, innerChain ? 0 : front - 0.1);
            if (innerChain) {
              // The seam rides just off the concave edge, into the counter.
              const [nx, ny] = chainNormal(S_INNER, S_OUTER, (sIdx + 0.5) / 4);
              w.set(nx * 0.08, ny * 0.08, 0)
                .transformDirection(mtx)
                .multiplyScalar(0.08);
              pts.forEach((pt) => pt.add(w));
            }
            cubicThrough(idx, pts[0], pts[1], pts[2], pts[3]);
            filaments.params(idx, {
              s1: grow,
              width: innerChain && seamOn > 0 ? 0.045 : finale ? 0.034 : 0.022,
              intensity,
              violet: innerChain ? 1 - seamOn : 0.85,
              pulse: innerChain ? 0.6 : 1.4,
              phase: (k * 8 + ci * 4 + sIdx) * 0.07,
              speed: 0.4,
            });
          }
        }
      }
      // 16–21: the S's centre channels — energy routed along each channel's face.
      for (let k = 0; k < 2; k++) {
        for (let sIdx = 0; sIdx < 3; sIdx++) {
          const idx = base + 16 + k * 3 + sIdx;
          const on = Math.min(1, Math.max(0, pose.route * 3 - sIdx));
          if (on <= 0.01 || pose.channels[k].arrive < 1) {
            filaments.hide(idx);
            continue;
          }
          spanTo(ch[k], S_MID, 0.04 + sIdx * 0.31, 0.04 + (sIdx + 1) * 0.31, front);
          cubicThrough(idx, pts[0], pts[1], pts[2], pts[3]);
          filaments.params(idx, {
            s1: on,
            width: 0.022,
            intensity: (0.38 + pose.energy * 0.3 + pose.pulse * 0.5) * (finale ? 1.4 : 1),
            violet: finale ? 0.15 : 0.9,
            pulse: 1.4,
            phase: k * 0.5 + sIdx * 0.17,
            speed: 0.55,
          });
        }
      }
      // 22–27: founder acquisition — a short stroke from the port into the S's own centre
      // channel as the signal docks (the S then carries it), width by the signal's weight.
      PORTS.forEach((pt, i) => {
        const idx = base + 22 + i;
        const d = pose.docked[i];
        if (d <= 0 || d >= 1 || finale || pose.channels[pt.channel].arrive < 1) {
          filaments.hide(idx);
          return;
        }
        const { x, y, nx, ny } = portLocal(i);
        const [mx, my] = chainAt(S_MID, pt.u);
        const A = pts[0]
          .set(x * S_SCALE + nx * 0.2, y * S_SCALE + ny * 0.2, front)
          .applyMatrix4(ch[pt.channel]);
        const C1 = pts[1]
          .set((x * 0.7 + mx * 0.3) * S_SCALE, (y * 0.7 + my * 0.3) * S_SCALE, front + 0.3)
          .applyMatrix4(ch[pt.channel]);
        const C2 = pts[2]
          .set(mx * S_SCALE, my * S_SCALE, front + 0.12)
          .applyMatrix4(ch[pt.channel]);
        const B = pts[3].set(mx * S_SCALE, my * S_SCALE, front).applyMatrix4(ch[pt.channel]);
        filaments.curve(idx, A.x, A.y, A.z, C1.x, C1.y, C1.z, C2.x, C2.y, C2.z, B.x, B.y, B.z);
        filaments.params(idx, {
          s0: smoothstep(0.55, 1, d),
          s1: smoothstep(0, 0.6, d),
          width: 0.016 + WEIGHTS[i] * 0.07,
          intensity: 0.9,
          pulse: 1.2,
          phase: i * 0.17,
          speed: 0.5,
        });
      });
      // 28–32: each wafer's central bus (gold), until the wafer splits for the aperture.
      pose.wafers.forEach((wf, j) => {
        const idx = base + 28 + j;
        const on = Math.min(1, Math.max(0, wf.arrive)) * pose.kernel;
        if (on <= 0.01 || wf.split > 0.05) {
          filaments.hide(idx);
          return;
        }
        const z = wf.z + WAFER.thickness / 2 + 0.008;
        const A = pts[0].set(wf.slide, -WAFER.h / 2 + 0.25, z).applyMatrix4(place);
        const B = pts[1].set(wf.slide, WAFER.h / 2 - 0.25, z).applyMatrix4(place);
        filaments.arc(idx, A.x, A.y, A.z, B.x, B.y, B.z);
        filaments.params(idx, {
          s1: on,
          width: 0.03,
          intensity: 0.5 + 0.5 * pose.energy,
          violet: j === 0 ? 0 : 0.5,
          pulse: 1.5,
          phase: j * 0.2,
          speed: 0.8,
        });
      });
      // 33–35: VOID — distant signals appear one by one, then streak into the counter.
      const vv = local(p, "void");
      const aa = local(p, "awakening");
      VOID_SIGNALS.forEach((sig, j) => {
        const idx = base + 33 + j;
        const appear = finale ? 0 : smoothstep(sig.at, sig.at + 0.12, vv);
        const travel = smoothstep(0.0 + j * 0.03, 0.16 + j * 0.03, aa);
        if (appear <= 0 || travel >= 1) {
          filaments.hide(idx);
          return;
        }
        const [x, y, z] = sig.from;
        filaments.arc(idx, x, y, z, 0, 0, 0, sig.bend[0], sig.bend[1], sig.bend[2]);
        const head = 0.03 + travel * 0.97;
        filaments.params(idx, {
          s0: Math.max(0, head - 0.025 - travel * 0.12),
          s1: head,
          width: 1.5 - travel * 0.9,
          intensity: appear * (2.4 + 0.5 * Math.sin(t * 1.7 + j)),
          violet: j === 1 ? 0.8 : 0,
          pulse: 0,
        });
      });
      // 36: the gold signal that leads the camera into the aperture.
      {
        const idx = base + 36;
        if (pose.signal <= 0 || pose.signal >= 1 || finale) filaments.hide(idx);
        else {
          filaments.arc(idx, 0.05, 0.25, 16, 0.05, 0.1, -46);
          const head = pose.signal;
          filaments.params(idx, {
            s0: Math.max(0, head - 0.07),
            s1: head,
            width: 0.09,
            intensity: 2.2,
            pulse: 0,
          });
        }
      }
      // 37–40: inside the aperture, faint structure far ahead.
      for (let j = 0; j < 4; j++) {
        const idx = base + 37 + j;
        if (pose.hint <= 0) {
          filaments.hide(idx);
          continue;
        }
        const [x, y, z] = HINTS[j];
        filaments.arc(idx, x - 16, y, z, x + 16, y - 1.5, z - 6, 0, 2.5, 0);
        filaments.params(idx, {
          s0: 0.5 - 0.5 * pose.hint,
          s1: 0.5 + 0.5 * pose.hint,
          width: 0.07,
          intensity: pose.hint * 0.75,
          violet: j % 2 ? 0.7 : 0,
          pulse: 1.2,
          phase: j * 0.3,
          speed: 0.35,
        });
      }
    }
  });

  return (
    <>
      <group ref={root}>
        {[0, 1].map((k) => (
          <group
            key={k}
            matrixAutoUpdate={false}
            ref={(el) => {
              channelGroups.current[k] = el;
            }}
          >
            <mesh geometry={built.body} material={materials.sMetal} />
            {built.stripe.map((g, i) => (
              <mesh key={`s${i}`} geometry={g} material={materials.champagne} />
            ))}
            {built.cover.map((g, i) => (
              <mesh key={`c${i}`} geometry={g} material={materials.sCover} />
            ))}
            <mesh geometry={built.seam} material={seamMaterial} userData={{ seam: true }} />
          </group>
        ))}
        <instancedMesh
          ref={wafers}
          args={[built.wafer, materials.smoked, WAFER_Z.length * 2]}
          frustumCulled={false}
          renderOrder={2}
        />
        <instancedMesh
          ref={rims}
          args={[built.waferRim, materials.energy, WAFER_Z.length * 2]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={traces}
          args={[built.unit, materials.energy, TRACES.length]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={pads}
          args={[built.pad, materials.energy, TRACES.length]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={struts}
          args={[built.strut, materials.titanium, 4]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={collars}
          args={[built.collar, materials.champagne, 4]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={sockets}
          args={[built.socket, materials.graphite, PORTS.length]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={portLights}
          args={[built.unit, materials.energy, PORTS.length]}
          frustumCulled={false}
        />
      </group>
      {/* Always in the scene (intensity only): toggling a light changes the light count and
        forces every lit shader to recompile mid-scroll. */}
      <pointLight ref={violetLight} color="#8f7fe8" intensity={0} distance={14} decay={2} />
      <pointLight ref={goldLight} color="#f2c98c" intensity={0} distance={16} decay={2} />
    </>
  );
}
