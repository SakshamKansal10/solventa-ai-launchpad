import { Canvas } from "@react-three/fiber";

import { BASE_FOV } from "../camera/camera-path";
import type { QualityPreset } from "../performance/quality";
import type { ExperienceStore } from "../scroll/experience-store";
import { SceneRoot } from "./SceneRoot";

/**
 * The ONE persistent WebGL canvas of the cinematic section. Loaded lazily
 * (default export for React.lazy) so three.js never reaches the server render
 * or the first paint. Purely decorative: pointer events pass straight through
 * to the page, and assistive tech skips it — meaning lives in the DOM overlay.
 */
export default function CinematicCanvas({
  store,
  preset,
  animate,
  parallax,
  freeze,
  onContextLost,
}: {
  store: ExperienceStore;
  preset: QualityPreset;
  animate: boolean;
  parallax: boolean;
  freeze: boolean;
  onContextLost: () => void;
}) {
  return (
    <Canvas
      aria-hidden="true"
      data-testid="cinematic-canvas"
      style={{ pointerEvents: "none" }}
      dpr={preset.dpr}
      gl={{
        antialias: preset.antialias,
        alpha: false,
        stencil: false,
        powerPreference: "high-performance",
      }}
      camera={{ fov: BASE_FOV, near: 0.2, far: 1600, position: [0, 2.4, 74] }}
      // The stage is position: fixed, so page scroll never moves the canvas;
      // a short resize debounce avoids reallocating buffers mid-drag.
      resize={{ scroll: false, debounce: { scroll: 0, resize: 120 } }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          "webglcontextlost",
          (event) => {
            event.preventDefault();
            onContextLost();
          },
          { once: true },
        );
      }}
    >
      <SceneRoot
        store={store}
        preset={preset}
        animate={animate}
        parallax={parallax}
        freeze={freeze}
      />
    </Canvas>
  );
}
