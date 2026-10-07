import {
  Color,
  DoubleSide,
  FrontSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Material,
  type WebGLProgramParametersWithUniforms,
} from "three";

import type { QualityPreset } from "../performance/quality";
import { COLORS } from "./layout";

/**
 * The material language (shared, created once per canvas). Every material has
 * a meaning:
 *   sMetal / sCover — the Solventia S: navy-slate machined titanium (the logo's metal)
 *   titanium  — dark machined metal: technology, precision, structure
 *   graphite  — near-black engineered mass (kernels, seeds, decks)
 *   smoked    — smoked optical glass: uncertainty, latent possibility
 *   pearl     — ceramic, used sparingly: clarity, resolution, stability
 *   champagne — brushed gold metal: value, selection, the winning direction
 *   energy    — unlit, tinted per instance (instanceColor) for internal light
 *   violet    — indigo intelligence: computation, active reasoning
 *   edgeGold / edgeIndigo — fine emissive hairlines on machined edges
 *
 * STRUCTURAL LIGHTING: metals and glass carry a fresnel rim (a precise highlight
 * where a surface turns away from the eye), so machined silhouettes stay readable
 * against deep black without flooding anything with glow.
 */
export interface Materials {
  pearl: MeshStandardMaterial;
  champagne: MeshStandardMaterial;
  midnight: MeshStandardMaterial;
  glass: MeshPhysicalMaterial;
  energy: MeshBasicMaterial;
  violet: MeshBasicMaterial;
  titanium: MeshStandardMaterial;
  graphite: MeshStandardMaterial;
  smoked: MeshPhysicalMaterial;
  /** Smoked glass that dissolves per instance (provisional → resolved). */
  smokedDissolve: MeshStandardMaterial;
  titaniumDissolve: MeshStandardMaterial;
  /** The S channels' body and their machined cover plates. */
  sMetal: MeshStandardMaterial;
  sCover: MeshStandardMaterial;
  edgeGold: MeshBasicMaterial;
  edgeIndigo: MeshBasicMaterial;
  all: Material[];
}

