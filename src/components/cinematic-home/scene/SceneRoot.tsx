import { CameraRig } from "../camera/CameraRig";
import { ReadySignal } from "../loading/ReadySignal";
import { PerformanceGovernor, RenderGate } from "../performance/PerformanceGovernor";
import type { QualityPreset } from "../performance/quality";
import type { ExperienceStore } from "../scroll/experience-store";
import { TimelineDriver } from "../timeline/TimelineDriver";
import { CorePlaceholder } from "./CorePlaceholder";
import { NodeField } from "./NodeField";
import { PALETTE } from "./palette";

/**
 * Everything inside the single WebGL canvas. Frame order is explicit:
 * governor (−3) → timeline (−2) → camera (−1) → core & nodes (0), then render.
 */
export function SceneRoot({
  store,
  preset,
  animate,
  parallax,
}: {
  store: ExperienceStore;
  preset: QualityPreset;
  animate: boolean;
  parallax: boolean;
}) {
  return (
    <>
      <color attach="background" args={[PALETTE.midnight]} />
      {/* Distance fades into the background colour: depth without any post-processing. */}
      <fogExp2 attach="fog" args={[PALETTE.midnight, 0.042]} />
      <ambientLight color={PALETTE.pearl} intensity={0.3} />
      <directionalLight color={PALETTE.violet} intensity={0.8} position={[6, 8, 4]} />

      <TimelineDriver store={store} animate={animate} />
      <CameraRig store={store} parallax={parallax} />
      <CorePlaceholder store={store} animate={animate} />
      <NodeField store={store} count={preset.nodeCount} animate={animate} />

      <PerformanceGovernor store={store} preset={preset} />
      <RenderGate store={store} />
      <ReadySignal store={store} />
    </>
  );
}
