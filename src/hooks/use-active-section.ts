import { useEffect, useState } from "react";

/** Fixed header height (h-24 = 96px) plus a little breathing room. */
export const HEADER_OFFSET = 104;

/**
 * Tracks which of the given section ids is currently most prominent near
 * the top of the viewport, for nav scroll-spy. `sectionIds` should be a
 * stable (module-level) array reference — pass the same array each render.
 */
export function useActiveSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setActiveId((current) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          return visible ? visible.target.id : current;
        });
      },
      {
        rootMargin: `-${HEADER_OFFSET}px 0px -55% 0px`,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}

export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET + 1;
  window.scrollTo({ top, behavior: "smooth" });
}
