import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, DynamicDrawUsage, Object3D, Vector3, type InstancedMesh } from "three";

import { smoothstep } from "../math";
import type { ExperienceStore } from "../scroll/experience-store";
import { createNodeLayout } from "./node-layout";
import { PALETTE } from "./palette";

/** Base radius of a node (world units) before its own size multiplier. */
const NODE_RADIUS = 0.09;

/**
 * PLACEHOLDER data nodes — one InstancedMesh, so the whole field is a single
 * draw call however many nodes a tier allows. Per frame each node: drifts
 * (widely while the timeline says "chaos", barely once ordered), swells and
 * brightens as the camera passes, and — around the core — answers its energy.
 */
export function NodeField({
  store,
  count,
  animate,
}: {
  store: ExperienceStore;
  count: number;
  animate: boolean;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const nodes = useMemo(() => createNodeLayout(count), [count]);
  const tones = useMemo(
    () => [new Color(PALETTE.pearl), new Color(PALETTE.violet), new Color(PALETTE.champagne)],
    [],
  );
  const scratch = useMemo(
    () => ({ helper: new Object3D(), color: new Color(), position: new Vector3() }),
    [],
  );

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    m.count = nodes.length;
    m.instanceMatrix.setUsage(DynamicDrawUsage);
    // Creates the instanceColor buffer before the first frame writes to it.
    for (let i = 0; i < nodes.length; i++) m.setColorAt(i, tones[nodes[i].tone]);
    m.instanceColor?.setUsage(DynamicDrawUsage);
  }, [nodes, tones]);

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const s = store.state;
    const { helper, color, position } = scratch;
    const t = animate ? s.time : 0;
    const chaos = 1 - s.nodeOrder;
    const drift = 0.05 + chaos * 0.85;
    const spread = 1 + chaos * 0.3; // the core's cluster gathers in as order emerges
    const swell = Math.min(Math.abs(s.velocity) * 0.9, 0.3);
    const camera = state.camera.position;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const wave = Math.sin(t * n.speed + n.phase);
      const k = n.orbit ? spread : 1;
      position.set(
        n.x * k + wave * drift * n.dx,
        n.y * k + wave * drift * n.dy,
        n.z * k + wave * drift * n.dz,
      );
      const near = 1 - smoothstep(1.2, 4.5, position.distanceTo(camera));
      const charge = s.coreEnergy * n.orbit;

      helper.position.copy(position);
      helper.rotation.set(n.phase + t * n.spin, n.phase * 0.5 + t * n.spin * 0.7, 0);
      helper.scale.setScalar(NODE_RADIUS * n.size * (1 + near * 0.8 + charge * 0.4 + swell));
      helper.updateMatrix();
      m.setMatrixAt(i, helper.matrix);

      color.copy(tones[n.tone]).multiplyScalar(0.7 + near * 1.1 + charge * 0.6);
      m.setColorAt(i, color);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    // Instances move every frame, so the mesh's static bounds would cull them wrongly.
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive={PALETTE.pearl}
        // Far from the core's light the field would read as grey specks without a little self-light.
        emissiveIntensity={0.16}
        flatShading
        roughness={0.55}
        metalness={0.15}
      />
    </instancedMesh>
  );
}
