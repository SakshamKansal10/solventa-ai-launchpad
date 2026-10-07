import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CylinderGeometry, Group, Matrix4, Quaternion, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import { smoothstep } from "../../math";
import { local } from "../../timeline/timeline";
import { useWorld } from "../WorldContext";
import { ASSUMPTION_GATE, GATE, originalFrame } from "./path-model";

/**
 * Evidence: an optical information object — a framed glass tablet — that
 * arrives from beside the path and settles into the assumption gate. Its
 * (illustrative) customer quote is real DOM, anchored to it.
 */
export function Evidence() {
  const { store, materials, filaments } = useWorld();
  const group = useRef<Group>(null);
  const geo = useMemo(
    () => ({
      pane: new RoundedBoxGeometry(2.6, 1.6, 0.06, 2, 0.05),
      edge: new CylinderGeometry(0.03, 0.03, 1, 6),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  const fil = useMemo(() => filaments.range("evidence", 2), [filaments]);
  const frame = useMemo(() => {
    const f = originalFrame(ASSUMPTION_GATE, {
      position: new Vector3(),
      quaternion: new Quaternion(),
      scale: 1,
    });
    const right = new Vector3(1, 0, 0).applyQuaternion(f.quaternion);
    const forward = new Vector3(0, 0, -1).applyQuaternion(f.quaternion);
    const target = f.position.clone().add(new Vector3(0, GATE.centreY + GATE.hh * 0.22, 0));
    const start = target
      .clone()
      .addScaledVector(right, 13)
      .add(new Vector3(0, 5, 0))
      .addScaledVector(forward, -4);
    return { quaternion: f.quaternion, target, start, right };
  }, []);
  const tmp = useMemo(() => ({ v: new Vector3(), m: new Matrix4() }), []);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = store.state;
    const p = s.progress;
    const e = local(p, "evidence");
    const crisis = local(p, "crisis");
    const travel = smoothstep(0.08, 0.72, e);
    const present = e > 0.04 && crisis < 0.6;
    g.visible = present;
    if (!present) {
      filaments.hideRange(fil);
      s.anchors.set("evidence", { x: 0, y: 0, z: 0, o: 0 });
      return;
    }
    const t = travel * travel * (3 - 2 * travel);
    g.position.lerpVectors(frame.start, frame.target, t);
    g.position.y += Math.sin(t * Math.PI) * 1.5;
    g.quaternion.copy(frame.quaternion);
    g.rotateY((1 - t) * 0.9);
    // Settling into the assumption, it becomes part of the structure (absorbed in the crisis).
    g.scale.setScalar((0.6 + 0.4 * smoothstep(0, 0.3, e)) * (1 - smoothstep(0.25, 0.6, crisis)));
    s.anchors.set("evidence", {
      x: g.position.x,
      y: g.position.y + 1.3,
      z: g.position.z,
      o: smoothstep(0.15, 0.35, e) * (1 - smoothstep(0.1, 0.35, crisis)),
    });
    // Its signal reaches into the gate it contradicts.
    const idx = fil.start;
    const reach = smoothstep(0.6, 0.95, e) * (1 - smoothstep(0.4, 0.7, crisis));
    if (reach > 0.01) {
      const a = g.position;
      const b = frame.target;
      // It strikes the assumption node on the gate's crown — the node then changes state.
      filaments.arc(idx, a.x, a.y, a.z, b.x, b.y + GATE.hh * 0.78 + 0.42, b.z, 0, 0.8, 0);
      filaments.params(idx, {
        s1: reach,
        width: 0.05,
        intensity: 1,
        violet: 0.6,
        pulse: 1.4,
        phase: 0.2,
        speed: 0.6,
      });
    } else filaments.hide(idx);
    filaments.hide(fil.start + 1);
  });

  return (
    <group ref={group} visible={false}>
      <mesh geometry={geo.pane} material={materials.glass} renderOrder={2} />
      {[
        [0, 0.8, 2.6, Math.PI / 2],
        [0, -0.8, 2.6, Math.PI / 2],
        [1.3, 0, 1.6, 0],
        [-1.3, 0, 1.6, 0],
      ].map(([x, y, len, rot], k) => (
        <mesh
          key={k}
          geometry={geo.edge}
          material={materials.champagne}
          position={[x, y, 0]}
          rotation={[0, 0, rot]}
          scale={[1, len, 1]}
        />
      ))}
    </group>
  );
}