export function createMaterials(preset: QualityPreset): Materials {
  const physical = preset.physicalMaterials;
  const metal = (o: {
    color: string;
    metalness: number;
    roughness: number;
    clearcoat?: number;
    env?: number;
  }) =>
    physical
      ? new MeshPhysicalMaterial({
          color: o.color,
          metalness: o.metalness,
          roughness: o.roughness,
          clearcoat: o.clearcoat ?? 0.3,
          clearcoatRoughness: 0.2,
          envMapIntensity: o.env ?? 1.25,
        })
      : new MeshStandardMaterial({
          color: o.color,
          metalness: o.metalness,
          roughness: o.roughness,
        });

  const pearl = physical
    ? new MeshPhysicalMaterial({
        color: "#E9E5DB",
        roughness: 0.48,
        metalness: 0,
        clearcoat: 0.42,
        clearcoatRoughness: 0.34,
        sheen: 0.25,
        sheenColor: new Color("#fff3e2"),
        sheenRoughness: 0.55,
      })
    : new MeshStandardMaterial({ color: "#E9E5DB", roughness: 0.5, metalness: 0 });
  const champagne = withRim(
    new MeshStandardMaterial({ color: COLORS.champagne, metalness: 1, roughness: 0.24 }),
    "#f3dcaa",
    3,
    0.28,
  );
  const midnight = new MeshStandardMaterial({
    color: COLORS.midnight,
    metalness: 0.6,
    roughness: 0.42,
  });
  const glass = new MeshPhysicalMaterial({
    color: "#d9e2ee",
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.09,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    side: DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.6,
  });
  const energy = new MeshBasicMaterial({ color: "#ffffff" });
  const violet = new MeshBasicMaterial({ color: COLORS.violetGlow });
  const titanium = withRim(
    metal({ color: COLORS.titanium, metalness: 0.92, roughness: 0.3, clearcoat: 0.35 }),
    COLORS.titaniumEdge,
    3.2,
    0.42,
  );
  const graphite = withRim(
    new MeshStandardMaterial({
      color: COLORS.graphite,
      metalness: 0.7,
      roughness: 0.4,
      envMapIntensity: 1.1,
    }),
    COLORS.titaniumEdge,
    3.5,
    0.22,
  );
  const smoked = withRim(
    new MeshPhysicalMaterial({
      color: COLORS.smoke,
      metalness: 0.1,
      roughness: 0.08,
      transparent: true,
      opacity: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      // Closed solids only: one front-faced pass (double-sided transparency draws twice).
      side: FrontSide,
      depthWrite: false,
      envMapIntensity: 2.6,
    }),
    "#a9b8d6",
    2.4,
    0.3,
  );
  // Provisional architecture: light optical glass, so the structure reads as untested.
  // Standard (not physical) and single-pass: whole gates of it can fill the screen.
  const smokedDissolve = withRim(
    withInstanceAlpha(
      new MeshStandardMaterial({
        color: "#9aa6c2",
        metalness: 0.25,
        roughness: 0.1,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        envMapIntensity: 2,
      }),
    ),
    "#b9c6e2",
    2.4,
    0.3,
  );
  // Dissolving titanium (alpha-hashed): standard shading — it is often many large pieces.
  const titaniumDissolve = withRim(
    withInstanceAlpha(
      new MeshStandardMaterial({ color: COLORS.titanium, metalness: 0.9, roughness: 0.32 }),
    ),
    COLORS.titaniumEdge,
    3.2,
    0.42,
  );
  titaniumDissolve.alphaHash = true;
  // The S: the logo's navy-slate metal, a brighter machined cover, a champagne pinstripe.
  const sMetal = withRim(
    metal({ color: COLORS.sMetal, metalness: 0.86, roughness: 0.3, clearcoat: 0.5, env: 1.4 }),
    "#9fb3d2",
    3,
    0.5,
  );
  const sCover = withRim(
    metal({ color: COLORS.sCover, metalness: 0.94, roughness: 0.2, clearcoat: 0.6, env: 1.6 }),
    "#c4d2e8",
    3,
    0.4,
  );
  const edgeGold = new MeshBasicMaterial({ color: COLORS.edgeGold });
  const edgeIndigo = new MeshBasicMaterial({ color: COLORS.indigo });
  return {
    pearl,
    champagne,
    midnight,
    glass,
    energy,
    violet,
    titanium,
    graphite,
    smoked,
    smokedDissolve,
    titaniumDissolve,
    sMetal,
    sCover,
    edgeGold,
    edgeIndigo,
    all: [
      pearl,
      champagne,
      midnight,
      glass,
      energy,
      violet,
      titanium,
      graphite,
      smoked,
      smokedDissolve,
      titaniumDissolve,
      sMetal,
      sCover,
      edgeGold,
      edgeIndigo,
    ],
  };
}

// ---- shader patches (composable) -------------------------------------------------------

type Patch = (shader: WebGLProgramParametersWithUniforms) => void;

/** Adds a named shader patch; patches compose, and the program cache key reflects them all. */
function addPatch<T extends Material>(material: T, key: string, patch: Patch): T {
  const data = material.userData as { patches?: { key: string; patch: Patch }[] };
  data.patches ??= [];
  data.patches.push({ key, patch });
  const patches = data.patches;
  material.onBeforeCompile = (shader) => {
    for (const p of patches) p.patch(shader);
  };
  material.customProgramCacheKey = () => patches.map((p) => p.key).join("|");
  return material;
}

/**
 * Reads per-instance ALPHA from instanceColor.r (rgb is restored), so one
 * instanced mesh can dissolve piece by piece: titanium ↔ glass in place.
 */
function withInstanceAlpha<T extends MeshStandardMaterial>(material: T): T {
  return addPatch(material, "instance-alpha", (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      [
        "#include <color_fragment>",
        "#ifdef USE_INSTANCING_COLOR",
        "  float instAlpha = vColor.r;",
        "  diffuseColor.rgb /= max(instAlpha, 0.001);",
        "  diffuseColor.a *= instAlpha;",
        "#endif",
      ].join("\n"),
    );
  });
}

/** Fresnel rim: a precise highlight where the surface turns away from the eye. */
function withRim<T extends MeshStandardMaterial>(
  material: T,
  color: string,
  power: number,
  strength: number,
): T {
  const c = new Color(color);
  return addPatch(material, `rim:${color}:${power}:${strength}`, (shader) => {
    shader.uniforms.rimColor = { value: c };
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform vec3 rimColor;\nvoid main() {")
      .replace(
        "#include <emissivemap_fragment>",
        [
          "#include <emissivemap_fragment>",
          `  float rimF = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), ${power.toFixed(2)});`,
          `  totalEmissiveRadiance += rimColor * rimF * ${strength.toFixed(3)};`,
        ].join("\n"),
      );
  });
}
