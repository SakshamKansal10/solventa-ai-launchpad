import { mulberry32 } from "../../math";
import { FINALS_HUB, type V3 } from "../layout";
import { fits, score, worstFit, type Fits, type OpportunityAttributes } from "./scoring";

/**
 * The Opportunity Universe as DATA — deterministic, art-directed, testable.
 *
 * 360 logical opportunities in five families (structural types) placed in six
 * composed territories, each with its own spatial pattern — never a random
 * sphere. Ranking by the illustrative score gives each opportunity the stage
 * at which it falls away: 360 → 120 → 36 → 9 → 3 → 1.
 */

export const LOGICAL_COUNT = 360;

const TERRITORY_SCALE: Record<string, number> = {
  A: 1.55,
  B: 1.5,
  C: 1.4,
  D: 2.1,
  E: 1.75,
  F: 1.0,
};
/** How many remain after each convergence stage. */
export const STAGE_COUNTS = [360, 120, 36, 9, 3, 1] as const;

export type FamilyIndex = 0 | 1 | 2 | 3 | 4;

interface Range {
  capital: [number, number];
  digital: [number, number];
  india: [number, number];
  hours: [number, number];
  access: [number, number];
  difficulty: [number, number];
}

/** Five structural families — each a node architecture and a kind of business. */
export const FAMILIES: { id: string; label: string; range: Range }[] = [
  {
    id: "studio",
    label: "Digital services",
    range: {
      capital: [5e3, 40e3],
      digital: [0.75, 0.95],
      india: [0.7, 0.95],
      hours: [8, 20],
      access: [0.35, 0.65],
      difficulty: [0.25, 0.55],
    },
  },
  {
    id: "product",
    label: "Digital products",
    range: {
      capital: [8e3, 90e3],
      digital: [0.8, 1],
      india: [0.5, 0.85],
      hours: [6, 18],
      access: [0.2, 0.5],
      difficulty: [0.4, 0.7],
    },
  },
  {
    id: "media",
    label: "Content & education",
    range: {
      capital: [2e3, 35e3],
      digital: [0.45, 0.75],
      india: [0.6, 0.9],
      hours: [10, 24],
      access: [0.55, 0.85],
      difficulty: [0.35, 0.6],
    },
  },
  {
    id: "local",
    label: "Local services",
    range: {
      capital: [25e3, 2e5],
      digital: [0.1, 0.4],
      india: [0.85, 1],
      hours: [18, 40],
      access: [0.7, 0.95],
      difficulty: [0.3, 0.55],
    },
  },
  {
    id: "venture",
    label: "Commerce & making",
    range: {
      capital: [2e5, 25e5],
      digital: [0.2, 0.5],
      india: [0.6, 0.9],
      hours: [25, 50],
      access: [0.5, 0.85],
      difficulty: [0.65, 0.95],
    },
  },
];

/** The sparse high-value region samples from the best end of its families' ranges. */
const EXCELLENT: Range = {
  capital: [6e3, 30e3],
  digital: [0.85, 0.98],
  india: [0.8, 0.95],
  hours: [7, 12],
  access: [0.15, 0.35],
  difficulty: [0.2, 0.4],
};

export type TerritoryId = "A" | "B" | "C" | "D" | "E" | "F";

interface Territory {
  id: TerritoryId;
  name: string;
  centre: V3;
  mix: [FamilyIndex, number][];
  pattern: (i: number, n: number, rand: () => number) => [number, number, number];
}

const TAU = Math.PI * 2;

