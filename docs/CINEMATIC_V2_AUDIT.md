# Cinematic homepage — Version 1 audit (baseline for Version 2)

## What this audit is based on

- **Baseline:** `review/`, also reachable as `review-v1/`. It was captured from the production build of commit `346474e` at 1440 × 900 on the high tier, with mobile frames at 390 × 844 @3× on the medium tier. The baseline is read-only.
- **Evidence, judged from pixels first:**
  - the 29 key frames
  - 9 transition triptychs
  - 9 mobile frames
  - a 2-second contact sheet of the full 6:21 walkthrough (`.e2e-tmp/review/v1-motion/`)
  - the loudness map of the live-recorded soundtrack (`.e2e-tmp/review/v1-audio-envelope.json`)
  - an unrecorded performance run on this machine (`.e2e-tmp/perf-v1-baseline.json`)
- **Grading scale:** A exceptional · B strong but improvable · C competent but visually ordinary · D weak / generic · F unacceptable. Anything below B gets a real correction.

## Measured facts

- **Performance**, unrecorded, production build, Radeon Vega 3 integrated GPU, 4 cores:

  | Run | Average fps | p95 | Worst scenes |
  |---|---|---|---|
  | high 1440 @1× | 51.7 | 33 ms | universe 38.4, computation 41.1, crisis 42.7, evidence 43.2 |
  | high @2× | 47.9 | — | awakening 26 |
  | medium | 53.7 | — | crisis 44.7, passage 45.7 |
  | low | 58.8 | — | — |
  | phone (medium, 390 @3×) | 59.2 | — | — |

  - While recording, high averaged 37 fps and dropped to 20.
  - This machine auto-selects medium.
- **Sound** (live recording, RMS): the intended silences are not silent.
  - The pre-reveal breath (passage 0.86–0.96) averages **0.20**, the *loudest* stretch of the film.
  - The selection pause (selection 0.25–0.55) averages 0.11.
  - The comparison (three 0.6–1.0) averages 0.16.
  - Before the identity (finale 0.20–0.34) there is no dip (0.055).
  - The dynamics are inverted: tension peaks exactly where the score intends breath.
- **Opening:** for the first ~10 s of the walkthrough the frame holds only the caption. The first signal appears at void 0.20.
- **Handoff:** the 3D slab's placeholder blocks show through the fading-in DOM panel (a visible double exposure).

## Scene grades

| # | Scene | Comp | Geom | Mat | Light | Cam | Motion | Scale | Type | Trans | Orig | Story | Perf |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 00 | Void / initial signal | C | C | C | C | C | C | D | B | B | C | C | A |
| 01 | Engine assembles | B | C | C | B | B | B | B | C | B | C | B | A |
| 02 | Complete Engine | B | C | C | C | C | C | B | C | – | C | B | A |
| 03 | Founder context | C | C | C | C | C | C | C | C | B | C | C | A |
| 04 | Aperture / passage | C | D | C | C | C | C | D | – | D | D | C | B |
| 05 | Universe reveal | C | C | C | C | B | C | C | C | D | C | C | C |
| 06 | Computation | C | C | C | C | B | C | B | C | B | C | C | C |
| 07–09 | 360 → 120 → 36 → 9 | B | C | C | C | B | B | B | B | B | D (nine on an ellipse) | B | B |
| 10–11 | Final three + comparison | C | B | C | C | B | C | D | B | B | B | B | B |
| 12 | Final one | B | B | C | C | C | C | B | B | B | B | B | B |
| 13 | Opportunity → path | C | B | C | D | B | B | B | – | B | B | B | B |
| 14 | Validate | C | C | C | D | C | C | C | B | C | C | C | B |
| 15 | Build | B | B | B | B | B | B | B | C | B | C | B | B |
| 16 | Elevate | B | B | C | C | B | B | B | C | B | B | B | B |
| 17 | Evidence arrives | B | B | C | B | B | B | B | B | B | B | B | C |
| 18 | Crisis | B | B | C | C | B | B | B | C | B | C | C | C |
| 19 | Adaptation | C | B | C | C | B | B | B | C | C | C | C | B |
| 20 | 3D → product | B | B | C | B | B | C | B | B | D | B | B | A |
| 21 | Founder OS | B | – | B | B | C | C | – | B | – | B | B | A |
| 22 | Return of intelligence | C | C | C | C | B | C | C | B | C | C | B | A |
| 23 | S signature | B | C | C | B | B | B | C | B | B | C | B | A |
| 24 | Finale / CTA | B | – | B | B | B | B | C | B | B | B | B | A |

Nothing is A. The Engine, the aperture, the universe reveal, the handoff and the sound dynamics hold the experience back most.

## Findings, by scene

### Opening
- **Too empty for too long:** about 10 s of near-black with only the caption.
- **Signals are specks:** they are tiny and there are no depth cues, so the frame reads as dark, not deep.
- **Channels:** the hairline S-curved channels are a good idea but appear late.

### Engine (top priority)
- **Extruded letter:** the crescents read as an extruded letter, with uniform thickness, a flat face and a simple bevel. The navy-slate is one flat material; nothing tells you it is machined.
- **Kernel:** violet glass boxes. From the front and in the finale they read as two rounded rectangles, the "blocky" kernel the brief rejects.
- **Still-frame test (no glow):** it would not survive. The silhouette is the S, but the object is not yet an expensive machine.

