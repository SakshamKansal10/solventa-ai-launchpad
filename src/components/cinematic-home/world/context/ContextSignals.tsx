import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { smoothstep } from "../../math";
import { portPosition } from "../core/core-motion";
import { useWorld } from "../WorldContext";
import { SIGNALS, signalTravel } from "./context-model";

/**
 * The founder's six signals as INPUT MODULES: each is a small machined
 * instrument that encodes its value (capital level, skill matrix, coordinate,
 * hours dial, experience layers, connector array), travels in from the dark
 * on a carrier trace and docks into its port on the Engine's outer frame —
 * where the core lights the port, opens a channel and turns one layer.
 */
const APPROACH: { from: [number, number, number]; bow: [number, number, number] }[] = [
  { from: [-30, 9, 22], bow: [-7, 6, 9] }, // capital
  { from: [28, 13, 24], bow: [7, 8, 5] }, // skills
  { from: [-9, 28, 12], bow: [-4, 5, 8] }, // location
  { from: [31, -7, 14], bow: [5, -6, 10] }, // time
  { from: [-26, -17, 18], bow: [-8, -4, 7] }, // experience
  { from: [11, -27, 20], bow: [6, -7, 6] }, // customer access
];
const DOCKS = SIGNALS.map((_, i) => portPosition(i));