export const TERRITORIES: Territory[] = [
  {
    // A — near-left foreground: a sweeping ribbon that passes the camera.
    id: "A",
    name: "near ribbon",
    centre: [-14, 0.5, -21],
    mix: [
      [2, 24],
      [0, 16],
    ],
    pattern: (i, n, rand) => {
      const t = i / (n - 1);
      const across = (i % 2 ? 1 : -1) * (0.6 + rand() * 1.1);
      return [
        -5 + t * 10 + across * 0.4,
        Math.sin(t * Math.PI) * 3 - 1.5 + across,
        8 - t * 18 + across * 0.3,
      ];
    },
  },
  {
    // B — upper-right middle distance: three tilted shelves.
    id: "B",
    name: "upper shelves",
    centre: [11, 7, -27],
    mix: [
      [1, 30],
      [0, 16],
      [2, 14],
    ],
    pattern: (i, _n, rand) => {
      const shelf = i % 3;
      const k = Math.floor(i / 3);
      const col = k % 5;
      const row = Math.floor(k / 5);
      return [
        (col - 2) * 2.3 + (rand() - 0.5) * 0.6,
        shelf * 2.4 - 2.4 + row * 0.35,
        (row - 2) * 2.2 + shelf * 1.2 + (rand() - 0.5) * 0.6,
      ];
    },
  },
  {
    // C — beneath the camera path: a broad spiral floor.
    id: "C",
    name: "spiral floor",
    centre: [2, -10, -28],
    mix: [
      [3, 54],
      [2, 12],
    ],
    pattern: (i, _n, rand) => {
      const a = i * 0.72;
      const r = 2.5 + i * 0.2;
      return [Math.cos(a) * r, (rand() - 0.5) * 0.9 - r * 0.05, Math.sin(a) * r * 0.85];
    },
  },
  {
    // D — very deep background: long strands that run into darkness.
    id: "D",
    name: "deep strands",
    centre: [0, 3, -66],
    mix: [
      [4, 60],
      [3, 20],
    ],
    pattern: (i, n, rand) => {
      const strand = i % 4;
      const t = Math.floor(i / 4) / Math.ceil(n / 4);
      const x = -26 + t * 52;
      return [
        x,
        (strand - 1.5) * 4.5 + Math.sin(t * TAU + strand) * 2.5,
        Math.cos(t * 3 + strand) * 6 - strand * 3 + (rand() - 0.5),
      ];
    },
  },
  {
    // E — the sparse high-value region: a calm, well-spaced constellation.
    id: "E",
    name: "sparse constellation",
    centre: [7, -0.5, -41],
    mix: [
      [0, 12],
      [1, 12],
    ],
    pattern: (i, n) => {
      const a = i * 2.39996;
      const r = 1.4 + Math.sqrt((i + 0.5) / n) * 6.5;
      return [Math.cos(a) * r, Math.sin(a) * r * 0.55, ((i % 3) - 1) * 1.6];
    },
  },
  {
    // F — the dense, difficult region: a tight crystalline lattice.
    id: "F",
    name: "dense lattice",
    centre: [-16, 6, -38],
    mix: [
      [4, 60],
      [3, 10],
      [2, 10],
      [1, 6],
      [0, 4],
    ],
    pattern: (i, _n, rand) => {
      const x = i % 6;
      const y = Math.floor(i / 6) % 5;
      const z = Math.floor(i / 30);
      return [
        (x - 2.5) * 1.35 + (rand() - 0.5) * 0.25,
        (y - 2) * 1.35 + (rand() - 0.5) * 0.25,
        (z - 1) * 1.6 + (rand() - 0.5) * 0.25,
      ];
    },
  },
];

export interface Opportunity {
  index: number;
  family: FamilyIndex;
  territory: TerritoryId;
  /** Index inside its territory's pattern. */
  local: number;
  attrs: OpportunityAttributes;
  fits: Fits;
  score: number;
  /** 1 = best. */
  rank: number;
  /** Convergence stage (1–5) at which it falls away; 0 = the one that remains. */
  stage: number;
  conflict: boolean;
  rest: [number, number, number];
  /** Euler angles of its "unaligned" resting orientation. */
  tilt: [number, number, number];
  size: number;
}

export interface Connection {
  /** Endpoint indices into `opportunities`, or −1 = the trunk origin, −2 = a point into darkness. */
  a: number;
  b: number;
  kind: "trunk" | "branch" | "dark";
  width: number;
  phase: number;
  /** For "dark" connections: the far point. */
  far?: [number, number, number];
}

/** Where the gold trunks leave the core's interior and branch into the network. */
export const TRUNK_ORIGIN: V3 = [0.6, 0.1, -5];

/** Where convergence draws the survivors (the promising region, near E). */
export const CONVERGE_ANCHOR: V3 = [6, 0.2, -40];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function sampleAttrs(range: Range, rand: () => number): OpportunityAttributes {
  // Capital spans orders of magnitude: sample it in log space.
  const lc = lerp(Math.log(range.capital[0]), Math.log(range.capital[1]), rand());
  return {
    capitalInr: Math.round(Math.exp(lc) / 1000) * 1000,
    digital: lerp(...range.digital, rand()),
    india: lerp(...range.india, rand()),
    hoursPerWeek: Math.round(lerp(...range.hours, rand())),
    access: lerp(...range.access, rand()),
    difficulty: lerp(...range.difficulty, rand()),
  };
}

