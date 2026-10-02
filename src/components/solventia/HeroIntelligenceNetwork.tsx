import { motion, useReducedMotion } from "motion/react";

/**
 * A restrained SVG node-and-line graphic over the hero's skyline region —
 * NOT a repeat of the earlier "intelligence field" that was removed as
 * arbitrary decoration (see Hero.tsx's HeroBackground comment). The
 * difference is scale and purpose: 6 nodes (not a dense mesh), thin
 * low-opacity connections, one slow traveling signal — small enough to
 * read as "this place is instrumented" rather than a decorative overlay
 * fighting the photograph. Desktop only; off entirely under reduced-motion.
 */

// Percentage-based so the graphic scales with the hero regardless of
// viewport — positioned over the skyline/window area of the approved photo,
// never over the left third where the headline/CTAs sit.
const NODES: { x: number; y: number }[] = [
  { x: 58, y: 24 },
  { x: 67, y: 19 },
  { x: 74, y: 27 },
  { x: 70, y: 36 },
  { x: 80, y: 33 },
  { x: 63, y: 32 },
];

// The network is the last thing to come alive: it starts once the headline, the
// calls to action and the floating signal cards are all in place.
const NETWORK_DELAY = 2.3;

// Each pair indexes into NODES — kept sparse on purpose (5 lines across 6
// nodes, never a full mesh).
const LINKS: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 5],
  [2, 3],
  [2, 4],
];

// One signal travels this specific link at a time, pausing between runs —
// never more than one in flight, per spec.
const SIGNAL_PATH = LINKS[2];

export function HeroIntelligenceNetwork() {
  const reduceMotion = useReducedMotion();
  const from = NODES[SIGNAL_PATH[0]];
  const to = NODES[SIGNAL_PATH[1]];

  return (
    <svg
      className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <g style={{ mixBlendMode: "screen" }}>
        {LINKS.map(([a, b], i) => {
          const n1 = NODES[a];
          const n2 = NODES[b];
          return (
            <motion.line
              key={i}
              x1={`${n1.x}%`}
              y1={`${n1.y}%`}
              x2={`${n2.x}%`}
              y2={`${n2.y}%`}
              stroke="url(#sol-hero-network-line)"
              strokeWidth={1}
              initial={{ pathLength: reduceMotion ? 1 : 0, opacity: reduceMotion ? 1 : 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, delay: NETWORK_DELAY + i * 0.16, ease: "easeInOut" }}
            />
          );
        })}
        {NODES.map((n, i) => (
          <motion.circle
            key={i}
            cx={`${n.x}%`}
            cy={`${n.y}%`}
            r={2}
            fill="rgba(245,230,200,0.55)"
            initial={{ opacity: reduceMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: NETWORK_DELAY + i * 0.12 }}
          />
        ))}
        {!reduceMotion && (
          <motion.circle
            r={2.5}
            fill="rgba(197,163,106,0.9)"
            initial={{ cx: `${from.x}%`, cy: `${from.y}%`, opacity: 0 }}
            animate={{
              cx: [`${from.x}%`, `${to.x}%`],
              cy: [`${from.y}%`, `${to.y}%`],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 5,
              delay: NETWORK_DELAY + 1.4,
              ease: [0.22, 1, 0.36, 1],
              repeat: Infinity,
              repeatDelay: 4,
            }}
          />
        )}
      </g>
      <defs>
        <linearGradient id="sol-hero-network-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(197,163,106,0.5)" />
          <stop offset="100%" stopColor="rgba(114,87,216,0.4)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
