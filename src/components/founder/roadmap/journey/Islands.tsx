import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  mountainGeometry,
  rng,
  skirtGeometry,
  terrainGeometry,
  treePoints,
  undersideGeometry,
} from "./geo";
import type { JourneyLayout, PhaseVisual } from "./layout";

const C = {
  violet: "#7655f5",
  violetGlow: "#9b82ff",
  gold: "#d9b779",
  wall: "#fbf8f3",
};

const RIM: Record<PhaseVisual["state"], { color: string; base: number }> = {
  completed: { color: "#f3dcab", base: 0.5 },
  current: { color: "#cdbcff", base: 0.65 },
  future: { color: "#dbe7ff", base: 0.32 },
};

function useMaterials() {
  return useMemo(
    () => ({
      grass: new THREE.MeshStandardMaterial({ color: "#8fae82", roughness: 0.95 }),
      dirt: new THREE.MeshStandardMaterial({ color: "#a08f86", roughness: 1 }),
      rock: new THREE.MeshStandardMaterial({
        color: "#8f84a6",
        roughness: 0.95,
        flatShading: true,
      }),
      mountain: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.95,
        flatShading: true,
      }),
      wall: new THREE.MeshStandardMaterial({ color: C.wall, roughness: 0.5 }),
      roof: new THREE.MeshStandardMaterial({ color: "#d9a58f", roughness: 0.7, flatShading: true }),
      path: new THREE.MeshStandardMaterial({ color: "#e6d9c8", roughness: 1 }),
      gold: new THREE.MeshStandardMaterial({ color: C.gold, roughness: 0.28, metalness: 0.75 }),
      tree: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, flatShading: true }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#a994ff",
        emissive: C.violetGlow,
        emissiveIntensity: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.6,
        clearcoat: 1,
      }),
      crystal: new THREE.MeshPhysicalMaterial({
        color: C.violet,
        emissive: C.violetGlow,
        emissiveIntensity: 0.3,
        roughness: 0.1,
        clearcoat: 1,
        transparent: true,
        opacity: 0.93,
        flatShading: true,
      }),
    }),
    [],
  );
}
type Mats = ReturnType<typeof useMaterials>;

const TREE_COLORS = ["#3f6b46", "#4f7d52", "#35603f", "#5b8657"].map((c) => new THREE.Color(c));

