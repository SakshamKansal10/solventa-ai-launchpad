# Blocked

Items that need the owner, a key or a tool not available in this session.

## Cinematic: "missing graphics" on the owner's laptop (not reproduced)
The 21-scene comparison of the live site and HEAD (lite) at 1440×900 on an integrated Radeon
Vega 3 shows no element missing (part2-perf.md, Part 2c; images in docs/redesign/perf/scenes/).
**Owner:** please send, from the preview on the laptop: (1) a screenshot of a scene where
something is missing, (2) `document.querySelector('[data-testid=cinematic-home]').dataset` from
the console (mode and tier), (3) the screen size. Likely causes: the still version below 768px or
on < 4 cores / < 4 GB (by design); 1px filaments shimmering without MSAA at a low pixel ratio.

## Cinematic: one ~267 ms frame per scroll pass (lite, Vega 3)
Seen in both 2c runs, with and without a notch step, unthrottled and at 4×; not a long task
over 50 ms on the main thread (so GPU-side or compositor). Not yet traced; next step would be a
GPU trace around the pass reversal.
