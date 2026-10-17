import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BackSide,
  Color,
  FogExp2,
  ShaderMaterial,
  SphereGeometry,
  type DirectionalLight,
  type HemisphereLight,
  type Mesh,
} from "three";

import { sampleKeys } from "../timeline/timeline";
import { EXPOSURE_KEYS, FOG_KEYS } from "./atmosphere-keys";
import { buildStudioEnvironment } from "./environment";
import { COLORS } from "./layout";
import { lightAt, PEARL_WORLD, TONE_UNIFORMS } from "./tone";
import { useWorld } from "./WorldContext";

const DARK_LOW = new Color(COLORS.black);
const DARK_HIGH = new Color(COLORS.navy);
const PEARL_LOW = new Color(PEARL_WORLD.horizon);
const PEARL_HIGH = new Color(PEARL_WORLD.sky);
const DARK_FOG = new Color(COLORS.black);
const PEARL_FOG = new Color(PEARL_WORLD.fog);
const HEMI = {
  sky: [new Color("#2a3a55"), new Color("#ffffff")],
  ground: [new Color("#05070c"), new Color("#d9d4ca")],
} as const;

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const skyFragment = /* glsl */ `
uniform vec3 uLow;
uniform vec3 uHigh;
uniform float uLift;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float h = smoothstep(-0.35, 0.85, vDir.y);
  vec3 col = mix(uLow, uHigh, h) * uLift;
  // ±½ step of noise: no banding in the long dark gradients.
  col += (hash(gl_FragCoord.xy) - 0.5) / 400.0;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/**
 * Environment light, sky gradient, fog and the key lights — all following the film's tone
 * (tone.ts): a deep navy-black space for reasoning, a warm pearl studio for clarity, and every
 * state in between a continuous blend.
 */
export function Atmosphere() {
  const { store } = useWorld();
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const sky = useRef<Mesh>(null);
  const key = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);

  const skyMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        uniforms: {
          uLow: { value: new Color(COLORS.black) },
          uHigh: { value: new Color(COLORS.navy) },
          // Black that still holds detail: the deep navy of the sky is never crushed to nothing.
          uLift: { value: 0.6 },
        },
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  const skyGeometry = useMemo(() => new SphereGeometry(900, 32, 16), []);

  useEffect(() => {
    let cancelled = false;
    let built: { dispose: () => void } | null = null;
    scene.background = new Color(COLORS.black);
    scene.fog = new FogExp2(COLORS.black, 0.012);
    // Built without stalling the page (its shaders compile in parallel first). The world's own
    // shaders are compiled only once it exists, since they compile differently with an
    // environment — see ReadySignal.
    void buildStudioEnvironment(gl, 0.04, () => cancelled)
      .then((env) => {
        if (!env) return;
        if (cancelled) {
          env.dispose();
          return;
        }
        built = env;
        scene.environment = env.texture;
        scene.environmentIntensity = 0.38;
      })
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;
        store.state.environment = true;
        store.emit();
      });
    return () => {
      cancelled = true;
      scene.environment = null;
      scene.fog = null;
      built?.dispose();
      skyMaterial.dispose();
      skyGeometry.dispose();
    };
  }, [gl, scene, store, skyMaterial, skyGeometry]);

  useFrame((state) => {
    const p = store.state.progress;
    const L = lightAt(p);
    TONE_UNIFORMS.uLight.value = L;
    const fog = scene.fog as FogExp2 | null;
    if (fog) {
      // A pearl haze is thinner than a dark one: distance reads as air, not as a wall.
      fog.density = sampleKeys(FOG_KEYS, p) * (1 - 0.45 * L);
      fog.color.copy(DARK_FOG).lerp(PEARL_FOG, L);
    }
    const u = skyMaterial.uniforms;
    (u.uLow.value as Color).copy(DARK_LOW).lerp(PEARL_LOW, L);
    (u.uHigh.value as Color).copy(DARK_HIGH).lerp(PEARL_HIGH, L);
    u.uLift.value = 0.6 + 0.4 * L;
    // Exposure keys stage the dark reveals; the pearl studio sits at a calm, even 1.
    state.gl.toneMappingExposure = sampleKeys(EXPOSURE_KEYS, p) * (1 - L) + 1 * L;
    // Soft studio light in the pearl world (shapes stay legible without glow).
    scene.environmentIntensity = 0.38 + 0.22 * L;
    if (hemi.current) {
      hemi.current.intensity = 0.2 + 1.1 * L;
      hemi.current.color.copy(HEMI.sky[0]).lerp(HEMI.sky[1], L);
      hemi.current.groundColor.copy(HEMI.ground[0]).lerp(HEMI.ground[1], L);
    }
    sky.current?.position.copy(state.camera.position);
  }, -1);

  return (
    <>
      <mesh ref={sky} geometry={skyGeometry} material={skyMaterial} renderOrder={-10} />
      <hemisphereLight ref={hemi} args={["#2a3a55", "#05070c", 0.2]} />
      <directionalLight ref={key} color="#ffeed6" intensity={2.6} position={[-14, 16, 18]} />
      <directionalLight color="#9fb2d6" intensity={1.25} position={[14, 4, -20]} />
      <directionalLight color="#c9a873" intensity={0.35} position={[6, -14, 10]} />
    </>
  );
}
