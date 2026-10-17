import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type GemVariant = "crystal" | "island" | "seal" | "trail" | "orb";

const VIOLET = "#7655f5";
const GLOW = "#9b82ff";
const GOLD = "#d9b779";

function crystalMat() {
  return new THREE.MeshPhysicalMaterial({
    color: VIOLET,
    emissive: GLOW,
    emissiveIntensity: 0.28,
    roughness: 0.1,
    clearcoat: 1,
    transparent: true,
    opacity: 0.93,
    flatShading: true,
  });
}
const goldMat = () =>
  new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.28, metalness: 0.75 });
const ivoryMat = () => new THREE.MeshStandardMaterial({ color: "#f6f1fa", roughness: 0.55 });
const rockMat = () =>
  new THREE.MeshStandardMaterial({ color: "#cfc5dd", roughness: 0.9, flatShading: true });

const NAVY = "#0c1233";
const BRIGHT_GOLD = "#f3c987";

/** A glass sphere inside gold rings and translucent bands, with small gold
 * spheres on tilted orbits. Everything is real geometry and moves. */
function OrbModel({ reduceMotion }: { reduceMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const orbitA = useRef<THREE.Group>(null);
  const orbitB = useRef<THREE.Group>(null);
  const orbitC = useRef<THREE.Group>(null);
  const m = useMemo(
    () => ({
      core: new THREE.MeshPhysicalMaterial({
        color: NAVY,
        emissive: "#2a2380",
        emissiveIntensity: 0.12,
        roughness: 0.04,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        transparent: true,
        opacity: 0.92,
      }),
      shell: new THREE.MeshPhysicalMaterial({
        color: "#b9a8ff",
        roughness: 0,
        clearcoat: 1,
        iridescence: 1,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
      gold: new THREE.MeshStandardMaterial({
        color: GOLD,
        roughness: 0.22,
        metalness: 0.9,
        emissive: "#6b4a14",
        emissiveIntensity: 0.35,
      }),
      band: new THREE.MeshStandardMaterial({
        color: GOLD,
        roughness: 0.25,
        metalness: 0.9,
        side: THREE.DoubleSide,
        emissive: "#6b4a14",
        emissiveIntensity: 0.3,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#5a4ad6",
        roughness: 0.05,
        clearcoat: 1,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      flare: new THREE.MeshBasicMaterial({
        color: BRIGHT_GOLD,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      darkBead: new THREE.MeshPhysicalMaterial({
        color: "#1c2150",
        roughness: 0.05,
        clearcoat: 1,
        metalness: 0.3,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(m).forEach((x) => x.dispose());
    },
    [m],
  );

  useFrame(({ clock }) => {
    if (reduceMotion) return;
    const t = clock.elapsedTime;
    if (root.current) root.current.position.y = Math.sin(t * 0.8) * 0.07;
    if (spin.current) {
      spin.current.rotation.y = t * 0.16;
      spin.current.rotation.z = Math.sin(t * 0.3) * 0.05;
    }
    if (orbitA.current) orbitA.current.rotation.y = t * 0.55;
    if (orbitB.current) orbitB.current.rotation.y = -t * 0.38;
    if (orbitC.current) orbitC.current.rotation.y = t * 0.8;
  });

  return (
    <group ref={root} scale={0.92} rotation={[0.18, 0, -0.12]}>
      <group ref={spin}>
        <mesh material={m.core}>
          <sphereGeometry args={[0.9, 64, 48]} />
        </mesh>
        <mesh material={m.shell}>
          <sphereGeometry args={[0.97, 64, 48]} />
        </mesh>
        {/* the warm flare on the sphere's upper-left */}
        <mesh material={m.flare} position={[-0.62, 0.5, 0.55]} scale={0.045}>
          <sphereGeometry args={[1, 16, 16]} />
        </mesh>
        <mesh material={m.flare} position={[-0.62, 0.5, 0.55]} scale={0.14}>
          <sphereGeometry args={[1, 16, 16]} />
        </mesh>

        {/* wide translucent bands */}
        <mesh material={m.glass} rotation={[Math.PI / 2 - 0.35, 0.12, 0.2]} scale={[1.15, 1, 1]}>
          <ringGeometry args={[1.25, 2.1, 96]} />
        </mesh>
        <mesh material={m.glass} rotation={[Math.PI / 2 + 0.5, -0.2, -0.45]} scale={[1.1, 1, 1]}>
          <ringGeometry args={[1.15, 1.8, 96]} />
        </mesh>

        {/* gold ribbon and thin rings */}
        <mesh material={m.band} rotation={[Math.PI / 2 - 0.55, 0.1, 0.5]}>
          <cylinderGeometry args={[1.32, 1.32, 0.14, 96, 1, true]} />
        </mesh>
        <mesh material={m.gold} rotation={[Math.PI / 2 - 0.35, 0.12, 0.2]} scale={[1.15, 1, 1]}>
          <torusGeometry args={[1.25, 0.012, 8, 128]} />
        </mesh>
        <mesh material={m.gold} rotation={[Math.PI / 2 + 0.5, -0.2, -0.45]} scale={[1.1, 1, 1]}>
          <torusGeometry args={[1.15, 0.01, 8, 128]} />
        </mesh>
        <mesh material={m.gold} rotation={[0.9, 0.3, 0.2]}>
          <torusGeometry args={[1.05, 0.009, 8, 128]} />
        </mesh>
      </group>

      {/* orbiting beads */}
      <group rotation={[0.5, 0, 0.35]}>
        <group ref={orbitA}>
          <mesh material={m.gold} position={[1.55, 0, 0]}>
            <sphereGeometry args={[0.11, 32, 32]} />
          </mesh>
        </group>
      </group>
      <group rotation={[-0.4, 0, -0.6]}>
        <group ref={orbitB}>
          <mesh material={m.gold} position={[1.7, 0, 0]}>
            <sphereGeometry args={[0.07, 24, 24]} />
          </mesh>
          <mesh material={m.darkBead} position={[-1.7, 0, 0]}>
            <sphereGeometry args={[0.08, 24, 24]} />
          </mesh>
        </group>
      </group>
      <group rotation={[1.1, 0.2, 0.1]}>
        <group ref={orbitC}>
          <mesh material={m.gold} position={[1.3, 0, 0]}>
            <sphereGeometry args={[0.045, 16, 16]} />
          </mesh>
        </group>
      </group>
      <pointLight position={[-1.4, 1.1, 1.6]} intensity={4} color={BRIGHT_GOLD} distance={6} />
    </group>
  );
}

function Model({ variant, reduceMotion }: { variant: GemVariant; reduceMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const mats = useMemo(
    () => ({ crystal: crystalMat(), gold: goldMat(), ivory: ivoryMat(), rock: rockMat() }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats],
  );

  useFrame(({ clock }) => {
    if (reduceMotion) return;
    const t = clock.elapsedTime;
    if (root.current) {
      root.current.position.y = Math.sin(t * 0.7) * 0.08;
      root.current.rotation.y = t * 0.22;
    }
    if (orbit.current) orbit.current.rotation.y = -t * 0.35;
  });

  return (
    <group ref={root} rotation={[0.12, 0.4, 0]}>
      {variant === "crystal" && (
        <>
          <mesh material={mats.crystal} scale={[0.62, 1.05, 0.62]}>
            <octahedronGeometry args={[1, 0]} />
          </mesh>
          <mesh material={mats.crystal} position={[0.85, -0.5, 0.2]} scale={[0.22, 0.4, 0.22]}>
            <octahedronGeometry args={[1, 0]} />
          </mesh>
          <mesh material={mats.gold} rotation={[Math.PI / 2.2, 0.3, 0]} scale={1.25}>
            <torusGeometry args={[1, 0.018, 8, 64]} />
          </mesh>
          <group ref={orbit}>
            <mesh material={mats.gold} position={[1.25, 0.1, 0]}>
              <sphereGeometry args={[0.045, 12, 12]} />
            </mesh>
          </group>
        </>
      )}
      {variant === "island" && (
        <group position={[0, -0.2, 0]}>
          <mesh material={mats.ivory}>
            <cylinderGeometry args={[1, 0.94, 0.16, 40]} />
          </mesh>
          <mesh material={mats.rock} position={[0, -0.7, 0]} rotation={[Math.PI, 0.4, 0]}>
            <coneGeometry args={[0.94, 1.3, 7]} />
          </mesh>
          <mesh material={mats.crystal} position={[0, 0.7, 0]} scale={[0.34, 0.7, 0.34]}>
            <octahedronGeometry args={[1, 0]} />
          </mesh>
          <mesh material={mats.crystal} position={[0.5, 0.3, 0.2]} scale={[0.14, 0.28, 0.14]}>
            <octahedronGeometry args={[1, 0]} />
          </mesh>
          <mesh material={mats.gold} position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.99, 0.02, 8, 48]} />
          </mesh>
        </group>
      )}
      {variant === "seal" && (
        <>
          <mesh material={mats.gold} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1, 0.07, 16, 64]} />
          </mesh>
          <mesh material={mats.ivory} rotation={[Math.PI / 2, 0, 0]} scale={[0.93, 0.93, 0.5]}>
            <cylinderGeometry args={[1, 1, 0.08, 48]} />
          </mesh>
          <mesh material={mats.crystal} scale={[0.34, 0.55, 0.34]}>
            <octahedronGeometry args={[1, 0]} />
          </mesh>
        </>
      )}
      {variant === "trail" && (
        <>
          {[-1, 0, 1].map((i) => (
            <group key={i} position={[i * 0.95, i * 0.28 - 0.1, i === 0 ? 0.3 : -0.1]}>
              <mesh material={mats.ivory}>
                <cylinderGeometry args={[0.36, 0.34, 0.08, 28]} />
              </mesh>
              <mesh material={mats.rock} position={[0, -0.28, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.33, 0.5, 6]} />
              </mesh>
              <mesh
                material={i === 1 ? mats.gold : mats.crystal}
                position={[0, 0.3, 0]}
                scale={[0.13, 0.25, 0.13]}
              >
                <octahedronGeometry args={[1, 0]} />
              </mesh>
            </group>
          ))}
        </>
      )}
    </group>
  );
}

/** One small, decorative scene. Default export so callers can React.lazy it. */
export default function GemCanvas({
  variant,
  reduceMotion,
  paused = false,
  onContextLost,
}: {
  variant: GemVariant;
  reduceMotion: boolean;
  /** Off screen: keep the scene mounted but stop rendering frames. */
  paused?: boolean;
  onContextLost: () => void;
}) {
  const lostTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(lostTimer.current), []);
  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 1.5]}
      frameloop={reduceMotion || paused ? "demand" : "always"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ fov: 32, position: [0, 0.6, 5.2] }}
      style={{ pointerEvents: "none" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        // A lost context usually comes back on its own (GPU memory pressure while
        // scrolling); only fall back to the static gem if it doesn't.
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          clearTimeout(lostTimer.current);
          lostTimer.current = setTimeout(onContextLost, 2500);
        });
        gl.domElement.addEventListener("webglcontextrestored", () => {
          clearTimeout(lostTimer.current);
        });
      }}
    >
      <hemisphereLight args={["#fff6ea", "#cfc2f0", 1.1]} />
      <directionalLight position={[-3, 5, 4]} intensity={1.8} color="#fff1dc" />
      <directionalLight position={[4, 1, -2]} intensity={0.6} color="#b9a4ff" />
      {variant === "orb" ? (
        <OrbModel reduceMotion={reduceMotion} />
      ) : (
        <Model variant={variant} reduceMotion={reduceMotion} />
      )}
    </Canvas>
  );
}
