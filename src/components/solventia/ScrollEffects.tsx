import { useEffect } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

const POP_SELECTOR = [
  "main h2",
  "main h2 + p",
  "main li",
  '[class*="rounded-2xl"]',
  '[class*="rounded-3xl"]',
  '[class*="rounded-[24px]"]',
  '[class*="rounded-[28px]"]',
  '[class*="rounded-[32px]"]',
].join(",");

/** Makes headings and cards pop in one by one as they scroll into view.
 * Uses CSS animation (opacity + individual translate/scale) so it never
 * fights the elements' own transforms or hover transitions. */
export function PopOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const main = document.querySelector("main");
    if (!main) return;
    const hero = main.firstElementChild;
    const all = Array.from(main.querySelectorAll<HTMLElement>(POP_SELECTOR));
    // Animate leaf-most matches only, and leave the hero to its own motion.
    const targets = all.filter(
      (el) => !(hero && hero.contains(el)) && !all.some((o) => o !== el && el.contains(o)),
    );
    targets.forEach((el) => el.classList.add("pop-pre"));

    const io = new IntersectionObserver(
      (entries) => {
        entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.left - b.boundingClientRect.left)
          .forEach((e, i) => {
            const el = e.target as HTMLElement;
            io.unobserve(el);
            el.style.animationDelay = `${Math.min(i, 6) * 90}ms`;
            el.classList.add("pop-in");
            el.addEventListener(
              "animationend",
              () => {
                el.classList.remove("pop-pre", "pop-in");
                el.style.animationDelay = "";
              },
              { once: true },
            );
          });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    targets.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      targets.forEach((el) => {
        el.classList.remove("pop-pre", "pop-in");
        el.style.animationDelay = "";
      });
    };
  }, []);
  return null;
}

/** Thin violet bar under the top edge that fills as the page is scrolled. */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.2 });
  if (reduce) return null;
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-[#7257D8]"
      style={{ scaleX }}
    />
  );
}
