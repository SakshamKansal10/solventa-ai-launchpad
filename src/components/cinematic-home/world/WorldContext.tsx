import { createContext, useContext } from "react";

import type { QualityPreset } from "../performance/quality";
import type { ExperienceStore } from "../scroll/experience-store";
import type { FilamentPool } from "./filaments/filament-pool";
import type { Materials } from "./materials";

/** Everything a world module needs, provided once inside the canvas. */
export interface World {
  store: ExperienceStore;
  preset: QualityPreset;
  materials: Materials;
  filaments: FilamentPool;
  /** False under ?freeze=1 (deterministic frames) — ambient time stops. */
  animate: boolean;
}

export const WorldContext = createContext<World | null>(null);

export function useWorld(): World {
  const world = useContext(WorldContext);
  if (!world) throw new Error("useWorld must be used inside the cinematic canvas");
  return world;
}
