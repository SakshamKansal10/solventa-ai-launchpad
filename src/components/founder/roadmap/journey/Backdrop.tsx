import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  cloudTexture,
  peakGeometry,
  rng,
  skyTexture,
  terrainGeometry,
  undersideGeometry,
} from "./geo";

const CLOUDS = (() => {
  const r = rng(5);
  return Array.from({ length: 30 }, (_, i) => {
    const layer = i % 3; // 0 = low & far, 1 = mid, 2 = high wisps
    return {
      x: -20 + r() * 40,
      y: layer === 2 ? 5 + r() * 4 : -4.6 + layer * 1.1 + r() * 1.2,
      z: layer === 2 ? -26 - r() * 8 : -16 + r() * 18,
      w: 7 + r() * 9,
      op: layer === 2 ? 0.35 : 0.5 + r() * 0.35,
      speed: 0.04 + r() * 0.06,
    };
  });
})();

const DISTANT = [
  { x: -21, y: 3.2, z: -26, s: 1.5, peak: 2.2 },
  { x: -11, y: 5.2, z: -34, s: 1.2, peak: 1.8 },
  { x: 2, y: 4.2, z: -38, s: 1.7, peak: 2.6 },
  { x: 14, y: 5.8, z: -32, s: 1.2, peak: 1.6 },
  { x: 22, y: 2.6, z: -27, s: 1.6, peak: 2.4 },
] as const;

const ROCKS = [
  { p: [-6.8, 0.6, -1.5], s: 0.2 },
  { p: [-2.4, 2.6, -3.8], s: 0.14 },
  { p: [3.4, -0.3, -2.4], s: 0.18 },
  { p: [7.2, 2.4, -2.8], s: 0.16 },
  { p: [0.6, 3.4, -6], s: 0.12 },
] as const;

/** Sunset sky, layered clouds, far-off floating islands, drifting rocks and
 * gold motes. Decorative: never intercepts pointer events or carries meaning. */
export function Backdrop({
  low,
  reduceMotion,
  hovered,
}: {
  low: boolean;
  reduceMotion: boolean;
  hovered: boolean;
}) {
  const cloudRefs = useRef<(THREE.Sprite | null)[]>([]);
  const rockRefs = useRef<(THREE.Mesh | null)[]>([]);
  const motes = useRef<THREE.Points>(null);
  const moteMat = useRef<THREE.PointsMaterial>(null);

  const shared = useMemo(() => {
    const sky = skyTexture();
    const cloud = cloudTexture();
    const under = undersideGeometry(77, low ? 10 : 16);
    const top = terrainGeometry(77, low ? 10 : 16);
    const peaks = DISTANT.map((d, i) => peakGeometry(30 + i, 0.8, d.peak / 1.4, 6));
    const mat = {
      rock: new THREE.MeshStandardMaterial({ color: "#a79bbd", roughness: 1, flatShading: true }),
      grass: new THREE.MeshStandardMaterial({ color: "#a8b79a", roughness: 1 }),
      peak: new THREE.MeshStandardMaterial({ color: "#b9aecb", roughness: 1, flatShading: true }),
      dark: new THREE.MeshStandardMaterial({ color: "#7d7290", roughness: 1, flatShading: true }),
    };
    const moteGeo = (() => {
      const r = rng(21);
      const n = low ? 30 : 100;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (r() - 0.5) * 22;
        pos[i * 3 + 1] = -1.5 + r() * 8;
        pos[i * 3 + 2] = -8 + r() * 12;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      return g;
    })();
    return { sky, cloud, under, top, peaks, mat, moteGeo };
  }, [low]);

  useEffect(
    () => () => {
      shared.sky.dispose();
      shared.cloud.dispose();
      shared.under.dispose();
      shared.top.dispose();
      shared.peaks.forEach((g) => g.dispose());
      Object.values(shared.mat).forEach((m) => m.dispose());
      shared.moteGeo.dispose();
    },
    [shared],
  );

  const clouds = low ? CLOUDS.filter((_, i) => i % 2 === 0) : CLOUDS;

  useFrame(({ clock }, dt) => {
    if (reduceMotion) return;
    const t = clock.elapsedTime;
    cloudRefs.current.forEach((s, i) => {
      if (!s) return;
      const c = clouds[i];
      s.position.x += c.speed * dt;
      if (s.position.x > 26) s.position.x = -26;
    });
    rockRefs.current.forEach((m, i) => {
      if (!m) return;
      m.rotation.x = t * 0.1 + i;
      m.rotation.y = t * 0.14 + i * 2;
      m.position.y = ROCKS[i].p[1] + Math.sin(t * 0.3 + i * 2) * 0.2;
    });
    if (motes.current) motes.current.position.y = Math.sin(t * 0.2) * 0.12;
    if (moteMat.current) {
      moteMat.current.opacity = THREE.MathUtils.damp(
        moteMat.current.opacity,
        hovered ? 0.95 : 0.6,
        4,
        dt,
      );
    }
  });

  return (
    <group>
      {/* sky dome */}
      <mesh renderOrder={-10}>
        <sphereGeometry args={[90, 16, 16]} />
        <meshBasicMaterial map={shared.sky} side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>

      {/* far floating islands, softened by fog */}
      {DISTANT.map((d, i) => (
        <group key={i} position={[d.x, d.y, d.z]} scale={d.s * 1.6}>
          <mesh geometry={shared.under} material={shared.mat.rock} />
          <mesh geometry={shared.top} material={shared.mat.grass} />
          <mesh geometry={shared.peaks[i]} material={shared.mat.peak} position={[0.1, 0.5, 0]} />
        </group>
      ))}

      {ROCKS.map((r, i) => (
        <mesh
          key={i}
          ref={(el) => {
            rockRefs.current[i] = el;
          }}
          position={[r.p[0], r.p[1], r.p[2]]}
          scale={r.s}
          material={shared.mat.dark}
        >
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}

      {clouds.map((c, i) => (
        <sprite
          key={i}
          ref={(el) => {
            cloudRefs.current[i] = el;
          }}
          position={[c.x, c.y, c.z]}
          scale={[c.w, c.w * 0.45, 1]}
          renderOrder={-5}
        >
          <spriteMaterial
            map={shared.cloud}
            transparent
            opacity={c.op}
            depthWrite={false}
            color="#fbe6ee"
          />
        </sprite>
      ))}

      <points ref={motes} geometry={shared.moteGeo}>
        <pointsMaterial
          ref={moteMat}
          color="#f3d9a0"
          size={0.06}
          sizeAttenuation
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