/** One InstancedMesh of small conifers. */
function Forest({
  points,
  mats,
  seed,
}: {
  points: { x: number; z: number; s: number }[];
  mats: Mats;
  seed: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.ConeGeometry(0.09, 0.3, 6), []);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = rng(seed);
    const dummy = new THREE.Object3D();
    points.forEach((p, i) => {
      dummy.position.set(p.x, 0.12 + 0.15 * p.s, p.z);
      dummy.scale.set(p.s, p.s, p.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, TREE_COLORS[Math.floor(r() * TREE_COLORS.length)]);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [points, seed]);
  return <instancedMesh key={points.length} ref={ref} args={[geo, mats.tree, points.length]} />;
}

/** The distinctive structure for each phase. */
function Structure({ variant, mats, seed }: { variant: number; mats: Mats; seed: number }) {
  const spin = useRef<THREE.Group>(null);
  const peak = useMemo(
    () => (variant === 5 ? mountainGeometry(seed, 0.78, 1.55) : null),
    [variant, seed],
  );
  useEffect(() => () => peak?.dispose(), [peak]);
  useFrame(({ clock }) => {
    if (spin.current) spin.current.rotation.y = clock.elapsedTime * 0.5;
  });
  const y0 = 0.13;

  switch (variant) {
    case 0: // Clinic — a crystal formation
      return (
        <group position={[0, y0, 0]}>
          <mesh material={mats.crystal} position={[0, 0.5, 0]} scale={[0.34, 0.75, 0.34]}>
            <octahedronGeometry args={[1, 0]} />
          </mesh>
          <mesh
            material={mats.crystal}
            position={[0.42, 0.24, 0.15]}
            rotation={[0, 0, -0.35]}
            scale={[0.16, 0.4, 0.16]}
          >
            <octahedronGeometry args={[1, 0]} />
          </mesh>
          <mesh
            material={mats.crystal}
            position={[-0.38, 0.2, 0.2]}
            rotation={[0, 0, 0.4]}
            scale={[0.13, 0.32, 0.13]}
          >
            <octahedronGeometry args={[1, 0]} />
          </mesh>
          <mesh
            material={mats.crystal}
            position={[0.1, 0.14, -0.4]}
            rotation={[0.3, 0, 0.2]}
            scale={[0.1, 0.24, 0.1]}
          >
            <octahedronGeometry args={[1, 0]} />
          </mesh>
        </group>
      );
    case 1: // Manual — a small observatory
      return (
        <group position={[0.05, y0, 0]}>
          <mesh material={mats.wall} position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.3, 0.34, 0.6, 24]} />
          </mesh>
          <mesh material={mats.gold} position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.32, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh
            material={mats.glass}
            position={[0.1, 0.78, 0.2]}
            rotation={[0.9, 0, 0]}
            scale={[0.07, 0.3, 0.07]}
          >
            <cylinderGeometry args={[1, 1, 1, 10]} />
          </mesh>
          <mesh material={mats.wall} position={[0.5, 0.12, 0.1]}>
            <boxGeometry args={[0.26, 0.24, 0.24]} />
          </mesh>
          <mesh material={mats.path} position={[0.25, 0.005, 0.45]} rotation={[0, 0.5, 0]}>
            <boxGeometry args={[0.6, 0.015, 0.1]} />
          </mesh>
        </group>
      );
    case 2: // Web — geometric structures
      return (
        <group position={[0, y0, 0]}>
          {(
            [
              [-0.3, 0.12, 0.05, 0.46, 0.24],
              [0.12, 0.2, -0.12, 0.4, 0.4],
              [0.42, 0.1, 0.22, 0.3, 0.2],
            ] as const
          ).map(([x, y, z, w, h], i) => (
            <mesh key={i} material={mats.wall} position={[x, y, z]}>
              <boxGeometry args={[w, h, w]} />
            </mesh>
          ))}
          <group ref={spin} position={[0.1, 0.78, -0.1]}>
            <mesh material={mats.glass} rotation={[0.6, 0.6, 0]}>
              <boxGeometry args={[0.26, 0.26, 0.26]} />
            </mesh>
          </group>
          <mesh material={mats.gold} position={[0.12, 0.42, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.24, 0.012, 8, 32]} />
          </mesh>
        </group>
      );
    case 3: // Pilot — an experimental tower
      return (
        <group position={[0, y0, 0]}>
          <mesh material={mats.wall} position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.44, 0.48, 0.06, 28]} />
          </mesh>
          <mesh material={mats.wall} position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.05, 0.09, 0.95, 10]} />
          </mesh>
          <group ref={spin} position={[0, 0.62, 0]}>
            <mesh material={mats.gold} rotation={[Math.PI / 2.4, 0, 0]}>
              <torusGeometry args={[0.28, 0.018, 8, 40]} />
            </mesh>
            <mesh material={mats.crystal} position={[0.28, 0, 0]} scale={0.06}>
              <octahedronGeometry args={[1, 0]} />
            </mesh>
          </group>
          <mesh material={mats.crystal} position={[0, 1.04, 0]} scale={[0.1, 0.16, 0.1]}>
            <octahedronGeometry args={[1, 0]} />
          </mesh>
          <mesh material={mats.glass} position={[0.4, 0.18, 0.25]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
          </mesh>
        </group>
      );
    case 4: // Local — a connected village
      return (
        <group position={[0, y0, 0]}>
          {(
            [
              [-0.45, -0.1, 0.24],
              [-0.05, 0.28, 0.28],
              [0.4, 0.1, 0.22],
              [0.12, -0.38, 0.2],
            ] as const
          ).map(([x, z, s], i) => (
            <group key={i} position={[x, 0, z]} rotation={[0, i * 0.7, 0]}>
              <mesh material={mats.wall} position={[0, s / 2, 0]}>
                <boxGeometry args={[s, s, s]} />
              </mesh>
              <mesh material={mats.roof} position={[0, s + 0.07, 0]} rotation={[0, Math.PI / 4, 0]}>
                <coneGeometry args={[s * 0.85, 0.18, 4]} />
              </mesh>
            </group>
          ))}
          {(
            [
              [-0.25, 0.1, 0.6, 0.4],
              [0.15, -0.05, 0.5, -0.3],
              [0.3, -0.25, 0.4, 0.7],
            ] as const
          ).map(([x, z, l, r], i) => (
            <mesh key={i} material={mats.path} position={[x, 0.005, z]} rotation={[0, r, 0]}>
              <boxGeometry args={[l, 0.015, 0.08]} />
            </mesh>
          ))}
        </group>
      );
    default: // Operations — a mountain with a pavilion
      return (
        <group position={[0, y0, 0]}>
          {peak && <mesh geometry={peak} material={mats.mountain} position={[-0.2, 0, -0.15]} />}
          <group position={[0.5, 0, 0.35]}>
            {[-0.12, 0.12].map((x) => (
              <mesh key={x} material={mats.wall} position={[x, 0.17, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.34, 8]} />
              </mesh>
            ))}
            <mesh material={mats.gold} position={[0, 0.38, 0]}>
              <coneGeometry args={[0.24, 0.16, 4]} />
            </mesh>
          </group>
          {peak && (
            <group
              position={[
                -0.2 + peak.userData.top.x,
                peak.userData.top.y,
                -0.15 + peak.userData.top.z,
              ]}
            >
              <mesh material={mats.gold} position={[0, 0.15, 0]}>
                <cylinderGeometry args={[0.006, 0.006, 0.3, 6]} />
              </mesh>
              <mesh material={mats.gold} position={[0.09, 0.24, 0]}>
                <boxGeometry args={[0.18, 0.1, 0.005]} />
              </mesh>
            </group>
          )}
        </group>
      );
  }
}

