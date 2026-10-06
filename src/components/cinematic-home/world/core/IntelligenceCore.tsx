import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type PointLight,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { createCameraPath } from "../../camera/camera-path";
import { smoothstep } from "../../math";
import { local, progressOf } from "../../timeline/timeline";
import { frameGeometry, inlayGeometry } from "../geometry/frames";
import { useWorld } from "../WorldContext";
import { arrivalWindow, FRAMES, KERNEL, LATTICE, pinSpan, PORTS, STRUTS } from "./core-design";
import { enginePose, LAYERS, layerMatrices } from "./core-motion";

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
/** Faint distant signals glimpsed through the aperture before the reveal. */
const HINTS: [number, number, number][] = [
  [-9, 1.5, -30],
  [7, -2.5, -38],
  [1.5, 4.5, -47],
  [-4, -3.5, -54],
];
/** Founder-signal weights in the illustrative scoring model (channel width). */
const WEIGHTS = [0.22, 0.22, 0.1, 0.16, 0.14, 0.16];
/** Layers that overtake the camera on their way in (the rest rise out of the dark beyond). */
const PASSES_CAMERA = new Set([0, 2, 4]);

const COLORS_VIOLET = "#7d6ff0";
const COLORS_GOLD = "#f0cf8c";
const flat = (g: BufferGeometry) => (g.index ? g.toNonIndexed() : g);
const merge = (parts: BufferGeometry[]) => mergeGeometries(parts.map(flat));

interface Flight {
  from: Vector3;
  via: Vector3;
  turn: Quaternion;
  /** true: start facing the camera axis (the visitor looks through it). */
  facing: boolean;
}

function buildEngine(curveSegments: number) {
  const frames = FRAMES.map((f) => {
    const o = {
      hw: f.half,
      hh: f.half,
      bar: f.bar,
      depth: f.depth,
      radius: f.radius,
      curveSegments,
    };
    const body = frameGeometry(o);
    const trim: BufferGeometry[] = [];
    if (f.inlay) trim.push(inlayGeometry(o, 0.045, 0.03));
    // Machined index marks on the front face (an instrument scale, never decoration for its own sake).
    for (let k = 0; k < f.ticks; k++) {
      const u = (k + 1) / (f.ticks + 1) - 0.5;
      const along = u * (f.half * 2 - f.radius * 2.2);
      const edge = f.half - f.bar / 2;
      for (const [x, y, w, h] of [
        [along, edge, 0.035, f.bar * 0.55],
        [along, -edge, 0.035, f.bar * 0.55],
        [edge, along, f.bar * 0.55, 0.035],
        [-edge, along, f.bar * 0.55, 0.035],
      ]) {
        const t = new BoxGeometry(w, h, 0.02);
        t.translate(x, y, f.depth / 2 + 0.008);
        trim.push(t);
      }
    }
    return { body, trim: trim.length ? merge(trim) : null };
  });

  // Gimbal pins: two per layer, on the CHILD's axis, with a gold collar at the parent's edge.
  const pins = FRAMES.map((_, i) => {
    const [a, b] = pinSpan(i);
    const len = b - a;
    const childAxis = i + 1 < FRAMES.length ? FRAMES[i + 1].axis : KERNEL.axis;
    const parts: BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const rod = new CylinderGeometry(0.06, 0.06, len, 12, 1);
      rod.translate(0, side * (a + len / 2), 0);
      const collar = new CylinderGeometry(0.11, 0.11, 0.1, 16, 1);
      collar.translate(0, side * (b - 0.07), 0);
      for (const g of [rod, collar]) {
        // Cylinders run along y; lay them on x when the child turns about x.
        if (childAxis === "x") g.rotateZ(-Math.PI / 2);
        parts.push(g);
      }
    }
    return merge(parts);
  });
  // The aperture hairline on each frame's inner edge: lights in sequence down the tunnel.
  const apertures = FRAMES.map((f) =>
    inlayGeometry(
      { hw: f.half, hh: f.half, bar: f.bar, depth: f.depth, radius: f.radius, curveSegments },
      0.028,
      -0.028,
    ),
  );

  // Input ports on the outer frame: machined housings with a status window.
  const f1 = FRAMES[0];
  const portBody = merge(
    PORTS.map((pt) => {
      const vertical = Math.abs(pt.x) > Math.abs(pt.y);
      const g = new RoundedBoxGeometry(vertical ? 0.5 : 0.8, vertical ? 0.8 : 0.5, 0.34, 2, 0.06);
      g.translate(pt.x, pt.y, f1.depth / 2 + 0.12);
      return g;
    }),
  );
  const portLight = new BoxGeometry(1, 1, 1);

  const halfBox = new RoundedBoxGeometry(
    KERNEL.half,
    KERNEL.half * 2,
    KERNEL.half * 2,
    3,
    KERNEL.radius,
  );
  const seam = frameGeometry({
    hw: KERNEL.half - 0.08,
    hh: KERNEL.half - 0.08,
    bar: 0.03,
    depth: 0.012,
    radius: 0.12,
    bevel: 0,
  });
  seam.rotateY(Math.PI / 2);
  const node = new BoxGeometry(0.07, 0.07, 0.07);
  const strut = new BoxGeometry(1, 0.014, 0.014);
  return { frames, pins, apertures, portBody, portLight, halfBox, seam, node, strut };
}

