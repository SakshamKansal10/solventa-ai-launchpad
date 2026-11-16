import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { CubeUVReflectionMapping, Texture, Vector4, type Object3D } from "three";

import { dedicateInstancedMaterials } from "../performance/dedicate-materials";
import { markStage } from "../performance/marks";
import { useExperienceValue, type ExperienceStore } from "../scroll/experience-store";

/**
 * Lifts the void onto a fully prepared world. Before the FIRST frame renders (the canvas starts
 * with its loop stopped — see RenderGate) it compiles EVERY shader the film will need, using the
 * renderer's parallel async compile — in SMALL BATCHES (COMPILE_BATCH new programs), with a
 * painted frame in between. Rendering straight away compiled every program synchronously (seconds on a modest GPU,
 * the whole page frozen); compiling them all at once in parallel still saturated the GPU process
 * so that nothing could be painted; one at a time cost a frame or two per program (5.8 s median for
 * the lite world, measured 2026-11-15). In small batches the page keeps answering and painting while
 * the world gets ready in the background — and no scene pays a first-appearance stall mid-scroll.
 * Each object compiles against the real scene (its lights, fog and environment), and EVERY object
 * is visited — a program also depends on the geometry it draws, so objects sharing a material can
 * need different programs — but only an object that actually created new programs waits for them
 * (cached ones cost nothing). Its textures are then uploaded the same way, one per frame, so the
 * first rendered frame does not have to. Then the geometry: each world group is drawn once, with
 * everything in it visible, into a 1×1 scissor of the canvas — a few groups per frame — so its vertex and instance
 * buffers are on the GPU before the scene that needs them (measured: geometry uploads otherwise
 * happened mid-scroll, 26 → 98 buffers as the story advanced). Two rendered frames after that,
 * the world is ready.
 */
/** New programs handed to the driver per painted frame while the world prepares (see below).
 * `?compileBatch=N` overrides it for measurement (scripts/film-ready.mjs). */
const COMPILE_BATCH = (() => {
  if (typeof window === "undefined") return 6;
  const n = Number(new URLSearchParams(window.location.search).get("compileBatch"));
  return Number.isInteger(n) && n > 0 && n <= 64 ? n : 6;
})();

/** The studio environment's prefiltered (CubeUV) size: PMREM at a 256 cube (environment.ts) is
 * 3 × 256 wide and 4 × 256 high. Only the height is part of a program's key. */
const ENV_WIDTH = 768;
const ENV_HEIGHT = 1024;

/** World groups drawn per frame in the geometry warm-up (one per frame took ~1.2 s for 19). */
const GEOMETRY_GROUPS_PER_FRAME = 3;

