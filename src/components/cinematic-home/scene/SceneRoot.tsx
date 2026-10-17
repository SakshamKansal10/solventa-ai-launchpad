import { useEffect, useMemo } from "react";

import { CameraRig } from "../camera/CameraRig";
import { ReadySignal } from "../loading/ReadySignal";
import { PerformanceGovernor, RenderGate } from "../performance/PerformanceGovernor";
import type { QualityPreset } from "../performance/quality";
import type { ExperienceStore } from "../scroll/experience-store";
import { DomSync } from "../overlay/DomSync";
import { Atmosphere } from "../world/Atmosphere";
import { IntelligenceCore } from "../world/core/IntelligenceCore";
import { OpportunityUniverse } from "../world/universe/OpportunityUniverse";
import { ContextSignals } from "../world/context/ContextSignals";
import { Evidence } from "../world/path/Evidence";
import { ExecutionPath } from "../world/path/ExecutionPath";
import { Finalists } from "../world/path/Finalists";
import { Product3D } from "../world/product/Product3D";
import { FilamentPool } from "../world/filaments/filament-pool";
import { FilamentSystem } from "../world/filaments/FilamentSystem";
import { createMaterials } from "../world/materials";
import { WorldContext, type World } from "../world/WorldContext";

/**
 * Everything inside the single WebGL canvas. Frame order is explicit:
 * governor (−3) → camera, atmosphere (−1) → worlds (0), then the filament system uploads what the
 * worlds wrote and three renders. The story position itself is advanced by the page
 * (useStoryDriver) before every frame, so the world always renders the position the visitor is at.
 */
export function SceneRoot({
  store,
  preset,
  animate,
  parallax,
  freeze,
}: {
  store: ExperienceStore;
  preset: QualityPreset;
  animate: boolean;
  parallax: boolean;
  freeze: boolean;
}) {
  const materials = useMemo(() => createMaterials(preset), [preset]);
  const filaments = useMemo(
    () => new FilamentPool(preset.filamentCapacity),
    [preset.filamentCapacity],
  );
  useEffect(
    () => () => {
      for (const m of materials.all) m.dispose();
      filaments.texture.dispose();
    },
    [materials, filaments],
  );
  const world = useMemo<World>(
    () => ({ store, preset, materials, filaments, animate: animate && !freeze }),
    [store, preset, materials, filaments, animate, freeze],
  );

  return (
    <WorldContext.Provider value={world}>
      <CameraRig store={store} parallax={parallax && !freeze} />
      <Atmosphere />
      <IntelligenceCore />
      <ContextSignals />
      <OpportunityUniverse />
      <Finalists />
      <ExecutionPath />
      <Evidence />
      <Product3D />
      {/* The finale presents the approved emblem itself (overlay), not a constructed S. */}
      <FilamentSystem />
      <DomSync />
      <PerformanceGovernor store={store} preset={preset} />
      <RenderGate store={store} />
      <ReadySignal store={store} />
    </WorldContext.Provider>
  );
}
