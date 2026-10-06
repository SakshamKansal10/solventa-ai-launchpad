/**
 * Device capability detection → which experience a visitor gets.
 *
 * `probeDevice` reads the browser once (client only). `classifyDevice` is a
 * pure decision so the rules are unit-tested and easy to tune: every result
 * carries the human-readable reasons it was chosen (shown in the dev HUD).
 */

export type QualityTier = "high" | "medium" | "low";
export type ExperienceMode = "webgl" | "fallback";
/** `?tier=` override for testing — forces a tier, or the static fallback. */
export type TierOverride = QualityTier | "fallback";

export interface DeviceProfile {
  webgl2: boolean;
  /** Renderer string, e.g. "ANGLE (NVIDIA, …)" — null when unavailable. */
  gpu: string | null;
  cores: number | null;
  /** navigator.deviceMemory (Chromium only) — null elsewhere. */
  memoryGb: number | null;
  dpr: number;
  coarsePointer: boolean;
  viewportWidth: number;
  viewportHeight: number;
  saveData: boolean;
}

export interface Capability {
  mode: ExperienceMode;
  tier: QualityTier;
  reasons: string[];
}

// CPU rasterisers: WebGL "works" but a continuous 3D scene would crawl.
const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i;

export function isSoftwareGpu(gpu: string | null): boolean {
  return gpu !== null && SOFTWARE_GPU.test(gpu);
}

export function classifyDevice(
  device: DeviceProfile,
  { reducedMotion, override }: { reducedMotion: boolean; override?: TierOverride | null },
): Capability {
  if (override === "fallback")
    return { mode: "fallback", tier: "low", reasons: ["forced: fallback"] };
  if (!device.webgl2) return { mode: "fallback", tier: "low", reasons: ["WebGL2 unavailable"] };
  if (override) return { mode: "webgl", tier: override, reasons: [`forced: ${override}`] };
  // A scroll-driven camera flight is exactly the motion this setting asks us to avoid.
  if (reducedMotion) return { mode: "fallback", tier: "low", reasons: ["prefers-reduced-motion"] };
  if (isSoftwareGpu(device.gpu))
    return { mode: "fallback", tier: "low", reasons: ["software GPU"] };

  const reasons: string[] = [];
  let tier: QualityTier = "medium";
  if (device.coarsePointer) {
    reasons.push("touch device");
    if (device.memoryGb !== null && device.memoryGb <= 3) {
      tier = "low";
      reasons.push("≤ 3 GB memory");
    }
  } else if ((device.cores ?? 0) >= 8 && (device.memoryGb === null || device.memoryGb >= 8)) {
    tier = "high";
    reasons.push("desktop, ≥ 8 cores");
  } else {
    reasons.push("desktop, modest CPU");
  }
  if (device.saveData) {
    tier = "low";
    reasons.push("data saver on");
  }
  return { mode: "webgl", tier, reasons };
}

/** Reads the current browser. Client only — call from an effect, never during SSR. */
export function probeDevice(): DeviceProfile {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  let webgl2 = false;
  let gpu: string | null = null;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (gl) {
      webgl2 = true;
      gpu = String(gl.getParameter(gl.RENDERER));
      // Chromium/WebKit report a generic "WebKit WebGL" here; Firefox already
      // returns the real renderer (and warns if the debug extension is used).
      if (/^webkit webgl$/i.test(gpu)) {
        const info = gl.getExtension("WEBGL_debug_renderer_info");
        if (info) gpu = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    webgl2 = false;
  }
  return {
    webgl2,
    gpu,
    cores: nav.hardwareConcurrency || null,
    memoryGb: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    dpr: window.devicePixelRatio || 1,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    saveData: Boolean(nav.connection?.saveData),
  };
}
