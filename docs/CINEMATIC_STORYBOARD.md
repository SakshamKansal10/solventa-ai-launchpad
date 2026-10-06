# Cinematic storyboard

21 scenes on one native-scroll timeline (`timeline/timeline.ts`); total 3,460 lvh of scroll
(× 0.82 on phones). Every frame is a pure function of scroll progress (reversible).

| # | Scene | lvh | Camera | On screen | Copy |
|---|---|---|---|---|---|
| 00 | Void | 110 | far, still (z 74) | near-black; two then three distant champagne glints | "Every founder begins with uncertainty." |
| 01 | Core awakening | 190 | slow dolly → ¾ view | glints streak in; spine rises, collars lock, shells fly in on curved paths, inlays and filaments activate, violet wakes | "There is a direction hidden inside your reality." |
| 02 | Context | 210 | controlled orbit | six signal forms dock (capital bar, skills strands, location gimbal, time dial, experience layers, access tree); the core answers each | "Solventia starts with you." + labels (illustrative profile) |
| 03 | Core → universe | 170 | macro approach, FOV 28°, pass-through | slit halves swing aside; spine/glass pass close; shell expands away | — |
| 04 | Universe | 150 | wide reveal (50°), rise to overlook | six composed territories, trunks branching from the core | "Hundreds of possible directions." |
| 05 | Computation | 190 | pull wider | six context waves; nodes re-score: align, solidify, dim, recede; conflicts retract links | "Your context reshapes every one of them." + wave tags |
| 06 | Convergence | 210 | toward the promising region | 360 → 120 → 36 → 9; territories fold in; nine on an elliptical orbit | count (subtle) |
| 07 | Final three | 190 | between the three futures | vane, nested arches (02), helix; gold pathways circulate | "Direction 01/02/03" labels |
| 08 | One direction | 120 | settle; silence | two lose coherence; 02 aligns with the core | "One direction worth testing." |
| 09 | Opportunity → path | 170 | orbit to the side, turn, move with it | arches telescope into gates; path extends | — |
| 10 | Validate | 150 | travel | provisional glass gates, hovering crowns, delicate rails, milestones | VALIDATE · "Discover what reality supports." |
| 11 | Build | 150 | travel | crowns lock, ceramic, structured rails | BUILD · "Turn evidence into execution." |
| 12 | Elevate | 150 | travel | gates grow, interconnect, distant architecture opens | ELEVATE · "Improve what proves valuable." |
| 13 | Evidence | 130 | slows | glass tablet arrives at the assumption gate | quote (illustrative) |
| 14 | Crisis | 130 | pull back and up | instability propagates forward; rails break; future retracts | "Plans are assumptions until reality responds." |
| 15 | Adaptation | 190 | inside, following the new direction | arches relocate on lifted curves; rails reconnect | "The path changes when the evidence changes." |
| 16 | 3D → interface | 140 | square up, FOV 26° | slab detaches, squares up; real DOM projected onto it | — |
| 17 | Product | 200 | still | real, interactive preview (tabs, Founder Fit, step path, evidence) | panel content |
| 18 | Connected | 150 | slight pull back | isolated answer dissolves; chain persists on filaments | "A chatbot answers. / Solventia carries the journey forward." |
| 19 | Product → cinema | 120 | pull back | surface leans away; chain recedes | — |
| 20 | Finale | 190 | far, still | core reassembles where the product stood | "Find the direction worth building." · CTA |

Then the footer slides over the stage.

Review frames: `node .e2e-tmp/frames.mjs <base> <out> 1440x810 scene:local …` (deterministic via `?freeze=1`).
