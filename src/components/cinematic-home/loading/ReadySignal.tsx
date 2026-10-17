import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Object3D, Texture } from "three";

import { useExperienceValue, type ExperienceStore } from "../scroll/experience-store";

/**
 * Lifts the void onto a fully prepared world. Before the FIRST frame renders (the canvas starts
 * with its loop stopped — see RenderGate) it compiles EVERY shader the film will need, using the
 * renderer's parallel async compile — and does it ONE OBJECT AT A TIME, with a painted frame in
 * between. Rendering straight away compiled every program synchronously (seconds on a modest GPU,
 * the whole page frozen); compiling them all at once in parallel still saturated the GPU process
 * so that nothing could be painted. One at a time, the page keeps answering and painting while
 * the world gets ready in the background — and no scene pays a first-appearance stall mid-scroll.
 * Each object compiles against the real scene (its lights, fog and environment), and EVERY object
 * is visited — a program also depends on the geometry it draws, so objects sharing a material can
 * need different programs — but only an object that actually created new programs waits for them
 * (cached ones cost nothing). Its textures are then uploaded the same way, one per frame, so the
 * first rendered frame does not have to. Two rendered frames after that, the world is ready.
 */
export function ReadySignal({ store }: { store: ExperienceStore }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const frames = useRef(0);
  // The world's materials compile differently with an environment, so they compile once it exists.
  const environment = useExperienceValue(store, (s) => s.environment);

  useEffect(() => {
    if (!environment) return;
    let cancelled = false;
    const objects: Object3D[] = [];
    const textures = new Set<Texture>();
    const collect = (value: unknown) => {
      if (value && typeof value === "object" && (value as Texture).isTexture)
        textures.add(value as Texture);
    };
    scene.traverse((o) => {
      const m = (o as { material?: unknown }).material;
      if (!m) return;
      objects.push(o);
      for (const material of Array.isArray(m) ? m : [m]) {
        for (const value of Object.values(material as Record<string, unknown>)) collect(value);
        const uniforms = (material as { uniforms?: Record<string, { value: unknown }> }).uniforms;
        if (uniforms) for (const u of Object.values(uniforms)) collect(u?.value);
      }
    });
    const programs = () => gl.info.programs?.length ?? 0;
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    void (async () => {
      for (const o of objects) {
        if (cancelled) return;
        // Hidden objects compile too (made visible for this one synchronous pass).
        const visible = o.visible;
        o.visible = true;
        const before = programs();
        const done = gl.compileAsync(o, camera, scene);
        o.visible = visible;
        if (programs() === before) continue;
        await done.catch(() => undefined);
        await nextFrame();
      }
      for (const texture of textures) {
        if (cancelled) return;
        gl.initTexture(texture);
        await nextFrame();
      }
      if (cancelled) return;
      store.state.compiled = true;
      store.emit();
    })();
    return () => {
      cancelled = true;
    };
  }, [environment, gl, scene, camera, store]);

  useFrame(() => {
    if (store.state.ready) return;
    frames.current += 1;
    if (frames.current >= 2) {
      store.state.ready = true;
      store.emit();
    }
  });
  return null;
}