const quadBezier = (a: number, b: number, c: number, t: number) =>
  (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;

export function ContextSignals() {
  const { store, materials, filaments } = useWorld();
  const groups = useRef<(Group | null)[]>([]);
  const needle = useRef<Mesh>(null);
  const gimbal = useRef<(Mesh | null)[]>([]);
  const geo = useMemo(
    () => ({
      segment: new RoundedBoxGeometry(0.26, 0.42, 0.3, 2, 0.04),
      cell: new RoundedBoxGeometry(0.3, 0.3, 0.3, 2, 0.05),
      base: new RoundedBoxGeometry(2.0, 0.16, 0.9, 2, 0.05),
      pin: new CylinderGeometry(0.07, 0.07, 0.5, 12),
      ring: new TorusGeometry(1.0, 0.03, 8, 72),
      rod: new CylinderGeometry(0.02, 0.02, 2.4, 6),
      dial: new LatheGeometry(
        [
          [0.88, -0.07],
          [1.06, -0.07],
          [1.1, 0],
          [1.06, 0.07],
          [0.88, 0.07],
        ].map(([x, y]) => new Vector2(x, y)),
        64,
      ).rotateX(Math.PI / 2),
      tick: new BoxGeometry(0.04, 0.18, 0.04),
      hand: new BoxGeometry(0.05, 0.85, 0.05),
      plate: new RoundedBoxGeometry(1.8, 0.07, 1.2, 2, 0.03),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  const fil = useMemo(() => filaments.range("context", 12), [filaments]);
  const tmp = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const s = store.state;
    const p = s.progress;
    SIGNALS.forEach((sig, i) => {
      const g = groups.current[i];
      const t = signalTravel(p, i);
      const d = DOCKS[i];
      const a = APPROACH[i];
      // Flight: in along a curve, decelerating; then slides into its port and is absorbed.
      const f = 1 - Math.pow(1 - smoothstep(0, 0.82, t), 2);
      const x = quadBezier(a.from[0], d.x + a.bow[0], d.x, f);
      const y = quadBezier(a.from[1], d.y + a.bow[1], d.y, f);
      const z = quadBezier(a.from[2], d.z + a.bow[2], d.z, f);
      const absorb = smoothstep(0.8, 1, t);
      const present = t > 0 && t < 1;
      if (g) {
        g.visible = present;
        g.position.set(x, y, z);
        g.lookAt(0, 0, 0);
        g.scale.setScalar(1.6 * (1 - absorb) * (0.55 + 0.45 * smoothstep(0, 0.25, t)));
      }
      s.anchors.set(`signal-${sig.id}`, {
        x,
        y: y + 1.6,
        z,
        o: smoothstep(0.08, 0.25, t) * (1 - smoothstep(0.66, 0.82, t)),
      });

      // The carrier trace: a fine line of light behind the module, drawn from the dark.
      const idx = fil.start + i;
      if (!present) filaments.hide(idx);
      else {
        tmp.set(d.x + a.bow[0], d.y + a.bow[1], d.z + a.bow[2]);
        filaments.curve(
          idx,
          a.from[0],
          a.from[1],
          a.from[2],
          a.from[0] + (tmp.x - a.from[0]) * 0.66,
          a.from[1] + (tmp.y - a.from[1]) * 0.66,
          a.from[2] + (tmp.z - a.from[2]) * 0.66,
          d.x + (tmp.x - d.x) * 0.66,
          d.y + (tmp.y - d.y) * 0.66,
          d.z + (tmp.z - d.z) * 0.66,
          d.x,
          d.y,
          d.z,
        );
        filaments.params(idx, {
          s0: Math.max(0, f - 0.32),
          s1: f,
          width: 0.04,
          intensity: 0.9 * (1 - absorb),
          violet: 0.85,
          pulse: 1.4,
          phase: i * 0.2,
          speed: 0.8,
        });
      }

      // LOCATION: the coordinate gimbal settles into one fix as it arrives.
      if (sig.id === "location") {
        gimbal.current.forEach((ring, k) => {
          if (!ring) return;
          const fix = smoothstep(0.1, 0.7, t);
          ring.rotation.set(
            (1 - fix) * (1.2 + k),
            (1 - fix) * (0.8 * k + 0.5),
            k * (Math.PI / 3) * fix,
          );
        });
      }
      // TIME: the hand sweeps to 12 of 40 working hours.
      if (sig.id === "time" && needle.current) {
        needle.current.rotation.z = -smoothstep(0.15, 0.7, t) * (12 / 40) * Math.PI * 2;
      }
    });
    for (let k = SIGNALS.length; k < fil.count; k++) filaments.hide(fil.start + k);
  });

  const ref = (i: number) => (el: Group | null) => {
    groups.current[i] = el;
  };
  return (
    <>
      {/* CAPITAL — a machined level gauge: three of eight cells charged (₹50,000). */}
      <group ref={ref(0)} visible={false}>
        {Array.from({ length: 8 }, (_, k) => (
          <mesh
            key={k}
            geometry={geo.segment}
            material={k < 3 ? materials.edgeGold : materials.titanium}
            position={[(k - 3.5) * 0.32, 0, 0]}
          />
        ))}
      </group>
      {/* SKILLS — a 3 × 3 skill matrix; the digital cells are lit. */}
      <group ref={ref(1)} visible={false}>
        {Array.from({ length: 9 }, (_, k) => (
          <mesh
            key={k}
            geometry={geo.cell}
            material={[0, 1, 3, 4].includes(k) ? materials.edgeIndigo : materials.graphite}
            position={[((k % 3) - 1) * 0.42, (Math.floor(k / 3) - 1) * 0.42, 0]}
          />
        ))}
      </group>
      {/* LOCATION — a coordinate gimbal that settles into one fix. */}
      <group ref={ref(2)} visible={false}>
        {[0, 1, 2].map((k) => (
          <mesh
            key={k}
            ref={(el) => {
              gimbal.current[k] = el;
            }}
            geometry={geo.ring}
            material={k === 0 ? materials.champagne : materials.titanium}
            scale={1 - k * 0.18}
          />
        ))}
        <mesh geometry={geo.rod} material={materials.titanium} />
        <mesh geometry={geo.rod} material={materials.titanium} rotation={[0, 0, Math.PI / 2]} />
      </group>
      {/* TIME — a calibrated dial; the hand sets 12 hours a week. */}
      <group ref={ref(3)} visible={false}>
        <mesh geometry={geo.dial} material={materials.titanium} />
        {Array.from({ length: 12 }, (_, k) => {
          const a = (k / 12) * Math.PI * 2;
          return (
            <mesh
              key={k}
              geometry={geo.tick}
              material={k < 4 ? materials.edgeGold : materials.pearl}
              position={[Math.sin(a) * 0.78, Math.cos(a) * 0.78, 0]}
              rotation={[0, 0, -a]}
            />
          );
        })}
        <mesh
          ref={needle}
          geometry={geo.hand}
          material={materials.edgeIndigo}
          position={[0, 0, 0.06]}
        />
      </group>
      {/* EXPERIENCE — layered plates; only the first is resolved (beginner). */}
      <group ref={ref(4)} visible={false}>
        {[0, 1, 2, 3].map((k) => (
          <mesh
            key={k}
            geometry={geo.plate}
            material={k === 0 ? materials.pearl : materials.smoked}
            position={[0, k * 0.22 - 0.33, 0]}
            renderOrder={k ? 2 : 0}
          />
        ))}
      </group>
      {/* CUSTOMER ACCESS — a connector array: two of five channels connected (limited). */}
      <group ref={ref(5)} visible={false}>
        <mesh geometry={geo.base} material={materials.graphite} />
        {Array.from({ length: 5 }, (_, k) => (
          <mesh
            key={k}
            geometry={geo.pin}
            material={k < 2 ? materials.edgeGold : materials.titanium}
            position={[(k - 2) * 0.38, 0.3, 0]}
          />
        ))}
      </group>
    </>
  );
}
