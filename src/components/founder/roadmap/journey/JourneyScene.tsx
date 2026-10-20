import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

import { buildLayout, type JourneyLayout, type JourneyViewMode, type PhaseVisual } from "./layout";
import { Islands } from "./Islands";
import { Backdrop } from "./Backdrop";

export interface JourneySceneProps {
  phases: PhaseVisual[];
  selectedIndex: number;
  hoveredIndex: number | null;
  mode: JourneyViewMode;
  low: boolean;
  reduceMotion: boolean;
  labelRefs: MutableRefObject<(HTMLElement | null)[]>;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  onContextLost: () => void;
}

const TIMELINE_CAM = new THREE.Vector3(0, 4.4, 13.6);
const MAP_CAM = new THREE.Vector3(0, 9.5, 10.5);

/** Moves the camera between the Timeline and Map poses, nudges it a little
 * toward the selected island, and pins each HTML label under its island. */
function CameraAndLabels({
  layout,
  selectedIndex,
  mode,
  labelRefs,
  reduceMotion,
}: {
  layout: JourneyLayout;
  selectedIndex: number;
  mode: JourneyViewMode;
  labelRefs: MutableRefObject<(HTMLElement | null)[]>;
  reduceMotion: boolean;
}) {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 0.1, 0));
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const speed = reduceMotion ? 40 : 3.2;
    const pose = mode === "map" ? MAP_CAM : TIMELINE_CAM;
    const sel = layout.positions[selectedIndex];
    const focusX = sel ? sel.x * 0.14 : 0;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pose.x + focusX, speed, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pose.y, speed, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pose.z, speed, dt);
    look.current.x = THREE.MathUtils.damp(look.current.x, focusX * 0.6, speed, dt);
    camera.lookAt(look.current);
    camera.updateMatrixWorld();

    layout.positions.forEach((p, i) => {
      const el = labelRefs.current[i];
      if (!el) return;
      tmp.set(p.x, p.y - 2.3, p.z + 0.3).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateX(-50%)`;
      el.style.opacity = "1";
    });
  });
  return null;
}

function Scene(props: JourneySceneProps) {
  const { size } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const layout = useMemo(
    () => buildLayout(props.phases.length, aspect, props.mode),
    [props.phases.length, aspect, props.mode],
  );

  // Hand the HTML labels their first position on the next frame.
  useEffect(() => {
    props.labelRefs.current.forEach((el) => {
      if (el) el.style.opacity = "0";
    });
  }, [props.labelRefs, props.phases.length]);

  return (
    <>
      <hemisphereLight args={["#ffe9e2", "#b7a4d6", 1.1]} />
      <directionalLight position={[6, 8, 9]} intensity={2.1} color="#ffd9b8" />
      <directionalLight position={[-8, 3, 4]} intensity={0.7} color="#8fa9ef" />
      <directionalLight position={[-3, 4, -9]} intensity={1.1} color="#ffc9a8" />
      <Backdrop
        low={props.low}
        reduceMotion={props.reduceMotion}
        hovered={props.hoveredIndex !== null}
      />
      <Islands
        phases={props.phases}
        layout={layout}
        selectedIndex={props.selectedIndex}
        hoveredIndex={props.hoveredIndex}
        low={props.low}
        reduceMotion={props.reduceMotion}
        onHover={props.onHover}
        onSelect={props.onSelect}
      />
      <CameraAndLabels
        layout={layout}
        selectedIndex={props.selectedIndex}
        mode={props.mode}
        labelRefs={props.labelRefs}
        reduceMotion={props.reduceMotion}
      />
    </>
  );
}

/** Default export so the page can React.lazy it — three.js never reaches the
 * server render or the first paint. */
export default function JourneyScene(props: JourneySceneProps) {
  return (
    <Canvas
      aria-hidden="true"
      data-testid="journey-canvas"
      className="!absolute inset-0"
      dpr={props.low ? [1, 1] : [1, 1.6]}
      gl={{ antialias: !props.low, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 30, near: 0.5, far: 140, position: TIMELINE_CAM.toArray() }}
      onCreated={({ gl, scene }) => {
        scene.fog = new THREE.Fog("#f0d6de", 24, 62);
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            props.onContextLost();
          },
          { once: true },
        );
      }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
