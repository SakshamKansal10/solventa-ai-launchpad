/**
 * The Solventia S — traced from the real brand mark (src/assets/solventia-mark.png) by
 * .e2e-tmp/trace-mark.mjs, so the cinematic emblem is the logo, engineered — never an invented
 * symbol. The mark is two point-symmetric crescent channels facing each other across a lit
 * counter. These are the UPPER channel's edges, from its sharp tip to its far end:
 *   OUTER — the convex edge (over the top), INNER — the concave edge that faces the counter.
 * Units: the full S is 2 tall, centred on its point of symmetry, y up. The lower channel is
 * the same shape rotated 180° about the origin.
 */
export type P2 = readonly [number, number];

const RAW_OUTER: readonly P2[] = [
  [-0.2123, -0.3165],
  [-0.2658, -0.3003],
  [-0.2962, -0.2575],
  [-0.3435, -0.2238],
  [-0.3904, -0.1895],
  [-0.4353, -0.1527],
  [-0.48, -0.1157],
  [-0.5195, -0.0731],
  [-0.5567, -0.0285],
  [-0.5882, 0.0202],
  [-0.6152, 0.0715],
  [-0.6359, 0.1256],
  [-0.6505, 0.1818],
  [-0.6603, 0.239],
  [-0.6639, 0.2968],
  [-0.6603, 0.3547],
  [-0.6521, 0.4121],
  [-0.6376, 0.4681],
  [-0.6191, 0.5231],
  [-0.5961, 0.5764],
  [-0.5672, 0.6269],
  [-0.5353, 0.6753],
  [-0.5001, 0.7215],
  [-0.4595, 0.763],
  [-0.4184, 0.804],
  [-0.3734, 0.8408],
  [-0.3243, 0.8715],
  [-0.2733, 0.8993],
  [-0.2216, 0.9256],
  [-0.1677, 0.9472],
  [-0.1129, 0.9659],
  [-0.0568, 0.9808],
  [0.0002, 0.9913],
  [0.0579, 0.998],
  [0.1158, 1],
  [0.1739, 1],
  [0.232, 1],
  [0.2901, 1],
  [0.3482, 1],
  [0.4063, 1],
  [0.4644, 1],
  [0.5225, 1],
  [0.5806, 1],
  [0.6378, 0.9946],
];

const RAW_INNER: readonly P2[] = [
  [-0.2123, -0.3165],
  [-0.2332, -0.2808],
  [-0.2559, -0.2458],
  [-0.2787, -0.2109],
  [-0.2816, -0.1701],
  [-0.2831, -0.1288],
  [-0.2863, -0.0873],
  [-0.2926, -0.0461],
  [-0.2908, -0.0048],
  [-0.2863, 0.0366],
  [-0.2856, 0.0782],
  [-0.273, 0.1178],
  [-0.2632, 0.1583],
  [-0.2506, 0.1979],
  [-0.235, 0.2361],
  [-0.2167, 0.2734],
  [-0.1964, 0.3095],
  [-0.1742, 0.3447],
  [-0.1479, 0.377],
  [-0.1201, 0.4082],
  [-0.0982, 0.4434],
  [-0.0738, 0.4767],
  [-0.0453, 0.5069],
  [-0.0103, 0.5295],
  [0.0245, 0.5526],
  [0.06, 0.5744],
  [0.0933, 0.5994],
  [0.1267, 0.6242],
  [0.1626, 0.6455],
  [0.1981, 0.6674],
  [0.2337, 0.6892],
  [0.2699, 0.7099],
  [0.3055, 0.7317],
  [0.3406, 0.7542],
  [0.3768, 0.7749],
  [0.4118, 0.7975],
  [0.4478, 0.8186],
  [0.483, 0.841],
  [0.5182, 0.8634],
  [0.5542, 0.8844],
  [0.5908, 0.9044],
  [0.6258, 0.927],
  [0.6517, 0.9586],
  [0.6378, 0.9946],
];

/**
 * The trace is pixel-accurate, so it carries the PNG's stair-step noise. A few passes of
 * neighbour averaging (tips pinned) keep the mark's exact shape while giving machined surfaces
 * a clean, continuous edge.
 */
function smooth(chain: readonly P2[], passes = 10): readonly P2[] {
  let pts = chain.map(([x, y]) => [x, y] as [number, number]);
  for (let k = 0; k < passes; k++) {
    pts = pts.map((p, i) =>
      i === 0 || i === pts.length - 1
        ? p
        : ([
            0.25 * pts[i - 1][0] + 0.5 * p[0] + 0.25 * pts[i + 1][0],
            0.25 * pts[i - 1][1] + 0.5 * p[1] + 0.25 * pts[i + 1][1],
          ] as [number, number]),
    );
  }
  return pts;
}

export const S_OUTER: readonly P2[] = smooth(RAW_OUTER);
export const S_INNER: readonly P2[] = smooth(RAW_INNER);
