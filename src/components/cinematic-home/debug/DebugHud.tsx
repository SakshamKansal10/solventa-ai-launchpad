import { useEffect, useState } from "react";

import type { ExperienceStore } from "../scroll/experience-store";
import { SCENE_RANGES } from "../timeline/timeline";

/** How often the HUD redraws — it samples the store, never subscribes per frame. */
const REFRESH_MS = 250;

function read(store: ExperienceStore) {
  const s = store.state;
  const scene = SCENE_RANGES[s.sceneIndex];
  return {
    progress: s.progress,
    target: s.targetProgress,
    scene: `${scene.index + 1}/${SCENE_RANGES.length} ${scene.label} (${(s.sceneLocal * 100).toFixed(0)}%)`,
    camera: `${s.camera.x.toFixed(2)}, ${s.camera.y.toFixed(2)}, ${s.camera.z.toFixed(2)} · fov ${s.camera.fov.toFixed(1)}°`,
    energy: s.coreEnergy,
    order: s.nodeOrder,
    fps: s.perf.fps,
    dpr: `${s.perf.dpr.toFixed(2)} (device ${s.device?.dpr ?? "?"}, changes ${s.perf.dprChanges})`,
    draw: `${s.renderer.calls} calls · ${s.renderer.triangles.toLocaleString()} tris`,
    mode: s.capability
      ? `${s.capability.mode} · ${s.capability.tier} — ${s.capability.reasons.join(", ")}`
      : "probing…",
    viewport: `${window.innerWidth}×${window.innerHeight} · ${s.device?.coarsePointer ? "touch" : "mouse"} · ${s.device?.cores ?? "?"} cores · ${s.device?.memoryGb ?? "?"} GB`,
    gpu: s.device?.gpu ?? "unknown",
    stage: s.stageActive ? "rendering" : "paused (off-screen)",
  };
}

/** DEVELOPMENT ONLY — on by default in `vite dev`; production builds need ?debug=1. */
export default function DebugHud({ store }: { store: ExperienceStore }) {
  const [snapshot, setSnapshot] = useState(() => read(store));
  useEffect(() => {
    const id = window.setInterval(() => setSnapshot(read(store)), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [store]);

  const rows: [string, string][] = [
    ["progress", `${snapshot.progress.toFixed(3)} (raw ${snapshot.target.toFixed(3)})`],
    ["scene", snapshot.scene],
    ["camera", snapshot.camera],
    ["core / order", `${snapshot.energy.toFixed(2)} / ${snapshot.order.toFixed(2)}`],
    ["fps", snapshot.fps ? snapshot.fps.toFixed(0) : "–"],
    ["dpr", snapshot.dpr],
    ["draw", snapshot.draw],
    ["stage", snapshot.stage],
    ["mode", snapshot.mode],
    ["viewport", snapshot.viewport],
    ["gpu", snapshot.gpu],
  ];

  return (
    <div
      aria-hidden="true"
      data-testid="cinematic-hud"
      className="pointer-events-none fixed bottom-3 right-3 z-40 w-[min(360px,calc(100vw-24px))] rounded-lg bg-black/70 p-3 font-mono text-[10.5px] leading-[1.55] text-white/85 backdrop-blur-sm"
    >
      <p className="mb-1.5 text-[9.5px] uppercase tracking-[0.25em] text-[#C3A064]">Dev HUD</p>
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[84px_1fr] gap-2">
          <span className="text-white/50">{label}</span>
          <span className="break-words">{value}</span>
        </div>
      ))}
    </div>
  );
}
