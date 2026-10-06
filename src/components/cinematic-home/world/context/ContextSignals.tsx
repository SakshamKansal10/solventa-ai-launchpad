import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
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
import { useWorld } from "../WorldContext";
import { SIGNALS, signalTravel } from "./context-model";

/** Where each signal docks on the core (core-local, radius ≈ 5.5) and the bow of its approach. */
const DOCKS: {
  dock: [number, number, number];
  from: [number, number, number];
  bow: [number, number, number];
}[] = [
  { dock: [-4.4, 1.3, 3.1], from: [-26, 8, 18], bow: [-6, 6, 10] }, // capital
  { dock: [3.7, 2.6, 3.4], from: [24, 12, 20], bow: [6, 8, 4] }, // skills
  { dock: [-1.4, 4.9, 2.3], from: [-8, 26, 10], bow: [-4, 4, 8] }, // location
  { dock: [4.5, -1.7, 2.9], from: [28, -6, 12], bow: [4, -6, 10] }, // time
  { dock: [-3.5, -3.3, 3.0], from: [-22, -16, 16], bow: [-8, -4, 6] }, // experience
  { dock: [1.6, -4.5, 3.3], from: [10, -24, 18], bow: [6, -6, 6] }, // customer access
];

const quadBezier = (a: number, b: number, c: number, t: number) =>
  (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;

export function ContextSignals() {
  const { store, materials, filaments } = useWorld();
  const groups = useRef<(Group | null)[]>([]);
  const needle = useRef<Mesh>(null);
  const gimbal = useRef<(Mesh | null)[]>([]);
  const geo = useMemo(
    () => ({
      segment: new CylinderGeometry(0.16, 0.16, 0.26, 16),
      ring: new TorusGeometry(1.0, 0.025, 8, 64),
      rod: new CylinderGeometry(0.018, 0.018, 2.4, 6),
      dial: new LatheGeometry(
        [
          [0.9, -0.06],
          [1.05, -0.06],
          [1.08, 0],
          [1.05, 0.06],
          [0.9, 0.06],
        ].map(([x, y]) => new Vector2(x, y)),
        48,
      ).rotateX(Math.PI / 2),
      tick: new RoundedBoxGeometry(0.04, 0.18, 0.04, 1, 0.01),
      hand: new RoundedBoxGeometry(0.05, 0.85, 0.05, 1, 0.02),
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
      // Flight: arrive along a curve, slow on approach, shrink into the dock.
      const f = 1 - Math.pow(1 - smoothstep(0, 0.82, t), 2);
      const x = quadBezier(d.from[0], d.dock[0] + d.bow[0], d.dock[0], f);
      const y = quadBezier(d.from[1], d.dock[1] + d.bow[1], d.dock[1], f);
      const z = quadBezier(d.from[2], d.dock[2] + d.bow[2], d.dock[2], f);
      const absorb = smoothstep(0.78, 1, t);
      const present = t > 0 && t < 1;
      if (g) {
        g.visible = present && sig.id !== "skills" && sig.id !== "access";
        g.position.set(x, y, z);
        g.lookAt(0, 0, 0);
        g.scale.setScalar(1.7 * (1 - absorb) * (0.55 + 0.45 * smoothstep(0, 0.25, t)));
      }
      s.anchors.set(`signal-${sig.id}`, {
        x,
        y: y + 1.5,
        z,
        o: smoothstep(0.08, 0.25, t) * (1 - smoothstep(0.62, 0.8, t)),
      });

      // Signals made of light: SKILLS as five coordinated strands, ACCESS as a short branching tree.
      if (sig.id === "skills") {
        for (let k = 0; k < 5; k++) {
          const idx = fil.start + k;
          if (!present) {
            filaments.hide(idx);
            continue;
          }
          const off = (k - 2) * 0.45;
          tmp.set(d.from[0], d.from[1] + off, d.from[2]);
          filaments.curve(
            idx,
            tmp.x + off,
            tmp.y,
            tmp.z,
            d.from[0] * 0.6 + d.bow[0] + off * 2,
            d.from[1] * 0.6 + d.bow[1] - off,
            d.from[2] * 0.6 + d.bow[2],
            d.dock[0] + d.bow[0] * 0.3 - off,
            d.dock[1] + d.bow[1] * 0.3 + off,
            d.dock[2] + 1.2,
            d.dock[0],
            d.dock[1],
            d.dock[2],
          );
          filaments.params(idx, {
            s0: smoothstep(0.55, 1, t),
            s1: smoothstep(0.0, 0.7, t),
            width: 0.05,
            intensity: 1.1,
            pulse: 1.2,
            phase: k * 0.2,
            speed: 0.5,
          });
        }
      }
      if (sig.id === "access") {
        const base = fil.start + 5;
        const trunk = smoothstep(0.0, 0.45, t);
        const root: [number, number, number] = [x, y, z];
        for (let k = 0; k < 4; k++) {
          const idx = base + k;
          if (!present) {
            filaments.hide(idx);
            continue;
          }
          if (k === 0) {
            filaments.arc(
              idx,
              d.from[0],
              d.from[1],
              d.from[2],
              d.dock[0],
              d.dock[1],
              d.dock[2],
              d.bow[0],
              d.bow[1],
              d.bow[2],
            );
            filaments.params(idx, {
              s0: smoothstep(0.6, 1, t),
              s1: trunk,
              width: 0.06,
              intensity: 1.1,
              pulse: 1,
              phase: 0.1,
              speed: 0.4,
            });
          } else {
            // Limited access: the branches reach out, then retract to stubs.
            const a = (k / 3) * Math.PI * 2;
            const reach = smoothstep(0.2, 0.45, t) * (1 - 0.65 * smoothstep(0.45, 0.7, t));
            filaments.arc(
              idx,
              root[0],
              root[1],
              root[2],
              root[0] + Math.cos(a) * 3,
              root[1] + Math.sin(a) * 3,
              root[2] + 1.5,
              0,
              0.6,
              0,
            );
            filaments.params(idx, {
              s1: reach * (1 - smoothstep(0.75, 1, t)),
              width: 0.035,
              intensity: 0.9,
              pulse: 0.6,
              phase: k * 0.3,
              speed: 0.4,
            });
          }
        }
      }
      // LOCATION: the gimbal rings rotate into one coordinate as the signal arrives.
      if (sig.id === "location") {
        gimbal.current.forEach((ring, k) => {
          if (!ring) return;
          const settle = smoothstep(0.1, 0.7, t);
          ring.rotation.set(
            (1 - settle) * (1.2 + k),
            (1 - settle) * (0.8 * k + 0.5),
            k * (Math.PI / 3) * settle,
          );
        });
      }
      // TIME: the needle sweeps to 12 of 40 hours.
      if (sig.id === "time" && needle.current) {
        needle.current.rotation.z = -smoothstep(0.15, 0.7, t) * (12 / 40) * Math.PI * 2;
      }
    });
    for (let k = 9; k < 12; k++) filaments.hide(fil.start + k);
  });

  const ref = (i: number) => (el: Group | null) => {
    groups.current[i] = el;
  };
  return (
    <>
      {/* CAPITAL — a segmented precision-metal bar; three of eight segments carry light. */}
      <group ref={ref(0)} visible={false}>
        {Array.from({ length: 8 }, (_, k) => (
          <mesh
            key={k}
            geometry={geo.segment}
            material={k < 3 ? materials.violet : materials.champagne}
            position={[(k - 3.5) * 0.34, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
          />
        ))}
      </group>
      <group ref={ref(1)} visible={false} />
      {/* LOCATION — a geometric coordinate gimbal. */}
      <group ref={ref(2)} visible={false}>
        {[0, 1, 2].map((k) => (
          <mesh
            key={k}
            ref={(el) => {
              gimbal.current[k] = el;
            }}
            geometry={geo.ring}
            material={materials.champagne}
            scale={1 - k * 0.18}
          />
        ))}
        <mesh geometry={geo.rod} material={materials.champagne} />
        <mesh geometry={geo.rod} material={materials.champagne} rotation={[0, 0, Math.PI / 2]} />
      </group>
      {/* TIME — a calibrated dial. */}
      <group ref={ref(3)} visible={false}>
        <mesh geometry={geo.dial} material={materials.champagne} />
        {Array.from({ length: 12 }, (_, k) => {
          const a = (k / 12) * Math.PI * 2;
          return (
            <mesh
              key={k}
              geometry={geo.tick}
              material={materials.pearl}
              position={[Math.sin(a) * 0.8, Math.cos(a) * 0.8, 0]}
              rotation={[0, 0, -a]}
            />
          );
        })}
        <mesh
          ref={needle}
          geometry={geo.hand}
          material={materials.violet}
          position={[0, 0, 0.05]}
        />
      </group>
      {/* EXPERIENCE — a layered form; only the first layer is solid yet. */}
      <group ref={ref(4)} visible={false}>
        {[0, 1, 2, 3].map((k) => (
          <mesh
            key={k}
            geometry={geo.plate}
            material={k === 0 ? materials.pearl : materials.glass}
            position={[0, k * 0.22 - 0.33, 0]}
            renderOrder={k ? 2 : 0}
          />
        ))}
      </group>
      <group ref={ref(5)} visible={false} />
    </>
  );
}