/** Lattice split: nodes left / right of the kernel's seam, struts within each half, and across it. */
const SIDES = [-1, 1].map((side) => {
  const nodes = LATTICE.map((n, i) => ({ n, i })).filter(({ n }) => Math.sign(n[0]) === side);
  const struts = STRUTS.filter(
    ([a, b]) => Math.sign(LATTICE[a][0]) === side && Math.sign(LATTICE[b][0]) === side,
  );
  return { side, nodes, struts };
});
const CROSS = STRUTS.filter(([a, b]) => Math.sign(LATTICE[a][0]) !== Math.sign(LATTICE[b][0]));

export function IntelligenceCore({ variant = "origin" }: { variant?: "origin" | "finale" }) {
  const finale = variant === "finale";
  const { store, materials, filaments, preset, animate } = useWorld();
  const root = useRef<Group>(null);
  const layers = useRef<(Group | null)[]>([]);
  const pinGroups = useRef<(Group | null)[]>([]);
  const apertureMeshes = useRef<(Mesh | null)[]>([]);
  const halves = useRef<(Group | null)[]>([]);
  const nodeMeshes = useRef<(InstancedMesh | null)[]>([]);
  const crossMesh = useRef<InstancedMesh>(null);
  const portLights = useRef<InstancedMesh>(null);
  const strutMeshes = useRef<(InstancedMesh | null)[]>([]);
  const violetLight = useRef<PointLight>(null);
  const built = useMemo(
    () => buildEngine(Math.max(6, Math.round(preset.coreSegments / 6))),
    [preset.coreSegments],
  );
  const fil = useMemo(() => filaments.range(`core-${variant}`, 28), [filaments, variant]);

  // Flight paths in (origin only): fixed points derived from the camera path, so pure in scroll.
  const flights = useMemo<Flight[]>(() => {
    const path = createCameraPath();
    const P = new Vector3();
    const T = new Vector3();
    return FRAMES.map((_, i) => {
      const [w0] = arrivalWindow(i);
      if (PASSES_CAMERA.has(i)) {
        path.sample(progressOf("awakening", w0), P, T);
        const fwd = T.clone().sub(P).normalize();
        const turn = new Quaternion().setFromRotationMatrix(
          new Matrix4().lookAt(new Vector3(), fwd, new Vector3(0, 1, 0)),
        );
        return {
          from: P.clone().addScaledVector(fwd, -9),
          via: P.clone().addScaledVector(fwd, 26),
          turn,
          facing: true,
        };
      }
      const side = i % 4 === 1 ? -1 : 1;
      return {
        from: new Vector3(side * 9, -16 * side, -52),
        via: new Vector3(side * 3, -5 * side, -14),
        turn: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), side * 2.4),
        facing: false,
      };
    });
  }, []);

  const scratch = useMemo(
    () => ({
      mats: [] as Matrix4[],
      pos: new Vector3(),
      quat: new Quaternion(),
      scl: new Vector3(),
      q2: new Quaternion(),
      v: new Vector3(),
      w: new Vector3(),
      o: new Object3D(),
      c: new Color(),
      violet: new Color(COLORS_VIOLET),
      gold: new Color(COLORS_GOLD),
    }),
    [],
  );

  useEffect(
    () => () => {
      for (const f of built.frames) {
        f.body.dispose();
        f.trim?.dispose();
      }
      for (const g of built.pins) g.dispose();
      for (const g of built.apertures) g.dispose();
      [built.portBody, built.portLight, built.halfBox, built.seam, built.node, built.strut].forEach(
        (g) => g.dispose(),
      );
    },
    [built],
  );

  // Static lattice struts (instance matrices never change; only visibility of the cross ones).
  useEffect(() => {
    const o = scratch.o;
    const place = (mesh: InstancedMesh | null, list: [number, number][], offsetX: number) => {
      if (!mesh) return;
      list.forEach(([a, b], k) => {
        const A = LATTICE[a];
        const B = LATTICE[b];
        o.position.set((A[0] + B[0]) / 2 - offsetX, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2);
        const dx = B[0] - A[0];
        const dy = B[1] - A[1];
        const len = Math.hypot(dx, dy, B[2] - A[2]);
        o.rotation.set(
          0,
          Math.abs(B[2] - A[2]) > 1e-6 ? -Math.PI / 2 : 0,
          Math.abs(dy) > 1e-6 ? Math.PI / 2 : 0,
        );
        o.scale.set(len, 1, 1);
        o.updateMatrix();
        mesh.setMatrixAt(k, o.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    SIDES.forEach((s, i) => place(strutMeshes.current[i], s.struts, 0));
    place(crossMesh.current, CROSS, 0);
  }, [scratch]);

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
      return;
    }
    const t = animate ? s.time : 0;
    // Micro-mechanical life: the locked gimbal breathes by fractions of a degree.
    if (animate && pose.pins > 0.5)
      for (let i = 1; i < LAYERS; i++) pose.angles[i] += 0.035 * Math.sin(t * 0.33 + i * 1.7);
    const mats = layerMatrices(pose, scratch.mats);
    const { pos, quat, scl, q2, v, w } = scratch;

    for (let i = 0; i < LAYERS; i++) {
      const g = layers.current[i];
      if (!g) continue;
      const u = Math.min(1, Math.max(0, pose.arrive[i]));
      g.visible = u > 0;
      mats[i].decompose(pos, quat, scl);
      if (u < 1 && i < FRAMES.length) {
        if (finale) {
          // Resolve out of the kernel: grow and turn into place.
          scl.setScalar(Math.max(0.001, 1 - Math.pow(1 - u, 3)));
          q2.setFromAxisAngle(w.set(0, 0, 1), (1 - u) * 1.2);
          quat.multiply(q2);
        } else {
          const f = flights[i];
          const e = 1 - Math.pow(1 - u, 2.4);
          // Quadratic Bézier: from → via → rest.
          v.copy(f.from).multiplyScalar((1 - e) * (1 - e));
          v.addScaledVector(f.via, 2 * (1 - e) * e).addScaledVector(pos, e * e);
          pos.copy(v);
          const turn = smoothstep(f.facing ? 0.35 : 0.1, 1, u);
          if (f.facing) q2.copy(f.turn);
          else q2.copy(quat).multiply(f.turn);
          quat.copy(q2.slerp(quat, turn));
        }
      } else if (u < 1) {
        scl.setScalar(Math.max(0.001, u));
      }
      g.matrix.compose(pos, quat, scl);
      g.matrixWorldNeedsUpdate = true;
      const pins = pinGroups.current[i];
      // Pins unlock (retract into the frame) before the layers slide apart.
      if (pins) pins.visible = pose.pins > 0.5;
      const ap = apertureMeshes.current[i];
      if (ap) ap.visible = pose.lit[i] ?? false;
    }

    // Kernel: halves part for the passage; the lattice splits with them.
    halves.current.forEach((h, k) => {
      if (h) h.position.x = (k === 0 ? -1 : 1) * (KERNEL.half / 2 + pose.part);
    });
    if (crossMesh.current) crossMesh.current.visible = pose.part < 0.02;

    // Inference: lattice nodes carry violet pulses; each docked signal lights its region in gold.
    const { c, violet, gold } = scratch;
    SIDES.forEach((side, k) => {
      const mesh = nodeMeshes.current[k];
      if (!mesh) return;
      side.nodes.forEach(({ n, i }, j) => {
        const wave = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 1.93 + n[1] * 3);
        const sweep = smoothstep(0, 1, pose.wake * 3 - (i / LATTICE.length) * 2);
        const region = i % 6;
        const flash = pose.docked[region] * (1 - pose.docked[region]) * 4;
        const level = sweep * (0.14 + pose.energy * (0.35 + 0.65 * wave));
        c.copy(violet)
          .multiplyScalar(Math.min(1.05, level * 1.25))
          .lerp(gold, Math.min(1, flash * 0.9));
        mesh.setColorAt(j, c);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });

    // Port status windows: idle indigo → gold when the founder's signal has docked.
    if (portLights.current) {
      const pl = portLights.current;
      const o = scratch.o;
      PORTS.forEach((pt, i) => {
        const vertical = Math.abs(pt.x) > Math.abs(pt.y);
        o.position.set(pt.x, pt.y, FRAMES[0].depth / 2 + 0.3);
        o.rotation.set(0, 0, 0);
        o.scale.set(vertical ? 0.12 : 0.46, vertical ? 0.46 : 0.12, 0.02);
        o.updateMatrix();
        pl.setMatrixAt(i, o.matrix);
        const d = pose.docked[i];
        c.copy(violet)
          .multiplyScalar(0.35 * pose.wake)
          .lerp(gold, d);
        c.multiplyScalar(0.6 + 0.8 * d);
        pl.setColorAt(i, c);
      });
      pl.instanceMatrix.needsUpdate = true;
      if (pl.instanceColor) pl.instanceColor.needsUpdate = true;
    }

    if (violetLight.current) {
      violetLight.current.position.setFromMatrixPosition(mats[LAYERS - 1]);
      violetLight.current.intensity = pose.wake * (2.5 + pose.energy * 4.5 + pose.pulse * 4);
    }

    // ---- Filaments ------------------------------------------------------------------
    const kernelAt = v.setFromMatrixPosition(mats[LAYERS - 1]).clone();
    // 0–5: founder channels — port → kernel, width by the signal's weight.
    PORTS.forEach((pt, i) => {
      const idx = fil.start + i;
      const d = pose.docked[i];
      if (d <= 0 || finale) {
        filaments.hide(idx);
        return;
      }
      const A = w
        .set(pt.x, pt.y, FRAMES[0].depth / 2 + 0.2)
        .applyMatrix4(mats[0])
        .clone();
      // Routed behind the layers (into the engine), then forward into the kernel.
      const C1 = w
        .set(pt.x * 0.92, pt.y * 0.92, -2.2)
        .applyMatrix4(mats[0])
        .clone();
      const C2 = w
        .set(0, 0, -2.0)
        .applyMatrix4(mats[LAYERS - 1])
        .clone();
      filaments.curve(
        idx,
        A.x,
        A.y,
        A.z,
        C1.x,
        C1.y,
        C1.z,
        C2.x,
        C2.y,
        C2.z,
        kernelAt.x,
        kernelAt.y,
        kernelAt.z,
      );
      filaments.params(idx, {
        s1: smoothstep(0, 0.7, d),
        width: 0.016 + WEIGHTS[i] * 0.07,
        intensity: (0.3 + 0.45 * d) * pose.pins,
        pulse: 1.2,
        phase: i * 0.17,
        speed: 0.5,
      });
    });
    // 6–11: the signal path through the gimbal — pivot to pivot, inward to the kernel.
    for (let i = 0; i < FRAMES.length; i++) {
      const idx = fil.start + 6 + i;
      const g = layers.current[i];
      if (!g || pose.arrive[i] < 1 || pose.pins < 0.05) {
        filaments.hide(idx);
        continue;
      }
      const [a, b] = pinSpan(i);
      const ax = i + 1 < FRAMES.length ? FRAMES[i + 1].axis : KERNEL.axis;
      const A = w
        .set(ax === "x" ? b : 0, ax === "x" ? 0 : b, 0)
        .applyMatrix4(mats[i])
        .clone();
      const B = w
        .set(ax === "x" ? a : 0, ax === "x" ? 0 : a, 0)
        .applyMatrix4(mats[i])
        .clone();
      filaments.arc(idx, A.x, A.y, A.z, B.x, B.y, B.z, 0, 0, 0.35);
      filaments.params(idx, {
        width: 0.026,
        intensity: pose.wake * (0.45 + pose.pulse * 0.9) * pose.pins,
        violet: 0.6,
        pulse: 1.4,
        phase: i * 0.21,
        speed: 0.7,
      });
    }
    // 12–17: inference traces inside the kernel lattice (violet).
    for (let j = 0; j < 6; j++) {
      const idx = fil.start + 12 + j;
      if (pose.wake <= 0 || pose.part > 0.3) {
        filaments.hide(idx);
        continue;
      }
      // Straight runs along the lattice struts — data moving through a circuit.
      const [ia, ib] = STRUTS[(j * 11 + 3) % STRUTS.length];
      const A = LATTICE[ia];
      const B = LATTICE[ib];
      const PA = w
        .set(A[0], A[1], A[2])
        .applyMatrix4(mats[LAYERS - 1])
        .clone();
      const PB = w
        .set(B[0], B[1], B[2])
        .applyMatrix4(mats[LAYERS - 1])
        .clone();
      filaments.arc(idx, PA.x, PA.y, PA.z, PB.x, PB.y, PB.z);
      filaments.params(idx, {
        width: 0.022,
        intensity: pose.wake * (0.6 + pose.energy * 0.8),
        violet: 1,
        pulse: 1.6,
        phase: j * 0.29,
        speed: 0.9,
      });
    }
    // 18: a single gold S traced through the lattice — Solventia, quietly.
    {
      const idx = fil.start + 18;
      if (pose.wake <= 0 || pose.part > 0.3) filaments.hide(idx);
      else {
        const m = mats[LAYERS - 1];
        const A = w.set(-0.5, 0.62, 0.3).applyMatrix4(m).clone();
        const C1 = w.set(1.4, 0.62, 0.3).applyMatrix4(m).clone();
        const C2 = w.set(-1.4, -0.62, -0.3).applyMatrix4(m).clone();
        const B = w.set(0.5, -0.62, -0.3).applyMatrix4(m).clone();
        filaments.curve(idx, A.x, A.y, A.z, C1.x, C1.y, C1.z, C2.x, C2.y, C2.z, B.x, B.y, B.z);
        filaments.params(idx, {
          s1: smoothstep(
            0.1,
            0.45,
            pose.wake * (finale ? 1 : smoothstep(0.55, 0.9, local(p, "awakening"))),
          ),
          width: 0.024,
          intensity: 0.9,
          pulse: 0.5,
          speed: 0.25,
        });
      }
    }
    // 19–22: inside the tunnel, the first hints of something far larger ahead.
    for (let j = 0; j < 4; j++) {
      const idx = fil.start + 19 + j;
      if (pose.hint <= 0) {
        filaments.hide(idx);
        continue;
      }
      // Long, faint structural lines far ahead: the horizon of something much larger.
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
    // 23–25: VOID — distant signals appear one by one, then streak into the kernel.
    const vv = local(p, "void");
    const aa = local(p, "awakening");
    VOID_SIGNALS.forEach((sig, j) => {
      const idx = fil.start + 23 + j;
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
    for (let j = 26; j < fil.count; j++) filaments.hide(fil.start + j);
  });

  return (
    <>
      <group ref={root}>
        {FRAMES.map((f, i) => (
          <group
            key={f.id}
            matrixAutoUpdate={false}
            ref={(el) => {
              layers.current[i] = el;
            }}
          >
            <mesh geometry={built.frames[i].body} material={materials.titanium} />
            <mesh
              ref={(el) => {
                apertureMeshes.current[i] = el;
              }}
              geometry={built.apertures[i]}
              material={finale ? materials.edgeGold : materials.edgeIndigo}
              visible={false}
            />
            {built.frames[i].trim && (
              <mesh geometry={built.frames[i].trim!} material={materials.champagne} />
            )}
            <group
              ref={(el) => {
                pinGroups.current[i] = el;
              }}
            >
              <mesh geometry={built.pins[i]} material={materials.titanium} />
            </group>
            {i === 0 && (
              <>
                <mesh geometry={built.portBody} material={materials.graphite} />
                <instancedMesh
                  ref={portLights}
                  args={[built.portLight, materials.energy, PORTS.length]}
                />
              </>
            )}
          </group>
        ))}
        <group
          matrixAutoUpdate={false}
          ref={(el) => {
            layers.current[LAYERS - 1] = el;
          }}
        >
          {SIDES.map((side, k) => (
            <group
              key={side.side}
              ref={(el) => {
                halves.current[k] = el;
              }}
            >
              <mesh geometry={built.halfBox} material={materials.smoked} renderOrder={2} />
              <mesh
                geometry={built.seam}
                material={materials.edgeIndigo}
                position={[(-side.side * KERNEL.half) / 2 + side.side * 0.004, 0, 0]}
              />
              <group position={[(-side.side * KERNEL.half) / 2, 0, 0]}>
                <instancedMesh
                  ref={(el) => {
                    nodeMeshes.current[k] = el;
                    if (el) {
                      const o = new Object3D();
                      side.nodes.forEach(({ n }, j) => {
                        o.position.set(n[0], n[1], n[2]);
                        o.updateMatrix();
                        el.setMatrixAt(j, o.matrix);
                        el.setColorAt(j, new Color(0, 0, 0));
                      });
                      el.instanceMatrix.needsUpdate = true;
                    }
                  }}
                  args={[built.node, materials.energy, side.nodes.length]}
                />
                <instancedMesh
                  ref={(el) => {
                    strutMeshes.current[k] = el;
                  }}
                  args={[built.strut, materials.graphite, side.struts.length]}
                />
              </group>
            </group>
          ))}
          <instancedMesh ref={crossMesh} args={[built.strut, materials.graphite, CROSS.length]} />
        </group>
      </group>
      {/* Always in the scene (intensity only): toggling a light changes the light count and
        forces every lit shader to recompile mid-scroll. */}
      <pointLight ref={violetLight} color="#8f7fe8" intensity={0} distance={14} decay={2} />
    </>
  );
}
