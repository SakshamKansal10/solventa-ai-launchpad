# Cinematic art direction — "Intelligent luxury · precision futurism · computational architecture"

The film is the mind of Solventia at work: it understands a founder, simulates hundreds of
futures, eliminates weak ones, constructs a path, learns from evidence, adapts, and becomes a
real product. The futuristic feeling comes from precision, materials, logic and restraint —
never from neon, HUDs, particles or glitches. Darkness is a material.

## Anti-biology rule (what changed in the 2026-10-07 pass)
Every curved, tapered, repeated form that could read as bone, rib, vertebra, petal, fin or
helix was removed. The world is now built from straight runs, precise radii and chamfered
edges.

| Before (removed) | Read as | Now |
|---|---|---|
| Core: pearl curved blades in an S around a dark "spine" with collars | ribs, spine, vertebrae | six nested **gimballed titanium frames** around a smoked-glass **kernel** with a computational lattice |
| Context: "skills strands", "access tree" | hair, roots | a lit 3×3 **skill matrix**; a **connector array** (2 of 5 channels live) |
| Universe: "petal shell", "spindle with fins" | flower, fish | **diamond frame on a locator pin**; **portrait channel frame** with signal bars |
| Final three: fan of vanes, rib helix, nest of twisting arches | fins, DNA, rib cage | **strata tower** (vertical), **orbital array** (radial), **nest of portal frames** (the winner) |
| Path: tunnel of white three-piece arches | rib cage | **machined portal gates** (4 corner brackets + 4 bars) over a deck |
| Product token "arch" | rib | a small **portal gate** |

## The structural primitive (`world/geometry/frames.ts`)
One machined, rounded-rectangle **frame** (extruded, chamfered) — plus its corner bracket,
inlay strip and solid plate — builds the core's gimbal, the winning direction, every gate, the
satellite channels, the product bezel and the finale emblem. One vocabulary = one system.

## Materials — each one means something (`world/materials.ts`)
| Material | Hex | Meaning |
|---|---|---|
| Dark titanium (metal 0.92, rough 0.3, clear-coat) | `#5A606B` | technology, precision, structure |
| Graphite | `#1B2029` | engineered mass: kernels, seeds, decks |
| Smoked optical glass (front-faced, single pass) | `#3A4458`, 22 % | uncertainty, latent possibility |
| Provisional glass (light) | `#9AA6C2`, 20 % | an untested plan (Validate, crisis) |
| Pearl ceramic — used sparingly | `#E7E1D3` | clarity, resolution (confident nodes, milestones, deck track) |
| Champagne gold metal / gold hairline | `#C4A67A` / `#F2D49A` | value, selection, the winning direction |
| Indigo-violet energy | `#8B7FF2` / `#7D6FF0` | intelligence, computation, active reasoning |
| Environmental black / midnight | `#070B13` / `#101B2B` | the space |

Dissolves are per instance (alpha in `instanceColor.r`): titanium ↔ provisional glass in place.

## Scene language
- **Engine (core):** gimbal frames f1–f6 (alternating y/x axes, pinned with gold-collared pins),
  machined index marks on f1/f3, gold inlays on f2/f4/f6, six input ports on f1, a kernel of two
  smoked halves holding a 4×3×3 lattice with violet inference traces and one quiet gold "S".
  Micro-motion: the locked gimbal breathes by fractions of a degree.
- **Universe:** five families of framed decision objects; each node has a graphite kernel, a
  titanium frame, a resolution surface (smoked → pearl) and a **confidence light** (indigo while
  computing → gold when it fits). Hierarchy from territory scale, light and filament density.
- **Path:** Validate = open corners, bars hanging in light glass, violet probes testing ahead,
  hairline rails. Build = bars slide in and lock, logic locks turn gold, a graphite deck with a
  pearl track assembles. Elevate = the path climbs; every gate grows satellite channels at
  altitude, interconnected; vast frames open far out.
- **Product:** a dark Founder OS (system bar, founder-context rail with model weights, learning
  log, selection trace 360 → 1, founder-fit pips, roadmap, current move, evidence timeline) on a
  graphite slab with a titanium bezel.
- **Finale:** the engine resolves into a calm nested-square emblem with gold hairlines.

## The gold filament (continuity)
One GPU system (`world/filaments`): void signals → port channels (width = signal weight) →
the signal path through the gimbal pivots → violet inference in the kernel → universe trunks and
territory structure → context waves (violet) → nine-ring → comparison layer (pathways + six fit
signals per future; failing signals retract) → alignment with the core → rails (hairline →
structured) → probes → satellite links → evidence → rebuilt rails → product chain → finale.

## Light and suspense
Warm key upper-left, cool rim behind-right, warm kicker below, low hemisphere, RoomEnvironment
reflections; one violet point light inside the kernel (always present — intensity only).
Exposure is staged (`world/atmosphere-keys.ts`): it dims and narrows before each reveal and
lands precision light with the payoff (passage → universe, three → one, crisis → adaptation,
handoff, return → finale). No bloom, no post-processing; ACES tone mapping only.

## Typography
Dual system: **Cormorant Garamond** (editorial serif) for statements, the finale line and the
chosen direction's name; **Geist / Geist Mono** (technical) for signals, weights, states,
labels and the whole product OS. Geist is loaded and scoped to the experience only
(`routes/cinematic.tsx`) — the shared footer keeps its fonts.

## Navigation
Cinematic-only bar. It recedes during the deepest sequences (`--immerse`, never below AA
contrast), restores instantly on hover / keyboard focus, and returns fully for the product and
the finale. A discreet sound toggle sits beside Sign In.

## Sound (`sound/`)
Synthesised live with the Web Audio API — no audio files. Layers: ambient bed (low partials +
air through a slowly breathing low-pass), low tension (beating sub tones), spatial pad (open D
chord, stereo width by scene), computation ticks, a soft forward pulse on the path. Cues:
activation bell, fly-by air, mechanical locks, signal pings, aperture clicks, kernel unlock,
universe reveal swell, wave tones, narrowing intervals, a held breath then a restrained
resolution for the one, unfold, phase-specific gate voices (glass ping / mechanical lock /
wide pluck), a clean evidence bend (never an alarm), a rerouting arpeggio, a grounded handoff
tone, chain pings, and the finale chord. The score (`sound/score.ts`) is pure data over scroll
progress; cues play only while travelling forward. Off by default; starts only from a user
gesture; preference kept for the visit; never required for meaning.

## Avoided on purpose
Bones/ribs/petals/helices/organic silhouettes, glowing balls, particle backgrounds, bloom
floods, hexagons, holograms, HUD frames, glitches, scanlines, cyberpunk neon, fake data,
constant rotation, jump cuts, shake.