### Assembly
- **Good:** the near-lens fly-past.
- **Bad:** the wafers arrive as large flat violet panels (0:32 of the walkthrough).
- **Ending:** the activation has no sense of "earned" order. It goes straight into a long, mostly static hold (≈ 10 s).

### Context
- **Too small:** the six mechanisms are distinct in code but small and thin on screen. The visitor sees thin lines and labels, not six kinds of constraint.
- **No visible response:** the machine does not visibly respond differently to each.

### Aperture → universe (must become one of the best moments)
- **Not an aperture:** the camera flies between two violet boxes, then through ~6 s of near-black, then the universe pops in already cluttered.
- **No scale illusion:** no "small detail" ever becomes "impossibly large".
- **Sound:** loud where it should breathe.

### Universe and computation
- **Too busy:** many small modules with tick-lines, labels, and a general grey density.
- **Territories:** they exist but their silhouettes don't dominate, and depth separation is weak.
- **Computation reads as lights changing:** nothing physically reorganises.
- **Typography:** labels small; one sits just under the nav at 1440 × 900.

### Narrowing and nine
- **36 → 9:** the 36 board is readable.
- **The nine:** literally nine objects on an ellipse, which the brief rejects.

### Final three
- **Small, not monumental:** in the comparison overview the three occupy little of the frame. The winner is the dimmest object.
- **Comparison:** the six-signal arcs read as decorative arches; the readouts carry the meaning.
- **Noise:** the floor ring and arc add background noise.
- **Sound:** loud, where it should drop into near-silence.

### Final one
- **The S-echo:** good.
- **Cheapness:** vertical "puppet string" filaments above the winner, crossing lines at the frame edge, and fragments of the rejected structures still visible.

### Opportunity → path
- **Good:** a genuine physical unfold.
- **Problem:** it happens in dark grey, so the transformation is murky. 15-roadmap is the darkest, lowest-contrast frame of the film.
- **Gold pathway:** it doesn't visibly become the road.

### Validate / Build / Elevate
- **Validate:** the same spiral tunnel as the unfold, dark, with faint probes. It has no spatial psychology of uncertainty.
- **Build:** clear, but a long uniform corridor.
- **Elevate:** now reads as a network from altitude; the branch rails are faint.

### Evidence / crisis / adaptation
- **Evidence:** clean.
- **Crisis:** wobble is visible, but the consequence isn't framed. The alternative routes are faint and the camera doesn't reveal what failed downstream.
- **Adaptation:** frames rotate, but the rebuild isn't legible as reuse. Gold reconnection, milestones moving and the chosen alternative becoming the road are weak or invisible.

### Handoff and product
- **Double exposure:** the 3D placeholder layout shows through the DOM as it fades in. This is the opposite of "almost impossible to notice".
- **Pacing:** the product holds ≈ 16 s with little change.

### Return, signature, finale
- **Return:** the pathways-converge idea works. The frames in between are sparse.
- **S size:** the finale S is small on desktop (≈ 15 % of frame height).
- **Sound:** there is no breath before the identity.
- **Footer:** at the very bottom the S is cropped under the nav.

### Mobile
- **Final three:** small and dim behind their labels.
- **Nav:** a milestone capsule passes behind the nav buttons, and the sound pill crowds the wordmark.
- **Product:** the panel's content runs below its visible area.
- **Finale S:** it fills the frame acceptably.

### Typography
- **Captions over hero geometry** in 03, 04, 17, 18, 21 and 23.
- **Nav shift:** enabling sound shifts the centre nav links by ≈ 50 px.

### Cheapness list (remove or refine)
- port tick-lines on every universe module
- connection spaghetti in the overlook
- puppet strings above the winner
- random crossing filaments at frame edges
- violet box wafers
- the flat navy plastic look of the S
- the long black stretch in the passage
- the double-exposure handoff
- ghost fragments in the final one

## Version 2 programme, in order of impact

1. **S Engine:** machined, domed and tapered channel shells with chamfers, a midline groove and seams; a lens and iris optical kernel whose closed iris is the logo's warm counter light.
2. **Aperture → universe:** the iris opens, the camera passes through the lens barrel (rings pass the lens, FOV compression), a pinpoint grows, and the universe reveals at impossible scale. True silence first.
3. **Final three / one:** monumental scale, a dark empty background, spatial comparison, real near-silence and slow loss of coherence; remove strings and ghosts.
4. **Opportunity → path:** the gold pathway becomes the road; light the unfold; give Validate its own provisional, open space.
5. **Crisis and adaptation:** frame the consequence; make the rebuild visibly reuse the old architecture (rails detach and reattach, milestones travel, the alternative becomes the road, gold reconnects).
6. **Handoff:** the DOM is the slab's face from the first legible moment, so there is no double exposure; check for pops at all sizes.
7. **Universe:** de-noise (ticks, connections), stronger silhouettes and depth separation; computation that physically reorganises; the nine as a decision structure.
8. **Opening:** an earlier signal, depth cues and micro-reflections.
9. **Finale:** a larger S, a breath before the identity, a CTA in the film's material language, and the footer state.
10. **Sound:** make the silences real (effective master dips), comparison pulses left / centre / right, and less busy overall.
11. **Camera:** eased arrivals and departures, deliberate stops.
12. **Mobile:** a separate shot list.
13. **Performance:** universe, computation and path scenes on high; the tier policy.
14. **Typography and captions** against the hero geometry.
