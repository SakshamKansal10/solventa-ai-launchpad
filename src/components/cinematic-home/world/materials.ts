import {
  Color,
  DoubleSide,
  FrontSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Material,
} from "three";

import type { QualityPreset } from "../performance/quality";
import { COLORS } from "./layout";

/**
 * The material language (shared, created once per canvas). Every material has
 * a meaning, and the world is built mostly from the first three:
 *   titanium  — dark machined metal: technology, precision, structure
 *   graphite  — near-black engineered mass (kernels, seeds, rails)
 *   smoked    — smoked optical glass: uncertainty, latent possibility
 *   pearl     — warm ceramic, used selectively: clarity, resolution, stability
 *   champagne — brushed gold metal: value, selection, the winning direction
 *   glass     — clear optics: faint body, bright reflective edges
 *   energy    — unlit, tinted per instance (instanceColor) for internal light
 *   violet    — indigo-violet intelligence: computation, active reasoning
 *   edgeGold / edgeIndigo — fine emissive hairlines on machined edges
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
  edgeGold: MeshBasicMaterial;
  edgeIndigo: MeshBasicMaterial;
  all: Material[];
}

export function createMaterials(preset: QualityPreset): Materials {
  const pearl = preset.physicalMaterials
    ? new MeshPhysicalMaterial({
        color: "#E7E1D3",
        roughness: 0.5,
        metalness: 0,
        clearcoat: 0.42,
        clearcoatRoughness: 0.34,
        sheen: 0.25,
        sheenColor: new Color("#fff3e2"),
        sheenRoughness: 0.55,
      })
    : new MeshStandardMaterial({ color: "#E7E1D3", roughness: 0.5, metalness: 0 });
  const champagne = new MeshStandardMaterial({
    color: COLORS.champagne,
    metalness: 1,
    roughness: 0.26,
  });
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
  // Dark titanium: reads through its machined edges catching the key and rim, never flat.
  const titanium = preset.physicalMaterials
    ? new MeshPhysicalMaterial({
        color: COLORS.titanium,
        metalness: 0.92,
        roughness: 0.3,
        clearcoat: 0.35,
        clearcoatRoughness: 0.22,
        envMapIntensity: 1.25,
      })
    : new MeshStandardMaterial({ color: COLORS.titanium, metalness: 0.9, roughness: 0.32 });
  const graphite = new MeshStandardMaterial({
    color: COLORS.graphite,
    metalness: 0.7,
    roughness: 0.4,
    envMapIntensity: 1.1,
  });
  const smoked = new MeshPhysicalMaterial({
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
  });
  // Provisional architecture: light optical glass, so the structure reads as untested.
  // Standard (not physical) and single-pass: whole gates of it can fill the screen.
  const smokedDissolve = withInstanceAlpha(
    new MeshStandardMaterial({
      color: "#9aa6c2",
      metalness: 0.25,
      roughness: 0.1,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      envMapIntensity: 2,
    }),
  );
  // Dissolving titanium (alpha-hashed): standard shading — it is often many large pieces.
  const titaniumDissolve = withInstanceAlpha(
    new MeshStandardMaterial({ color: COLORS.titanium, metalness: 0.9, roughness: 0.32 }),
  );
  titaniumDissolve.alphaHash = true;
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
      edgeGold,
      edgeIndigo,
    ],
  };
}

/**
 * Reads per-instance ALPHA from instanceColor.r (rgb is restored), so one
 * instanced mesh can dissolve piece by piece: glass ↔ ceramic in place.
 */
function withInstanceAlpha<T extends MeshStandardMaterial>(material: T): T {
  material.onBeforeCompile = (shader) => {
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
  };
  material.customProgramCacheKey = () => "instance-alpha";
  return material;
}
