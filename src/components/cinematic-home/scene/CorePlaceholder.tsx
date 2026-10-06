import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  EdgesGeometry,
  IcosahedronGeometry,
  type Group,
  type LineBasicMaterial,
  type Mesh,
  type MeshStandardMaterial,
  type PointLight,
} from "three";

import type { ExperienceStore } from "../scroll/experience-store";
import { MAX_FRAME_DT } from "../scroll/progress-math";
import { PALETTE } from "./palette";

/**
 * PLACEHOLDER for the Solventia Intelligence Core — primitive geometry only:
 * a faceted solid, a wire shell and two thin orbit rings. Its single input is
 * `coreEnergy` from the timeline (spin, light, shell and scale all follow it),
 * which is exactly the contract the real core will keep.
 */
export function CorePlaceholder({ store, animate }: { store: ExperienceStore; animate: boolean }) {
  const group = useRef<Group>(null);
  const inner = useRef<Mesh>(null);
  const ringA = useRef<Mesh>(null);
  const ringB = useRef<Mesh>(null);
  const innerMaterial = useRef<MeshStandardMaterial>(null);
  const shellMaterial = useRef<LineBasicMaterial>(null);
  const light = useRef<PointLight>(null);

  const shell = useMemo(() => {
    const source = new IcosahedronGeometry(1.35, 1);
    const edges = new EdgesGeometry(source);
    source.dispose();
    return edges;
  }, []);
  useEffect(() => () => shell.dispose(), [shell]);

  useFrame((_, delta) => {
    if (!group.current || !inner.current || !ringA.current || !ringB.current) return;
    const s = store.state;
    const energy = s.coreEnergy;
    const spin = animate ? (0.06 + energy * 0.32) * Math.min(delta, MAX_FRAME_DT) : 0;

    group.current.rotation.y += spin;
    inner.current.rotation.x += spin * 0.6;
    ringA.current.rotation.x = 1.15 - energy * 0.45;
    ringA.current.rotation.z += spin * 1.3;
    ringB.current.rotation.y -= spin * 0.9;

    const breathe = animate ? Math.sin(s.time * 1.3) * 0.012 * (0.4 + energy) : 0;
    group.current.scale.setScalar(1 + energy * 0.12 + breathe);

    if (innerMaterial.current) innerMaterial.current.emissiveIntensity = 0.06 + energy * 1.0;
    if (shellMaterial.current) shellMaterial.current.opacity = 0.14 + energy * 0.32;
    if (light.current) light.current.intensity = 4 + energy * 28;
  });

  return (
    <group ref={group}>
      <mesh ref={inner}>
        <icosahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial
          ref={innerMaterial}
          color={PALETTE.champagne}
          emissive={PALETTE.champagne}
          emissiveIntensity={0.06}
          flatShading
          metalness={0.35}
          roughness={0.4}
        />
      </mesh>
      <lineSegments geometry={shell}>
        <lineBasicMaterial
          ref={shellMaterial}
          color={PALETTE.pearl}
          transparent
          opacity={0.14}
          depthWrite={false}
        />
      </lineSegments>
      <mesh ref={ringA}>
        <torusGeometry args={[1.9, 0.012, 8, 160]} />
        <meshBasicMaterial color={PALETTE.violet} transparent opacity={0.65} />
      </mesh>
      <mesh ref={ringB} rotation={[0.45, 0, 0.9]}>
        <torusGeometry args={[2.25, 0.008, 8, 160]} />
        <meshBasicMaterial color={PALETTE.champagne} transparent opacity={0.45} />
      </mesh>
      <pointLight ref={light} color={PALETTE.champagne} intensity={4} decay={2} />
    </group>
  );
}