/** Avoid-zones (x, z, radius) so trees never grow through structures. */
const AVOID: Record<number, readonly (readonly [number, number, number])[]> = {
  0: [[0, 0, 0.6]],
  1: [
    [0.05, 0, 0.62],
    [0.3, 0.45, 0.3],
  ],
  2: [[0.05, 0, 0.8]],
  3: [[0, 0, 0.58]],
  4: [[0, 0, 0.82]],
  5: [
    [-0.2, -0.15, 0.85],
    [0.5, 0.35, 0.3],
  ],
};
const TREES = [10, 12, 8, 8, 16, 14];

function Island({
  index,
  variant,
  target,
  state,
  selected,
  hovered,
  mats,
  low,
  reduceMotion,
  onHover,
  onSelect,
}: {
  index: number;
  variant: number;
  target: THREE.Vector3;
  state: PhaseVisual["state"];
  selected: boolean;
  hovered: boolean;
  mats: Mats;
  low: boolean;
  reduceMotion: boolean;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.PointLight>(null);
  const rimGlow = useRef<THREE.Mesh>(null);
  const lift = useRef(0);
  const scale = useRef(1);
  const ringOpacity = useRef(0);
  const rimOpacity = useRef(RIM[state].base);

  const seg = low ? 14 : 28;
  const geos = useMemo(
    () => ({
      top: terrainGeometry(index * 7 + 3, seg),
      skirt: skirtGeometry(seg),
      under: undersideGeometry(index * 5 + 1, low ? 12 : 20),
    }),
    [index, seg, low],
  );
  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose());
    },
    [geos],
  );
  const trees = useMemo(
    () =>
      treePoints(
        index * 13 + 5,
        Math.round(TREES[variant] * (low ? 0.5 : 1)),
        AVOID[variant] ?? [],
      ),
    [index, variant, low],
  );

  const rimMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: RIM[state].color, toneMapped: false }),
    [state],
  );
  const rimGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: RIM[state].color,
        transparent: true,
        opacity: RIM[state].base,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [state],
  );
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: C.violetGlow,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      rimMat.dispose();
      rimGlowMat.dispose();
      ringMat.dispose();
    },
    [rimMat, rimGlowMat, ringMat],
  );

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const speed = reduceMotion ? 40 : 4;
    g.position.x = THREE.MathUtils.damp(g.position.x, target.x, 3, dt);
    g.position.z = THREE.MathUtils.damp(g.position.z, target.z, 3, dt);
    const baseY = THREE.MathUtils.damp(g.userData.baseY ?? target.y, target.y, 3, dt);
    g.userData.baseY = baseY;

    lift.current = THREE.MathUtils.damp(
      lift.current,
      (selected ? 0.32 : 0) + (hovered ? 0.18 : 0),
      speed,
      dt,
    );
    scale.current = THREE.MathUtils.damp(
      scale.current,
      (selected ? 1.1 : state === "future" ? 0.95 : 1) * (hovered ? 1.04 : 1),
      speed,
      dt,
    );
    const bob = reduceMotion
      ? 0
      : Math.sin(clock.elapsedTime * 0.7 + index * 1.3) * (selected ? 0.07 : 0.04);
    g.position.y = baseY + lift.current + bob;
    g.scale.setScalar(scale.current);
    if (body.current && !reduceMotion)
      body.current.rotation.y = Math.sin(clock.elapsedTime * 0.2 + index) * 0.1;

    ringOpacity.current = THREE.MathUtils.damp(
      ringOpacity.current,
      selected ? 0.7 : hovered ? 0.3 : 0,
      speed,
      dt,
    );
    if (ring.current)
      (ring.current.material as THREE.MeshBasicMaterial).opacity = ringOpacity.current;
    rimOpacity.current = THREE.MathUtils.damp(
      rimOpacity.current,
      RIM[state].base + (selected ? 0.4 : 0) + (hovered ? 0.2 : 0),
      speed,
      dt,
    );
    if (rimGlow.current)
      (rimGlow.current.material as THREE.MeshBasicMaterial).opacity = rimOpacity.current;
    if (glow.current) {
      glow.current.intensity = THREE.MathUtils.damp(
        glow.current.intensity,
        selected ? 4 : hovered ? 2.4 : 0,
        speed,
        dt,
      );
    }
  });

  const radial = low ? 36 : 72;
  return (
    <group
      ref={group}
      position={[target.x, target.y, target.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(index);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(index);
      }}
    >
      <group ref={body}>
        <mesh geometry={geos.top} material={mats.grass} />
        <mesh geometry={geos.skirt} material={mats.dirt} />
        <mesh geometry={geos.under} material={mats.rock} />
        <Forest points={trees} mats={mats} seed={index + 40} />
        <Structure variant={variant} mats={mats} seed={index * 3 + 2} />

        {/* the luminous rim, as in the reference */}
        <mesh material={rimMat} position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.12, 0.02, 8, radial]} />
        </mesh>
        <mesh
          ref={rimGlow}
          material={rimGlowMat}
          position={[0, 0.03, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[1.12, 0.07, 8, radial]} />
        </mesh>

        {state === "completed" && (
          <group position={[0.72, 0.1, -0.5]}>
            <mesh material={mats.gold} position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.4, 6]} />
            </mesh>
            <mesh material={mats.gold} position={[0.07, 0.34, 0]}>
              <boxGeometry args={[0.14, 0.09, 0.004]} />
            </mesh>
          </group>
        )}

        <mesh ref={ring} material={ringMat} position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.22, 1.27, 72]} />
        </mesh>
        <pointLight
          ref={glow}
          color={C.violetGlow}
          position={[0, 1.2, 0.6]}
          intensity={0}
          distance={5.5}
        />
      </group>
    </group>
  );
}

