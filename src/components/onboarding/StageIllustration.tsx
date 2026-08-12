import { motion } from "motion/react";

/** One small hand-drawn motif per consultation chapter, so each of the
 * seven stages is recognizable by its shape — not just its color. Kept
 * to slow, looping motion (no bouncing/spinning) to match the rest of
 * the flow's "breathing," subliminal animation style. */

function FoundationMark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 200 140" className="h-28 w-full" fill="none" aria-hidden="true">
      {[24, 40, 56].map((r, i) => (
        <motion.circle
          key={r}
          cx="100"
          cy="68"
          r={r}
          stroke={color}
          strokeWidth="1.2"
          initial={false}
          animate={{ scale: [1, 1.07, 1], opacity: [0.32 - i * 0.08, 0.12, 0.32 - i * 0.08] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          style={{ transformOrigin: "100px 68px" }}
        />
      ))}
      <motion.g
        style={{ transformOrigin: "100px 68px" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="132" cy="68" r="3" fill={color} />
      </motion.g>
      <motion.circle
        cx="100"
        cy="68"
        r="6"
        fill={color}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "100px 68px" }}
      />
    </svg>
  );
}

function EdgeMark({ color }: { color: string }) {
  const bars = [
    { x: 40, h: 28 },
    { x: 76, h: 48 },
    { x: 112, h: 38 },
    { x: 148, h: 62 },
  ];
  return (
    <svg viewBox="0 0 200 140" className="h-28 w-full" fill="none" aria-hidden="true">
      {bars.map((bar, i) => (
        <motion.rect
          key={bar.x}
          x={bar.x}
          y={110 - bar.h}
          width="18"
          height={bar.h}
          rx="3"
          fill={color}
          fillOpacity={0.16 + i * 0.14}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          style={{ transformOrigin: "100px 110px", transformBox: "fill-box" }}
          transition={{ duration: 0.7, delay: i * 0.13, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
      <motion.path
        d="M32 106 L166 38"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="4 4"
        strokeOpacity="0.55"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.3, delay: 0.7, ease: "easeInOut" }}
      />
    </svg>
  );
}

function ResourcesMark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 200 140" className="h-28 w-full" fill="none" aria-hidden="true">
      <line
        x1="30"
        y1="118"
        x2="170"
        y2="118"
        stroke={color}
        strokeOpacity="0.2"
        strokeWidth="1.5"
      />
      <motion.path
        d="M100 118 C100 95 100 72 100 45"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
      <motion.path
        d="M100 80 C80 78 68 62 70 48"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.8, ease: "easeInOut" }}
      />
      <motion.path
        d="M100 65 C120 62 132 48 130 34"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 1.1, ease: "easeInOut" }}
      />
      <motion.circle
        cx="100"
        cy="45"
        r="4"
        fill={color}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{ transformOrigin: "100px 45px" }}
      />
    </svg>
  );
}

function RiskMark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 200 140" className="h-28 w-full" fill="none" aria-hidden="true">
      <line
        x1="100"
        y1="30"
        x2="100"
        y2="108"
        stroke={color}
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path d="M86 110 L114 110 L107 120 L93 120 Z" fill={color} fillOpacity="0.28" />
      <motion.g
        animate={{ rotate: [-6, 6, -6] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "100px 40px" }}
      >
        <line x1="55" y1="40" x2="145" y2="40" stroke={color} strokeWidth="2" />
        <line
          x1="55"
          y1="40"
          x2="55"
          y2="56"
          stroke={color}
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <line
          x1="145"
          y1="40"
          x2="145"
          y2="56"
          stroke={color}
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <path
          d="M42 56 A13 13 0 0 0 68 56 Z"
          fill={color}
          fillOpacity="0.22"
          stroke={color}
          strokeWidth="1.2"
        />
        <path
          d="M132 56 A13 13 0 0 0 158 56 Z"
          fill={color}
          fillOpacity="0.22"
          stroke={color}
          strokeWidth="1.2"
        />
      </motion.g>
      <circle cx="100" cy="40" r="4" fill={color} />
    </svg>
  );
}

function MotivationMark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 200 140" className="h-28 w-full" fill="none" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx="100"
          cy="66"
          r={18 + i * 14}
          stroke={color}
          strokeWidth="1.2"
          animate={{ scale: [1, 1.1, 1], opacity: [0.28 - i * 0.08, 0.04, 0.28 - i * 0.08] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
          style={{ transformOrigin: "100px 66px" }}
        />
      ))}
      <motion.path
        d="M100 82 C82 68 74 56 82 46 C88 39 98 41 100 50 C102 41 112 39 118 46 C126 56 118 68 100 82 Z"
        fill={color}
        fillOpacity="0.85"
        animate={{ scale: [1, 1.07, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "100px 62px" }}
      />
    </svg>
  );
}

function RealityMark({ color }: { color: string }) {
  const corners = [
    { path: "M30 30 L30 50 M30 30 L50 30", delay: 0 },
    { path: "M170 30 L170 50 M170 30 L150 30", delay: 0.15 },
    { path: "M30 110 L30 90 M30 110 L50 110", delay: 0.3 },
    { path: "M170 110 L170 90 M170 110 L150 110", delay: 0.45 },
  ];
  return (
    <svg viewBox="0 0 200 140" className="h-28 w-full" fill="none" aria-hidden="true">
      {corners.map((c) => (
        <motion.path
          key={c.path}
          d={c.path}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay: c.delay, ease: "easeInOut" }}
        />
      ))}
      <motion.circle
        cx="100"
        cy="70"
        r="20"
        stroke={color}
        strokeWidth="1.2"
        strokeOpacity="0.3"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
        style={{ transformOrigin: "100px 70px" }}
      />
      <motion.circle
        cx="100"
        cy="70"
        r="8"
        fill={color}
        fillOpacity="0.75"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.7, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "100px 70px" }}
      />
    </svg>
  );
}

function DirectionMark({ color }: { color: string }) {
  const points = [0, 1, 2, 3, 4, 5];
  return (
    <svg viewBox="0 0 200 140" className="h-28 w-full" fill="none" aria-hidden="true">
      <motion.path
        d="M20 112 L70 78 L110 93 L165 35"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      {points.map((i) => {
        const angle = (i / points.length) * Math.PI * 2;
        const x1 = 165 + Math.cos(angle) * 10;
        const y1 = 35 + Math.sin(angle) * 10;
        const x2 = 165 + Math.cos(angle) * 18;
        const y2 = 35 + Math.sin(angle) * 18;
        return (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            animate={{ opacity: [0.6, 0.15, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
          />
        );
      })}
      <motion.circle
        cx="165"
        cy="35"
        r="5"
        fill={color}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        style={{ transformOrigin: "165px 35px" }}
      />
    </svg>
  );
}

const MARKS: Record<number, typeof FoundationMark> = {
  1: FoundationMark,
  2: EdgeMark,
  3: ResourcesMark,
  4: RiskMark,
  5: MotivationMark,
  6: RealityMark,
  7: DirectionMark,
};

export function StageIllustration({ section, color }: { section: number; color: string }) {
  const Mark = MARKS[section] ?? FoundationMark;
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <Mark color={color} />
    </div>
  );
}
