import { useEffect, useState } from "react";

import { QUALITY_NOTCHES } from "../performance/quality";
import type { ExperienceStore } from "../scroll/experience-store";

/**
 * ?film=debug (owner, 2026-11-17): which rendering path the film is on (live / recorded /
 * reduced motion), the live quality level, and why. Review aid; plain text, not translated.
 */
export function FilmDebug({ store }: { store: ExperienceStore }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);
  const s = store.state;
  const c = s.capability;
  const rec = document.querySelector<HTMLCanvasElement>("[data-testid=recorded-film]");
  const path = c?.path ?? "pending";
  const lines = [
    `path: ${path === "reduced" ? "reduced motion" : path}`,
    `why: ${c?.reasons.join("; ") ?? "deciding"}`,
    path === "live"
      ? `quality: level ${s.perf.notch + 1} of ${QUALITY_NOTCHES.length} · pixel ratio ${s.perf.dpr} · filaments ${Math.round(s.perf.filamentShare * 100)}% · ${s.ready ? "ready" : "preparing (recording shown)"}`
      : `recording: ${rec?.dataset.filmSet ?? "loading"} set · ${rec?.dataset.loaded ?? 0} frames loaded · frame ${rec?.dataset.frame ?? "-"}`,
    s.perf.reason ? `last change: ${s.perf.reason}` : "",
    s.device ? `gpu: ${s.device.gpu ?? "none"}` : "",
  ].filter(Boolean);
  return (
    <div
      data-testid="film-debug"
      data-path={path}
      className="pointer-events-none fixed left-3 top-3 z-[90] max-w-[min(92vw,460px)] rounded-xl bg-black/75 px-3 py-2 font-mono text-[12px] leading-[1.5] text-white"
    >
      {lines.map((l) => (
        <div key={l.slice(0, 12)}>{l}</div>
      ))}
    </div>
  );
}
