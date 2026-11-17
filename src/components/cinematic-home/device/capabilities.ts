/**
 * How the cinematic film is drawn for this visit (owner, 2026-11-17: every visitor gets the full
 * cinematic page — the same layout, text, framing and story; only the rendering method changes).
 * There is no performance-based choice any more: no device, core, memory, GPU, screen-size,
 * data-saver or frame-rate test decides it, and nothing is remembered between visits.
 *
 *   live      the real-time 3D world — whenever a WebGL2 context can be created. Quality adapts
 *             INSIDE the film (pixel ratio, filaments), never the layout (PerformanceGovernor).
 *   recorded  the same film pre-rendered from the same camera path, scrubbed by scroll at the same
 *             positions (RecordedFilm) — no WebGL2, or the live world failed and could not recover.
 *   reduced   prefers-reduced-motion: the same page and visuals, with gentle crossfades between
 *             key frames instead of camera moves.
 *
 * `probeDevice` reads the browser once (client only); `chooseFilmPath` is pure and unit-tested,
 * and every result carries the reasons it was chosen (?film=debug shows them).
 */

/** The live world's construction preset. Everyone gets "full"; "lite" exists only as a manual
 * override for tests and measurements (?tier=lite) — the device never chooses it. */
export type QualityTier = "full" | "lite";
export type FilmPath = "live" | "recorded" | "reduced";

/** Manual overrides for review and tests: ?film=live|recorded|reduced, ?tier=full|lite (older
 * links: ?tier=fallback means "no live world" → recorded; high/medium/low map to full/lite). */
export interface FilmOverride {
  path?: FilmPath;
  tier?: QualityTier;
}

export function normalizeOverrides(
  tier: string | undefined,
  film: string | undefined,
): FilmOverride {
  const o: FilmOverride = {};
  if (tier === "full" || tier === "high" || tier === "medium") o.tier = "full";
  else if (tier === "lite" || tier === "low") o.tier = "lite";
  else if (tier === "fallback") o.path = "recorded";
  if (film === "live" || film === "recorded" || film === "reduced") o.path = film;
  return o;
}

export interface DeviceProfile {
  webgl2: boolean;
  gpu: string | null;
  dpr: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface Capability {
  path: FilmPath;
  tier: QualityTier;
  reasons: string[];
}

const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i;

/** Reported in the debug overlay only — it no longer changes anything. */
export function isSoftwareGpu(gpu: string | null): boolean {
  return gpu !== null && SOFTWARE_GPU.test(gpu);
}

export function chooseFilmPath(
  device: DeviceProfile,
  { reducedMotion, override = {} }: { reducedMotion: boolean; override?: FilmOverride },
): Capability {
  const tier = override.tier ?? "full";
  if (override.path === "live" && !device.webgl2)
    return { path: "recorded", tier, reasons: ["forced live, but WebGL2 is unavailable"] };
  if (override.path) return { path: override.path, tier, reasons: [`forced: ${override.path}`] };
  if (reducedMotion) return { path: "reduced", tier, reasons: ["prefers-reduced-motion"] };
  if (!device.webgl2) return { path: "recorded", tier, reasons: ["WebGL2 unavailable"] };
  const reasons = ["WebGL2 available"];
  if (override.tier) reasons.push(`forced tier: ${override.tier}`);
  if (isSoftwareGpu(device.gpu)) reasons.push("software GPU — quality adapts inside the film");
  return { path: "live", tier, reasons };
}

export function probeDevice(): DeviceProfile {
  let webgl2 = false;
  let gpu: string | null = null;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (gl) {
      webgl2 = true;
      gpu = String(gl.getParameter(gl.RENDERER));
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
    dpr: window.devicePixelRatio || 1,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}
