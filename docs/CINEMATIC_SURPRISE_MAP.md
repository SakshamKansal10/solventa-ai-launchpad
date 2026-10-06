# Cinematic surprise map

The homepage is one continuously transforming world. Each major transition first lets the
visitor form an expectation, then violates it with a transformation that has a reason.
Pattern: **setup → comfort → hidden clue → disruption → transformation → reveal**.

All eight are implemented in `/cinematic` (local). Code pointers are given per transition.

---

## 1. Intelligence Core → Universe (object → world)
| | |
|---|---|
| **Visitor believes** | The core is one finished, self-contained sculpture to admire from outside. |
| **Hidden clue** | A narrow vertical slit between the two front ceramic shells, inlaid in champagne; the gold guide filaments converge on it during the approach. |
| **Transformation** | The lens compresses (FOV 38° → 28°), the slit halves swing apart, and the camera threads through the inner mechanism — spine, glass, inner blades pass within ~2 units — while the outer shell expands ×6 about the opening and keeps opening until it is lost in the dark. |
| **Reveal** | The lens opens to 50° on an environment far larger than the object that contained it: the opportunity universe. |
| **Meaning** | Solventia is not a tool you look at — you enter its intelligence. |
| **Code** | `world/core/core-motion.ts` (shell scale about `OPENING`), `core-design.ts` (`j1`/`j2` slit), `camera/camera-keys.ts` (passage keys), `camera-path.ts` (`FOV_KEYS`, `NEAR_KEYS`), `world/universe/universe-state.ts` (`revealFront`). |

## 2. Universe → Order (endless → controllable)
| | |
|---|---|
| **Visitor believes** | An enormous, open-ended field of possibilities to drift through. |
| **Hidden clue** | Six context waves (Capital, Skills, Location, Time, Experience, Customer access) roll outward from the core's trunks — violet pulses on the filaments, nodes re-scoring as each wave passes. |
| **Transformation** | Low-fit territories lose energy and recede; whole families retract; the territories' own architecture (rails, spiral arm, lattice) withdraws; survivors fold inward and depth compresses. |
| **Reveal** | 360 → 120 → 36 → 9: the nine hang in one ordered elliptical orbit. The "infinite" world was computational all along. |
| **Meaning** | Your context turns overwhelming possibility into a manageable, reasoned shortlist. |
| **Code** | `world/universe/scoring.ts` (illustrative model), `universe-model.ts` (territories, stages, formations), `universe-state.ts` (waves, convergence), `OpportunityUniverse.tsx` (nine ring). |

## 3. Three → One (three futures, compared at once)
| | |
|---|---|
| **Visitor believes** | Three separate sculptures — each could become its own world; the camera visits them one by one. |
| **Hidden clue** | Gold pathways begin to circulate between all three while the camera is still visiting. |
| **Transformation** | Two lose coherence — their ribs drift apart and their ceramic dissolves to glass — while the nested arches of Direction 02 gain solidity and a long filament aligns it with the core's trunk. |
| **Reveal** | Silence: one sculpture, one line — "One direction worth testing." |
| **Meaning** | Solventia evaluates directions together and commits to one worth testing — not a list of ideas. |
| **Code** | `world/path/Finalists.tsx`, `path-model.ts` (`sculptureFrame`, chosen solidity), `overlay/copy.ts` (`selection`). |

## 4. Opportunity → Roadmap (the object becomes the path)
| | |
|---|---|
| **Visitor believes** | They are looking at a finished sculpture of nested, twisting arches. |
| **Hidden clue** | The arches are concentric — a compressed tunnel — and the winner's gold filament points forward. |
| **Transformation** | The camera orbits to its side and turns; the arches telescope out along the path one after another, untwisting and growing to full size; further gates rise into place ahead. |
| **Reveal** | The visitor is now travelling through the path made of that opportunity. |
| **Meaning** | A direction is only valuable when it becomes an executable path. |
| **Code** | `path/path-model.ts` (`gateState` telescope), `path/ExecutionPath.tsx`, `camera-keys.ts` (unfold). |

## 5. Roadmap → Evidence crisis (the future was never fixed)
| | |
|---|---|
| **Visitor believes** | The path is now confident: Validate → Build → Elevate made it solid, interconnected and grand. |
| **Hidden clue** | A framed glass tablet drifts in from beside the path carrying an illustrative customer quote — "I wouldn't pay for this version." — and settles into one gate (the assumption). |
| **Transformation** | Instability propagates forward from that gate: arches tilt and shift, crowns lift off, legs separate, ceramic turns provisional again, rails thin and break, the original future beyond retracts. No explosion. |
| **Reveal** | "Plans are assumptions until reality responds." |
| **Meaning** | Evidence, not optimism, decides what holds. |
| **Code** | `path/Evidence.tsx`, `path-model.ts` (`unstable`, `wobble`), `ExecutionPath.tsx` (rails, future rails). |

## 6. Evidence → Adaptation (the world rebuilds around you)
| | |
|---|---|
| **Visitor believes** | The unstable section is lost. |
| **Hidden clue** | The rebuilt gates lift mid-flight rather than vanish — the parts are being reused. |
| **Transformation** | Each unstable arch travels on a curved, lifted trajectory to a slot on a revised direction branching from the assumption gate, re-stabilises, and the rails reconnect through it. The camera stays inside and follows the new direction. |
| **Reveal** | "The path changes when the evidence changes." |
| **Meaning** | Adaptation is reconfiguration, not starting over. |
| **Code** | `path-model.ts` (`revisedPath`, `revisedFrame`, adaptation in `gateState`), camera keys (`revisedEye`). |

## 7. Cinema → Real product (wait — this is real?)
| | |
|---|---|
| **Visitor believes** | A floating pearl slab with an abstract interface layout is another 3D object. |
| **Hidden clue** | The slab detaches from the last rebuilt gate and squares up to the lens; the lens narrows to 26°, flattening perspective. |
| **Transformation** | Real HTML is projected onto the slab with a CSS homography while it is still 3D; it takes over the surface; once the slab faces the screen it is released as plain, interactive DOM. |
| **Reveal** | The visitor can select text, use the tabs with the keyboard and read Founder Fit — the real product components, clearly labelled as an illustrative preview. |
| **Meaning** | The cinematic intelligence is the product. |
| **Code** | `world/product/product-model.ts` (`quadToMatrix3d`, `slabState`), `Product3D.tsx`, `overlay/DomSync.tsx`, `overlay/ProductPreview.tsx`. Phones crossfade instead (slab too small). |

## 8. Product → Finale (product becomes Solventia)
| | |
|---|---|
| **Visitor believes** | The page is about to end with a footer. |
| **Hidden clue** | An isolated glass answer dissolves while a connected chain — context dial, opportunity lens, evidence tablet, path arch, milestone — persists on gold filaments. |
| **Transformation** | The interface hands back to the 3D surface, which leans away into depth; the camera pulls far back; the core's pieces fly in and reassemble where the product stood. |
| **Reveal** | Stillness. The core in the distance; "Find the direction worth building." and the real CTA → `/consultation`. Only then the footer. |
| **Meaning** | Everything the visitor saw was Solventia carrying one journey forward. |
| **Code** | `Product3D.tsx` (chain, isolated answer), `core/IntelligenceCore.tsx` (`variant="finale"`), `core-motion.ts` (`finaleTransform`). |
