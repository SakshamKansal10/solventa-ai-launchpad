import { mulberry32 } from "../../math";
import { FINALS_HUB, latticeNode, type V3 } from "../layout";
import { fits, score, worstFit, type Fits, type OpportunityAttributes } from "./scoring";

/**
 * The Opportunity Universe as DATA — deterministic, art-directed, testable.
 *
 * "The Strategic Intelligence Constellation": 360 logical opportunities (five
 * families of engineered decision modules) living on the monumental architecture
 * of five territories — Capability alignment, Capital feasibility, Market access,
 * Execution complexity, Emerging possibilities. These are visual categories of the
 * illustrative demonstration, not claims about real analysis. Ranking by the
 * illustrative score gives each opportunity the stage at which it falls away:
 * 360 → 120 → 36 → 9 → 3 → 1.
 */
export const LOGICAL_COUNT = 360;

const TERRITORY_SCALE: Record<TerritoryId, number> = {
  A: 1.35,
  B: 1.45,
  C: 1.55,
  D: 2.0,
  E: 2.1,
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

export type TerritoryId = "A" | "B" | "C" | "D" | "E";

/**
 * A territory is a visual CATEGORY of the illustrative demonstration (never a claim
 * about real analysis): one dominant architecture (built by Territories.tsx), the
 * modules that live on it (pattern, territory-local; rotated by `yaw`), and how it
 * routes information.
 */
export interface Territory {
  id: TerritoryId;
  name: string;
  centre: V3;
  /** Rotation about y, so the architecture faces the camera's path. */
  yaw: number;
  mix: [FamilyIndex, number][];
  /** How many of its modules sample the high-value (excellent) range. */
  excellent?: number;
  pattern: (i: number, n: number, rand: () => number) => [number, number, number];
}

/** Capability Alignment — the matrix wall: shelves of ordered modules. */
export const WALL = { cols: 11, rows: 8, dx: 1.75, dy: 1.55, hw: 10.6, hh: 7.1 } as const;
/** Capital Feasibility — stepped terraces, ordered by capital required (low → high). */
export const TERRACE = {
  levels: 5,
  perLevel: 14,
  dx: 1.05,
  rise: 2.6,
  step: 2.5,
  hw: 7.8,
  hd: 2.3,
} as const;
/** The terrace boundary the founder's ₹50,000 sits on (between these two levels). */
export const CAPITAL_THRESHOLD_LEVEL = 1.5;
/** Market Access — a routing ring with distributed stations. */
export const RING = { radius: 12.5, stations: 8, perStation: 10 } as const;
/** Execution Complexity — layered dependency planes deep in the atmosphere. */
export const LAYERS = {
  count: 5,
  cols: 6,
  rows: 3,
  dx: 2.7,
  dy: 3.1,
  gap: 4.4,
  hw: 8.8,
  hh: 5.6,
} as const;
/** Emerging Possibilities — a sparse horizon arc. */
export const HORIZON = { radius: 14, span: 2.5 } as const;

export const TERRITORIES: Territory[] = [
  {
    id: "A",
    name: "Capability alignment",
    centre: [-17, 2, -27],
    yaw: 0.55,
    mix: [
      [0, 30],
      [2, 30],
      [1, 28],
    ],
    pattern: (i) => {
      const col = i % WALL.cols;
      const row = Math.floor(i / WALL.cols) % WALL.rows;
      return [
        (col - (WALL.cols - 1) / 2) * WALL.dx,
        (row - (WALL.rows - 1) / 2) * WALL.dy,
        0.75 + (col % 2) * 0.45,
      ];
    },
  },
  {
    id: "B",
    name: "Capital feasibility",
    centre: [17, 5, -37],
    yaw: -0.5,
    mix: [
      [4, 30],
      [3, 24],
      [1, 16],
    ],
    // `i` is the rank by capital required: the cheapest sit on the lowest, nearest level.
    pattern: (i) => {
      const level = Math.floor(i / TERRACE.perLevel);
      const k = i % TERRACE.perLevel;
      return [
        (k - (TERRACE.perLevel - 1) / 2) * TERRACE.dx,
        (level - 2) * TERRACE.rise + 0.85,
        -level * TERRACE.step,
      ];
    },
  },
  {
    id: "C",
    name: "Market access",
    centre: [3, -12.5, -32],
    yaw: 0.2,
    mix: [
      [3, 40],
      [2, 30],
      [0, 10],
    ],
    pattern: (i) => {
      const station = i % RING.stations;
      const k = Math.floor(i / RING.stations);
      const a = (station / RING.stations) * Math.PI * 2 + Math.PI / RING.stations;
      const r = RING.radius + (station % 2 ? 2.6 : -2.6) + ((k % 2) - 0.5) * 1.3;
      const along = (Math.floor(k / 2) - 2) * 1.35;
      return [
        Math.cos(a) * r - Math.sin(a) * along,
        0.6 + (k % 2) * 0.5,
        Math.sin(a) * r + Math.cos(a) * along,
      ];
    },
  },
  {
    id: "D",
    name: "Execution complexity",
    centre: [-3, 6, -74],
    yaw: 0.2,
    mix: [
      [4, 54],
      [1, 24],
      [3, 12],
    ],
    pattern: (i) => {
      const layer = i % LAYERS.count;
      const k = Math.floor(i / LAYERS.count);
      const col = k % LAYERS.cols;
      const row = Math.floor(k / LAYERS.cols) % LAYERS.rows;
      return [
        (col - (LAYERS.cols - 1) / 2) * LAYERS.dx,
        (row - (LAYERS.rows - 1) / 2) * LAYERS.dy,
        (layer - (LAYERS.count - 1) / 2) * LAYERS.gap + 0.4,
      ];
    },
  },
  {
    id: "E",
    name: "Emerging possibilities",
    centre: [7, -0.5, -41],
    yaw: 0,
    mix: [
      [0, 16],
      [1, 16],
    ],
    excellent: 24,
    pattern: (i, n) => {
      // Spread along the horizon arc, alternately above and below it — sparse and open.
      const t = (i + 0.5) / n;
      const a = (t - 0.5) * HORIZON.span;
      const r = HORIZON.radius - (i % 3) * 1.4;
      return [Math.sin(a) * r, ((i * 7) % 5) * 0.9 - 1.6, -Math.cos(a) * r + HORIZON.radius * 0.72];
    },
  },
];

const TAU = Math.PI * 2;

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
    /** The nine's lattice links (opportunity index pairs): up each column, then across the heads. */
    nineLinks: [number, number][];
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
    const sampled = families.map((family, i) => {
      const range = i < (territory.excellent ?? 0) ? EXCELLENT : FAMILIES[family].range;
      return {
        family,
        attrs: sampleAttrs(range, rand),
        tilt: [rand() * TAU, rand() * TAU, rand() * TAU] as [number, number, number],
        size: rand(),
      };
    });
    // Capital Feasibility is ORDERED by capital required: the cheapest on the lowest level.
    const order = sampled.map((_, i) => i);
    if (territory.id === "B")
      order.sort((x, y) => sampled[x].attrs.capitalInr - sampled[y].attrs.capitalInr);
    // The emerging region interleaves the excellent with the rest along its arc.
    if (territory.id === "E") order.sort((x, y) => ((x * 5) % n) - ((y * 5) % n));
    const cy = Math.cos(territory.yaw);
    const sy = Math.sin(territory.yaw);
    order.forEach((slot, i) => {
      const { family, attrs, tilt, size } = sampled[slot];
      const off = territory.pattern(i, n, rand);
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
          territory.centre[0] + off[0] * cy + off[2] * sy,
          territory.centre[1] + off[1],
          territory.centre[2] - off[0] * sy + off[2] * cy,
        ],
        tilt,
        // Engineered forms must read at distance: larger in sparse and deep territories.
        size: (0.85 + size * 0.4) * TERRITORY_SCALE[territory.id],
      });
    });
  }

  const byScore = [...opportunities].sort((a, b) => b.score - a.score || a.index - b.index);
  byScore.forEach((o, i) => {
    o.rank = i + 1;
    o.stage = stageForRank(o.rank);
  });

  // Rendered subset: every survivor of 120 → 36 always; the rest sampled evenly.
  const rendered = new Set<number>();
  for (const o of opportunities) if (o.rank <= 36) rendered.add(o.index);
  const remaining = Math.max(0, Math.min(renderCount, LOGICAL_COUNT) - rendered.size);
  const others = opportunities.filter((o) => o.rank > 36);
  const step = others.length / Math.max(1, remaining);
  for (let i = 0; i < remaining; i++) rendered.add(others[Math.floor(i * step)].index);
  const renderedList = [...rendered].sort((a, b) => a - b);

  // Routing — sparse and HIERARCHICAL, shaped by each territory's architecture: one trunk
  // from the core per territory, then its own routing (shelves, levels, ring stations,
  // dependency layers, the horizon). Nothing is connected to everything.
  const connections: Connection[] = [];
  const isRendered = (i: number) => rendered.has(i);
  const link = (a: Opportunity, b: Opportunity, width: number) =>
    connections.push({ a: a.index, b: b.index, kind: "branch", width, phase: rand() });
  const chain = (list: Opportunity[], width: number, closed = false) => {
    for (let i = 0; i < list.length - 1 + (closed ? 1 : 0); i++)
      link(list[i], list[(i + 1) % list.length], width);
  };
  for (const territory of TERRITORIES) {
    const members = opportunities.filter(
      (o) => o.territory === territory.id && isRendered(o.index),
    );
    if (!members.length) continue;
    // The trunk lands on the territory's best module: value routes the system.
    const hub = members.reduce((best, o) => (o.score > best.score ? o : best));
    connections.push({ a: -1, b: hub.index, kind: "trunk", width: 0.024, phase: rand() });
    const by = (key: (o: Opportunity) => number) => {
      const groups = new Map<number, Opportunity[]>();
      for (const o of members) groups.set(key(o), [...(groups.get(key(o)) ?? []), o]);
      return [...groups.values()];
    };
    switch (territory.id) {
      case "A":
        // Along every other shelf, and one vertical spine through the matrix.
        for (const row of by((o) => Math.floor(o.local / WALL.cols) % WALL.rows))
          if (Math.floor(row[0].local / WALL.cols) % 2 === 0) chain(row, 0.024);
        chain(
          members.filter((o) => o.local % WALL.cols === 5),
          0.03,
        );
        break;
      case "B":
        // One rail per level; the levels are climbed at one end only (a constraint).
        for (const level of by((o) => Math.floor(o.local / TERRACE.perLevel))) chain(level, 0.024);
        chain(
          members.filter((o) => o.local % TERRACE.perLevel === 0),
          0.03,
        );
        break;
      case "C": {
        // Each station's modules link to it; the stations link round the ring.
        const stations = by((o) => o.local % RING.stations);
        for (const st of stations) chain(st.slice(0, 4), 0.022);
        chain(
          stations.map((st) => st[0]),
          0.034,
          true,
        );
        break;
      }
      case "D": {
        // Dependencies: across layers, module to the same module one layer deeper.
        const layers = by((o) => o.local % LAYERS.count);
        for (const layer of layers)
          chain(
            layer.filter((_, k) => k % 2 === 0),
            0.02,
          );
        for (const o of members) {
          if (o.local % 3 !== 0) continue;
          const deeper = members.find((m) => m.local === o.local + 1);
          if (deeper) link(o, deeper, 0.022);
        }
        for (let s4 = 0; s4 < 3; s4++) {
          const end = members[members.length - 1 - s4 * 7];
          if (!end) continue;
          connections.push({
            a: end.index,
            b: -2,
            kind: "dark",
            width: 0.045,
            phase: rand(),
            far: [
              end.rest[0] + 30 + s4 * 8,
              end.rest[1] + (s4 - 1) * 9,
              end.rest[2] - 70 - s4 * 15,
            ],
          });
        }
        break;
      }
      case "E": {
        // A calm ring through the sparse region, ordered along the horizon.
        const ring = [...members].sort((x, y) => x.local - y.local);
        chain(ring, 0.04, true);
        break;
      }
    }
  }

  // Formations for the survivors.
  const top = byScore;
  // 120 → 36: a ranked DECISION BOARD along one axis — three rows, the strongest at the centre.
  const spiral = new Map<number, [number, number, number]>();
  top.slice(0, 36).forEach((o, i) => {
    const row = i % 3;
    const k = Math.floor(i / 3);
    const col = k % 2 ? 6 + Math.ceil(k / 2) : 6 - Math.ceil(k / 2);
    const x = (col - 6) * 1.95;
    spiral.set(o.index, [
      CONVERGE_ANCHOR[0] + x,
      CONVERGE_ANCHOR[1] + (row - 1) * 2.1,
      CONVERGE_ANCHOR[2] - 1 + Math.abs(x) * 0.18,
    ]);
  });
  // The nine as a DECISION LATTICE: three columns standing where the three futures will appear,
  // each headed by a finalist with its two nearest rivals ranked beneath it. Each column then
  // resolves into one future.
  const nine = new Map<number, [number, number, number]>();
  const headCol = [1, 0, 2];
  const columns: number[][] = [[], [], []];
  top.slice(0, 9).forEach((o, i) => {
    const col = headCol[i % 3];
    const row = Math.floor(i / 3);
    columns[col].push(o.index);
    nine.set(o.index, latticeNode(col, row));
  });
  const nineLinks: [number, number][] = [];
  for (const c of columns) nineLinks.push([c[2], c[1]], [c[1], c[0]]);
  nineLinks.push([columns[0][0], columns[1][0]], [columns[1][0], columns[2][0]]);
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
    formations: { spiral, nine, nineLinks, three },
  };
}