export function ReadySignal({ store }: { store: ExperienceStore }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const frames = useRef(0);
  // Programs the early (stand-in) pass started: the main pass waits for them before it draws.
  const pending = useRef<Promise<unknown>[]>([]);
  // The world's materials compile differently with an environment, so they compile once it exists.
  const environment = useExperienceValue(store, (s) => s.environment);

  // The environment off the critical path: a material's program depends on the environment only
  // through its kind and size (CubeUV, ENV_HEIGHT texels high), so while the studio environment is
  // still being built (Atmosphere, PMREM), the world's programs compile against a stand-in of the
  // same shape — alongside it, not after it (measured cold: shaders 3.4–4.2 s → 2.4–2.7 s after the
  // environment). The pass below then finds them compiled; if a future three keys programs
  // differently, that pass simply compiles them as before.
  useEffect(() => {
    if (environment) return;
    let cancelled = false;
    const standIn = new Texture();
    standIn.mapping = CubeUVReflectionMapping;
    standIn.image = { width: ENV_WIDTH, height: ENV_HEIGHT };
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    void (async () => {
      // One frame first, so the atmosphere has set the fog the programs also depend on.
      await nextFrame();
      // Lite has no studio environment (it is "ready" at once): nothing to compile ahead of it.
      if (cancelled || store.state.environment) return;
      const objects: Object3D[] = [];
      scene.traverse((o) => {
        if ((o as { material?: unknown }).material) objects.push(o);
      });
      let batch: Promise<unknown>[] = [];
      for (const o of objects) {
        // The real environment has arrived (or the stage is gone): the main pass takes over.
        if (cancelled || (scene.environment && scene.environment !== standIn)) break;
        scene.environment = standIn;
        const visible = o.visible;
        o.visible = true;
        const before = gl.info.programs?.length ?? 0;
        const done = gl.compileAsync(o, camera, scene);
        o.visible = visible;
        if (scene.environment === standIn) scene.environment = null;
        if ((gl.info.programs?.length ?? 0) === before) continue;
        const settled = done.catch(() => undefined);
        pending.current.push(settled);
        batch.push(settled);
        if (batch.length >= COMPILE_BATCH) {
          await Promise.all(batch);
          batch = [];
          await nextFrame();
        }
      }
      if (scene.environment === standIn) scene.environment = null;
    })();
    return () => {
      cancelled = true;
      if (scene.environment === standIn) scene.environment = null;
    };
  }, [environment, gl, scene, camera, store]);

  useEffect(() => {
    if (!environment) return;
    let cancelled = false;
    // Before compiling: instanced meshes get their own material copies (see dedicate-materials).
    const undoDedicate = dedicateInstancedMaterials(scene);
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
      // Programs are compiled in small batches: each batch's programs are handed to the driver
      // together (with KHR_parallel_shader_compile it links them on its own threads), then the
      // page paints once before the next batch. One object at a time cost a frame or two per
      // program (measured: 1.6–8.5 s for the lite world); everything at once starved painting.
      let batch: Promise<unknown>[] = [];
      const flush = async () => {
        if (batch.length === 0) return;
        await Promise.all(batch.map((p) => p.catch(() => undefined)));
        batch = [];
        await nextFrame();
      };
      for (const o of objects) {
        if (cancelled) return;
        // Hidden objects compile too (made visible for this one synchronous pass).
        const visible = o.visible;
        o.visible = true;
        const before = programs();
        const done = gl.compileAsync(o, camera, scene);
        o.visible = visible;
        if (programs() === before) continue;
        batch.push(done);
        if (batch.length >= COMPILE_BATCH) await flush();
      }
      await flush();
      if (cancelled) return;
      // Anything the early pass left compiling must be linked before the warm-up draws with it.
      await Promise.all(pending.current);
      if (cancelled) return;
      markStage("shaders", { programs: programs(), objects: objects.length });
      for (const texture of textures) {
        if (cancelled) return;
        gl.initTexture(texture);
        await nextFrame();
      }
      // Geometry: the real scene (same lights, fog and environment) with only one group shown,
      // everything in it visible and un-culled, drawn into a 1×1 scissor of the canvas itself —
      // an off-screen target would compile different programs (no tone mapping / output
      // encoding there). The canvas is not shown yet, and the first real frame clears it.
      markStage("textures");
      const scissor = new Vector4();
      const scissorTest = gl.getScissorTest();
      gl.getScissor(scissor);
      const groups = scene.children.filter((c) => {
        let meshes = 0;
        c.traverse((o) => {
          if ((o as { isMesh?: boolean }).isMesh) meshes++;
        });
        return meshes > 0;
      });
      const shown = new Map(scene.children.map((c) => [c, c.visible] as const));
      for (const [index, group] of groups.entries()) {
        if (cancelled) break;
        const restore: [Object3D, boolean, boolean][] = [];
        group.traverse((o) => {
          restore.push([o, o.visible, o.frustumCulled]);
          o.visible = true;
          o.frustumCulled = false;
        });
        for (const c of scene.children) if (c !== group && groups.includes(c)) c.visible = false;
        gl.setScissorTest(true);
        gl.setScissor(0, 0, 1, 1);
        gl.render(scene, camera);
        gl.setScissor(scissor);
        gl.setScissorTest(scissorTest);
        for (const [o, visible, culled] of restore) {
          o.visible = visible;
          o.frustumCulled = culled;
        }
        for (const [c, visible] of shown) c.visible = visible;
        // A few groups' uploads per painted frame (each is still drawn on its own).
        if ((index + 1) % GEOMETRY_GROUPS_PER_FRAME === 0) await nextFrame();
      }
      await nextFrame();

      if (cancelled) return;
      markStage("geometry", { groups: groups.length });
      store.state.compiled = true;
      store.emit();
    })();
    return () => {
      cancelled = true;
      undoDedicate();
    };
  }, [environment, gl, scene, camera, store]);

  useFrame(() => {
    if (store.state.ready) return;
    frames.current += 1;
    if (frames.current >= 2) {
      store.state.ready = true;
      markStage("ready");
      store.emit();
    }
  });
  return null;
}
