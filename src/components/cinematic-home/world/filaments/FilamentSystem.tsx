import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type { FogExp2, Mesh, PerspectiveCamera } from "three";

import { useWorld } from "../WorldContext";
import { createFilamentGeometry } from "./filament-pool";
import { createFilamentMaterial } from "./filament-material";

/** Draws every filament in the pool — one draw call — after all writers have run. */
export function FilamentSystem() {
  const { filaments, preset, store } = useWorld();
  const mesh = useRef<Mesh>(null);
  const getState = useThree((s) => s.get);
  const geometry = useMemo(
    () => createFilamentGeometry(filaments.capacity, preset.filamentSegments),
    [filaments, preset.filamentSegments],
  );
  const material = useMemo(() => createFilamentMaterial(filaments.texture), [filaments]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    // Runs inside render(), i.e. after every useFrame writer this frame.
    m.onBeforeRender = (_renderer, scene, camera) => {
      if (filaments.dirty) {
        filaments.texture.needsUpdate = true;
        filaments.dirty = false;
        // Count live filaments (intensity > 0 and a visible span) for the HUD / perf report.
        let live = 0;
        const d = filaments.data;
        for (let i = 0; i < filaments.capacity; i++) {
          const o = i * 20;
          if (d[o + 15] > 0 && d[o + 7] > d[o + 3]) live++;
        }
        store.state.renderer.filaments = live;
      }
      // Adaptive quality: a lower notch draws a share of the pool (the first slots).
      const share = store.state.perf.filamentShare;
      const count =
        share >= 1
          ? Infinity
          : Math.floor(filaments.capacity * share) * preset.filamentSegments * 6;
      if (geometry.drawRange.count !== count) geometry.setDrawRange(0, count);
      const cam = camera as PerspectiveCamera;
      // The canvas height from R3F's own measurement (ResizeObserver), never a layout read:
      // reading clientHeight here, after the overlay has written styles this frame, forced a
      // synchronous style + layout pass every frame.
      const height = getState().size.height || 1;
      material.uniforms.uPxScale.value = (2 * Math.tan((cam.fov * Math.PI) / 360)) / height;
      material.uniforms.uTime.value = store.state.time;
      material.uniforms.uFogDensity.value = (scene.fog as FogExp2 | null)?.density ?? 0;
    };
  }, [filaments, material, store, geometry, preset.filamentSegments, getState]);

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={10}
    />
  );
}
