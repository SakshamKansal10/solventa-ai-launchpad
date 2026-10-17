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
      // Nothing renders until ReadySignal has compiled every shader in parallel (RenderGate then
      // starts the loop) — a first frame would otherwise compile them all synchronously and
      // freeze the page for seconds on modest GPUs.
      frameloop="never"
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
        // Leaving the page never waits on the GPU. R3F releases the context as the stage
        // unmounts — inside the navigation itself — and losing a context blocks until the GPU
        // has finished what it is still doing: while the world was still compiling its shaders,
        // that held a click on a link for most of a second. The canvas has already left the
        // page; its context is released once the next page is up and the GPU has caught up.
        const lose = gl.forceContextLoss.bind(gl);
        gl.forceContextLoss = () => {
          const w = window as Window & {
            requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
          };
          window.setTimeout(() => {
            if (w.requestIdleCallback) w.requestIdleCallback(lose, { timeout: 3000 });
            else lose();
          }, 1500);
        };
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
