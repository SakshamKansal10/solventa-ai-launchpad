# Cinematic surprise map

The homepage is one continuously transforming system. Each major transition lets the visitor
form an expectation, then reveals a deeper capability of the SAME environment.
Pattern: **setup → comfort → hidden clue → anticipation (darkness, silence, compression) →
transformation → reveal**. All eight are implemented in `/cinematic` (local).

---

## 1. Engine → Universe (object → system → world)
| | |
|---|---|
| **Visitor believes** | The Engine is one finished machine — a gimbal of titanium frames around a lit kernel — to admire from outside. |
| **Hidden clue** | Its layers are concentric and pinned on alternating axes: they could line up. Each founder signal already turned one of them. |
| **Anticipation** | The gimbal aligns outer → inner with mechanical clicks, the pins retract, the frames slide back into a narrowing square tunnel; aperture hairlines light one by one down it; exposure and sound close in (low tension, filter shut). |
| **Transformation** | The camera squeezes through the tunnel and between the parting kernel halves; darkness; faint horizon lines far ahead. |
| **Reveal** | The lens opens to 50° on an environment vastly larger than the machine: the opportunity universe; the sound releases into a wide pad. |
| **Meaning** | Solventia is not a tool you look at — you enter its intelligence. |
| **Code** | `world/core/core-design.ts` (frames, `TELESCOPE`), `core-motion.ts` (`enginePose`: align, pins, telescope, part, lit, hint), `camera-keys.ts` (passage), `atmosphere-keys.ts`, `sound/score.ts`. |

## 2. Universe → Order (endless → controllable)
| | |
|---|---|
| **Visitor believes** | An enormous, open-ended field of possibilities. |
| **Hidden clue** | Six context waves (violet) roll through; every node's confidence light shifts as each passes; information ticks. |
| **Transformation** | Low-fit territories lose energy and recede; whole families retract; survivors' shells resolve from smoked glass to pearl; the territories fold inward. |
| **Reveal** | 360 → 120 → 36 → 9: the nine on one ordered orbit, each step marked by a narrowing interval. |
| **Meaning** | Your context turns overwhelming possibility into a reasoned shortlist. |
| **Code** | `world/universe/scoring.ts`, `universe-model.ts`, `universe-state.ts`, `families.ts`, `OpportunityUniverse.tsx`. |

## 3. Three → One (three futures, compared at once)
| | |
|---|---|
| **Visitor believes** | Three separate future architectures — a strata tower, a nest of frames, an orbital array — each could be its own world; the camera visits them one by one. |
| **Hidden clue** | Gold pathways and the founder's six fit signals start running into all three while the camera is still visiting. |
| **Anticipation** | Light withdraws to the decision; the sound narrows to a held breath (master dips). |
| **Transformation** | On Directions 01 and 03 the signals that cannot hold retract; their pieces separate, titanium turns to glass, lights go out. Direction 02 keeps every signal and becomes the most ordered system in view. |
| **Reveal** | A restrained resolution tone; one structure, one line — "One direction worth testing." |
| **Meaning** | Solventia evaluates directions together and commits to one worth testing. |
| **Code** | `world/path/Finalists.tsx` (`FAILS`, comparison layer), `path-model.ts` (chosen solidity), `sound/score.ts` (`MASTER`). |

## 4. Opportunity → Roadmap (the future becomes the path)
| | |
|---|---|
| **Visitor believes** | The winner is a finished sculpture of nested, twisting portal frames. |
| **Hidden clue** | The frames are concentric — a compressed tunnel — exactly the shape of the Engine's aligned aperture. |
| **Transformation** | The camera orbits to its side and turns; the frames untwist and telescope out along the path, one after another, and become gates; more gates rise ahead. |
| **Reveal** | The visitor is travelling through the path made of that opportunity. |
| **Meaning** | A direction is only valuable when it becomes an executable path. |
| **Code** | `path/path-model.ts` (`gateState`, `sculptureFrame`), `path/ExecutionPath.tsx`, `camera-keys.ts` (unfold). |

## 5. Roadmap → Evidence crisis (the future was never fixed)
| | |
|---|---|
| **Visitor believes** | The path is confident: gates locked in Build, the network climbed and branched in Elevate. |
| **Hidden clue** | An evidence tablet — "I wouldn't pay for this version." (illustrative) — docks at one gate: the assumption. |
| **Transformation** | Confidence drains (exposure falls, filter closes): the gates ahead unlock — bars hang open again, corners drift, titanium turns provisional — rails thin and break, the original future retracts. No explosion, no glitch. |
| **Reveal** | "Plans are assumptions until reality responds." |
| **Meaning** | Evidence, not optimism, decides what holds. |
| **Code** | `path/Evidence.tsx`, `path-model.ts` (`unstable`, `wobble`), `ExecutionPath.tsx` (open bars, rails). |

## 6. Evidence → Adaptation (the system re-routes)
| | |
|---|---|
| **Visitor believes** | The unstable section is lost. |
| **Hidden clue** | The unlocked gates lift instead of vanishing — their parts are being reused. |
| **Transformation** | Each gate travels on a lifted curve to a slot on a revised direction branching from the assumption gate, re-locks; rails reconnect; a rerouting arpeggio resolves. The camera stays inside and follows. |
| **Reveal** | "The path changes when the evidence changes." |
| **Meaning** | Solventia learns from evidence: adaptation is reconfiguration, not starting over. |
| **Code** | `path-model.ts` (`revisedPath`, `revisedFrame`), camera keys (`revisedEye`). |

## 7. Cinema → Real product (wait — this is real?)
| | |
|---|---|
| **Visitor believes** | A graphite slab with a titanium bezel and an abstract layout is another 3D object. |
| **Hidden clue** | It detaches from the last rebuilt gate and squares up; the lens narrows to 26°; light holds its breath. |
| **Transformation** | Real HTML is projected onto the slab with a CSS homography while it is still 3D, takes over the surface, and is released as plain, interactive DOM; the navigation returns. |
| **Reveal** | A Founder OS the visitor can read, select and operate by keyboard — clearly labelled as an illustrative preview. |
| **Meaning** | The cinematic intelligence is the product. |
| **Code** | `world/product/product-model.ts`, `Product3D.tsx`, `overlay/DomSync.tsx`, `overlay/ProductPreview.tsx`. Phones crossfade (slab too small). |

## 8. Product → Finale (the product becomes Solventia)
| | |
|---|---|
| **Visitor believes** | The page is about to end with a footer. |
| **Hidden clue** | An isolated answer dissolves while a connected chain (dial, lens, tablet, gate, capsule) persists on gold filaments. |
| **Transformation** | The surface leans away into darkness; the Engine's layers return and resolve — every frame aligning into one calm nested-square emblem with gold hairlines. |
| **Reveal** | Staged in one composition: SOLVENTIA · VALIDATE · BUILD · ELEVATE → "Find the direction worth building." → "Your reality. Your evidence. Your path forward." → the CTA; then a protected hold. The footer arrives below — never over — the ending. |
| **Meaning** | Everything the visitor saw was Solventia carrying one journey forward. |
| **Code** | `core/core-motion.ts` (finale pose), `overlay/CinematicOverlay.tsx` (`stage()`), `overlay/DomSync.tsx` (`--reveal`), `scroll/useScrollController.ts` (stage lift). |