export function stageForRank(rank: number): number {
  if (rank > 120) return 1;
  if (rank > 36) return 2;
  if (rank > 9) return 3;
  if (rank > 3) return 4;
  if (rank > 1) return 5;
  return 0;
}

export interface UniverseModel {
  opportunities: Opportunity[];
  /** Indices of the opportunities actually rendered on this tier. */
  rendered: number[];
  connections: Connection[];
  /** Top 3 in display order: Direction 01 (left), 02 (centre-back, the one), 03 (right). */
  finalists: number[];
  winner: number;
  /** Survivor targets per formation, keyed by opportunity index. */
  formations: {
    spiral: Map<number, [number, number, number]>;
    nine: Map<number, [number, number, number]>;
    three: Map<number, [number, number, number]>;
  };
}

export function createUniverse(renderCount = LOGICAL_COUNT, seed = 11): UniverseModel {
  const rand = mulberry32(seed);
  const opportunities: Opportunity[] = [];
  for (const territory of TERRITORIES) {
    const families: FamilyIndex[] = [];
    for (const [family, count] of territory.mix)
      for (let i = 0; i < count; i++) families.push(family);
    // Interleave families inside a territory so no pattern is single-coloured.
    families.sort((x, y) => ((x * 7 + 3) % 5) - ((y * 7 + 3) % 5));
    const n = families.length;
    families.forEach((family, i) => {
      const off = territory.pattern(i, n, rand);
      const range = territory.id === "E" ? EXCELLENT : FAMILIES[family].range;
      const attrs = sampleAttrs(range, rand);
      const f = fits(attrs);
      opportunities.push({
        index: opportunities.length,
        family,
        territory: territory.id,
        local: i,
        attrs,
        fits: f,
        score: score(f),
        rank: 0,
        stage: 0,
        conflict: worstFit(f).conflict,
        rest: [
          territory.centre[0] + off[0],
          territory.centre[1] + off[1],
          territory.centre[2] + off[2],
        ],
        tilt: [rand() * TAU, rand() * TAU, rand() * TAU],
        // Engineered forms must read at distance: larger in sparse and deep territories.
        size: (0.8 + rand() * 0.45) * TERRITORY_SCALE[territory.id],
      });
    });
  }

  const byScore = [...opportunities].sort((a, b) => b.score - a.score || a.index - b.index);
  byScore.forEach((o, i) => {
    o.rank = i + 1;
    o.stage = stageForRank(o.rank);
  });

  // Rendered subset: every survivor of 120 → 36 always; the rest sampled evenly per territory.
  const rendered = new Set<number>();
  for (const o of opportunities) if (o.rank <= 36) rendered.add(o.index);
  const remaining = Math.max(0, Math.min(renderCount, LOGICAL_COUNT) - rendered.size);
  const others = opportunities.filter((o) => o.rank > 36);
  const step = others.length / Math.max(1, remaining);
  for (let i = 0; i < remaining; i++) rendered.add(others[Math.floor(i * step)].index);
  const renderedList = [...rendered].sort((a, b) => a - b);

  // Connections — sparse, and shaped like their territory's architecture: rails
  // along shelves, a spiral arm, strands, a lattice, a ring. Only the trunks
  // (from the core) are hub links; nothing is connected to everything.
  const connections: Connection[] = [];
  const isRendered = (i: number) => rendered.has(i);
  const chain = (list: Opportunity[], width: number, closed = false, skipEvery = 0) => {
    for (let i = 0; i < list.length - 1 + (closed ? 1 : 0); i++) {
      if (skipEvery && i % skipEvery === skipEvery - 1) continue;
      const a = list[i];
      const b = list[(i + 1) % list.length];
      connections.push({ a: a.index, b: b.index, kind: "branch", width, phase: rand() });
    }
  };
  for (const territory of TERRITORIES) {
    const members = opportunities.filter(
      (o) => o.territory === territory.id && isRendered(o.index),
    );
    if (!members.length) continue;
    const hub = members.reduce((best, o) =>
      dist(o.rest, territory.centre) < dist(best.rest, territory.centre) ? o : best,
    );
    connections.push({ a: -1, b: hub.index, kind: "trunk", width: 0.02, phase: rand() });
    switch (territory.id) {
      case "A":
        chain(members, 0.03, false, 7);
        break;
      case "B": {
        // One rail per shelf row, running across its columns.
        const rows = new Map<string, Opportunity[]>();
        for (const o of members) {
          const k = Math.floor(o.local / 3);
          const key = `${o.local % 3}:${Math.floor(k / 5)}`;
          rows.set(key, [...(rows.get(key) ?? []), o]);
        }
        for (const row of rows.values()) chain(row, 0.028);
        break;
      }
      case "C":
        chain(members, 0.03);
        break;
      case "D":
        for (let s4 = 0; s4 < 4; s4++)
          chain(
            members.filter((o) => o.local % 4 === s4),
            0.026,
          );
        for (let s4 = 0; s4 < 4; s4++) {
          const end = members[members.length - 1 - s4];
          if (!end) continue;
          connections.push({
            a: end.index,
            b: -2,
            kind: "dark",
            width: 0.045,
            phase: rand(),
            far: [
              end.rest[0] + 30 + s4 * 6,
              end.rest[1] + (s4 - 1.5) * 8,
              end.rest[2] - 70 - s4 * 15,
            ],
          });
        }
        break;
      case "E": {
        // A calm ring around the constellation, ordered by angle.
        const c = territory.centre;
        const ring = [...members].sort(
          (x, y) =>
            Math.atan2(x.rest[1] - c[1], x.rest[0] - c[0]) -
            Math.atan2(y.rest[1] - c[1], y.rest[0] - c[0]),
        );
        chain(ring, 0.04, true);
        break;
      }
      case "F":
        // The dense, difficult lattice: links along both grid axes.
        for (const o of members) {
          const right = members.find((m) => m.local === o.local + 1 && o.local % 6 !== 5);
          const up = members.find((m) => m.local === o.local + 6);
          if (right)
            connections.push({
              a: o.index,
              b: right.index,
              kind: "branch",
              width: 0.02,
              phase: rand(),
            });
          if (up)
            connections.push({
              a: o.index,
              b: up.index,
              kind: "branch",
              width: 0.02,
              phase: rand(),
            });
        }
        break;
    }
  }

  // Formations for the survivors.
  const top = byScore;
  const spiral = new Map<number, [number, number, number]>();
  top.slice(0, 36).forEach((o, i) => {
    const a = i * 2.39996 + 0.6;
    const r = 2.4 + Math.sqrt(i + 1) * 1.75;
    spiral.set(o.index, [
      CONVERGE_ANCHOR[0] + Math.cos(a) * r,
      CONVERGE_ANCHOR[1] + Math.sin(a) * r * 0.62,
      CONVERGE_ANCHOR[2] - 2 + Math.sin(a * 0.5) * 2 - i * 0.08,
    ]);
  });
  const nine = new Map<number, [number, number, number]>();
  // The nine on one tilted ellipse — an orbit of candidates, not a grid.
  top.slice(0, 9).forEach((o, i) => {
    const a = (i / 9) * Math.PI * 2 + 0.35;
    nine.set(o.index, [
      FINALS_HUB[0] + Math.cos(a) * 8.5,
      FINALS_HUB[1] + 1.4 + Math.sin(a) * 3.4,
      FINALS_HUB[2] + 1 + Math.sin(a) * 3.2,
    ]);
  });
  // Direction 01 left, 02 centre-back (the one), 03 right.
  const [first, second, third] = top;
  const three = new Map<number, [number, number, number]>([
    [second.index, [FINALS_HUB[0] - 7.5, FINALS_HUB[1] + 0.8, FINALS_HUB[2] + 1]],
    [first.index, [FINALS_HUB[0], FINALS_HUB[1] + 4.2, FINALS_HUB[2] - 7]],
    [third.index, [FINALS_HUB[0] + 7.5, FINALS_HUB[1] - 1.1, FINALS_HUB[2] - 0.5]],
  ]);

  return {
    opportunities,
    rendered: renderedList,
    connections,
    finalists: [second.index, first.index, third.index],
    winner: first.index,
    formations: { spiral, nine, three },
  };
}

function dist(a: readonly number[], b: readonly number[]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
