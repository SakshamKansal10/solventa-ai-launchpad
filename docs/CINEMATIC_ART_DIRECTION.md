# Cinematic art direction — "Precision in motion"

Industrial sculpture × computational design × optical technology. Darkness is a material.
Nothing glows for its own sake; objects read through geometry, material and light.

## Palette (sRGB; tuned under lighting)
| Role | Hex | Where |
|---|---|---|
| Environmental black | `#070B13` | background, fog, scrims |
| Midnight | `#101B2B` | structure (spine, seeds) |
| Atmospheric navy | `#192536` | sky gradient top |
| Warm pearl | `#F1EEE6` (rendered `#E7E1D3`) | ceramic; on-screen copy |
| Champagne metal | `#C4A67A` | inlays, collars, frames |
| Gold filament | `#D9B97F` (capped energy) | the connective language |
| Restrained violet | `#75668F` / glow `#9C8BC4` | internal intelligence only |

## Materials (`world/materials.ts`)
- **Pearl ceramic** — physical: roughness 0.5, clear-coat 0.42, faint sheen (standard on LOW).
- **Champagne metal** — metalness 1, roughness 0.26; reads only because of the studio
  environment (RoomEnvironment → PMREM, intensity 0.38).
- **Optical glass** — 9% body, strong clear-coat reflections; provisional architecture uses 20%.
- **Dissolve variants** — per-instance alpha (alpha-hashed ceramic): glass ↔ ceramic in place.
- **Energy / violet** — unlit, tinted per instance; never floods the frame.

## Geometry vocabulary
- Swept profiles (`geometry/sweep.ts`): rounded-rectangle sections swept along arcs with taper
  and twist → blades, ribs, arches, collars, rims. Champagne **inlays** ride blade edges.
- **Core**: dark S-spine; upper family of shells wraps upper-left, lower family lower-right
  (the S); open negative space upper-right/lower-left; two front shells meet at a narrow slit.
- **Opportunity families** (5): studio (diamond frame + twin plates), product (pearl lens in a
  champagne rim), media (spindle + fins + collar), local (petal shell + crossed pins),
  venture (prism + metal edges). Each: dark seed, metal frame, shell, internal energy.
- **Path**: three-piece arches (legs + crown) with machined collars; crowns hover when provisional.

## The gold filament (continuity)
One GPU system (`world/filaments`): core blades → guides into the slit → universe trunks and
territory rails → nine-ring → comparison pathways → alignment with the core → path rails →
evidence signal → rebuilt rails → product chain → finale core. Curved, varied width,
information pulses, retract/grow from either end, fade near the lens and into fog.

## Lighting
Warm key from upper-left front, cool rim from behind-right, faint warm kicker from below,
low hemisphere; violet point light only inside the core. Exposure 0.7 in the void → 1.0.
Fog per scene (`world/atmosphere-keys.ts`) gives atmospheric depth without post-processing.
Post-processing: none — tone mapping (ACES) only. Bloom was rejected: it would hide geometry.

## Motion grammar
information → inward · possibilities → outward · intelligence → alignment ·
rejection → loss of energy, recession · evidence → (de)stabilisation ·
adaptation → reconfiguration · progress → increasing order.
Camera: slow dolly, controlled orbit, macro approach, pass-through, reveal pull-back.
Mouse: ≤ 0.2 units lean, damped; reduced to a quarter near close geometry; none on touch.

## Typography & copy
Cormorant Garamond for statements; Manrope small caps (mono tags) for labels; pearl on black
with a soft text shadow and edge vignette. One line at a time. Captions are aria-hidden
duplicates of the server-rendered narrative.

## Avoided on purpose
Spheres, brains, torus/ring motifs, particle backgrounds, bloom floods, hexagons, holograms,
glass cards, node spaghetti (no hub-and-spoke), constant rotation, jump cuts, shake.