/** The phase islands plus the trail that links them. */
export function Islands({
  phases,
  layout,
  selectedIndex,
  hoveredIndex,
  low,
  reduceMotion,
  onHover,
  onSelect,
}: {
  phases: PhaseVisual[];
  layout: JourneyLayout;
  selectedIndex: number;
  hoveredIndex: number | null;
  low: boolean;
  reduceMotion: boolean;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
}) {
  const mats = useMaterials();
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats],
  );

  const currentIndex = phases.findIndex((p) => p.state === "current");
  const reached =
    currentIndex >= 0 ? currentIndex : phases.filter((p) => p.state === "completed").length - 1;

  return (
    <group>
      <Trail layout={layout} reached={reached} low={low} reduceMotion={reduceMotion} />
      {phases.map((p, i) => (
        <Island
          key={i}
          index={i}
          // The final island is always the completion island.
          variant={i === phases.length - 1 ? 5 : i % 5}
          target={layout.positions[i]}
          state={p.state}
          selected={i === selectedIndex}
          hovered={i === hoveredIndex}
          mats={mats}
          low={low}
          reduceMotion={reduceMotion}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

/** A luminous trail through the clouds: pale for the road ahead, violet up to
 * where the founder is now, with one slow light travelling along it. */
function Trail({
  layout,
  reached,
  low,
  reduceMotion,
}: {
  layout: JourneyLayout;
  reached: number;
  low: boolean;
  reduceMotion: boolean;
}) {
  const dot = useRef<THREE.Mesh>(null);
  const points = layout.positions;

  const { full, done } = useMemo(() => {
    const pts = points.map((p) => new THREE.Vector3(p.x, p.y + 0.18, p.z));
    const mk = (list: THREE.Vector3[]) => {
      if (list.length < 2) return null;
      const curve = new THREE.CatmullRomCurve3(list, false, "catmullrom", 0.5);
      return { curve, geo: new THREE.TubeGeometry(curve, low ? 60 : 140, 0.025, 6, false) };
    };
    return { full: mk(pts), done: mk(pts.slice(0, Math.max(0, reached) + 1)) };
  }, [points, reached, low]);

  useEffect(
    () => () => {
      full?.geo.dispose();
      done?.geo.dispose();
    },
    [full, done],
  );

  useFrame(({ clock }) => {
    if (!full || !dot.current) return;
    const t = reduceMotion ? 0 : (clock.elapsedTime * 0.05) % 1;
    full.curve.getPoint(t, dot.current.position);
    dot.current.visible = !reduceMotion;
  });

  if (!full) return null;
  return (
    <group>
      <mesh geometry={full.geo}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} toneMapped={false} />
      </mesh>
      {done && (
        <mesh geometry={done.geo}>
          <meshBasicMaterial color="#8a6bff" transparent opacity={0.95} toneMapped={false} />
        </mesh>
      )}
      <mesh ref={dot}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color="#ffe3a8" toneMapped={false} />
      </mesh>
    </group>
  );
}
