import { useExperienceStore } from "../scroll/experience-store";
import { ProductPreview } from "./ProductPreview";

/**
 * Hosts the real product panel. DomSync maps it onto the 3D slab with a CSS
 * homography (so it starts life as part of the world) and releases it as
 * interactive DOM once the slab faces the screen. Inert until then.
 */
export function ProductLayer() {
  const store = useExperienceStore();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        ref={(el) => {
          store.state.dom.panel = el;
          if (el) el.inert = true;
        }}
        className="absolute left-0 top-0 h-[650px] w-[1040px] origin-top-left will-change-transform max-sm:origin-center max-lg:h-[475px] max-lg:w-[760px] max-sm:h-[min(600px,78svh)] max-sm:w-[calc(100vw-24px)]"
        style={{ opacity: 0, visibility: "hidden" }}
      >
        <ProductPreview />
      </div>
    </div>
  );
}
