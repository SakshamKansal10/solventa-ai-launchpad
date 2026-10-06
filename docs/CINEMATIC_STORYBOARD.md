# Cinematic storyboard

21 scenes on one native-scroll timeline (`timeline/timeline.ts`); total 3,570 lvh of scroll
(× 0.82 on phones). Every frame is a pure function of scroll progress (reversible). Emotional
arc: curiosity → mystery → intelligence → scale → anticipation → selection → conviction →
execution → disruption → adaptation → product realisation → desire.

| # | Scene | lvh | Camera | On screen | Sound | Copy |
|---|---|---|---|---|---|---|
| 00 | Void | 110 | far, still | near-black; three distant signals | bed fades up | "Every founder begins with uncertainty." |
| 01 | Engine awakening | 190 | dolly in; frames overtake the lens | kernel ignites, lattice lights; six gimbal frames fly in (three pass around the camera) and lock | activation bell, fly-bys, locks | "There is a direction hidden inside your reality." |
| 02 | Context | 210 | close orbit (engine right, copy left) | six input modules dock into ports; channels open (width = weight); each turns one gimbal layer | six signal pings | "Solventia starts with you." + "CAPITAL · w .22 / ₹50,000" … |
| 03 | Engine → universe | 200 | compression, FOV 28°, squeeze through | gimbal aligns outer→inner (clicks), pins retract, frames telescope into a narrowing square tunnel, hairlines light down it, kernel halves part, darkness, faint horizon lines | low tension rises, space closes | — |
| 04 | Universe | 150 | wide reveal (50°), rise to overlook | six territories of framed decision objects, indigo confidence lights, gold trunks | reveal swell, wide pad | "Hundreds of possible directions." |
| 05 | Computation | 190 | pull wider | six context waves (violet) re-score every node: lights shift, shells resolve to pearl or dim | information ticks, wave tones | "Your context reshapes every one of them." + wave tags |
| 06 | Convergence | 210 | toward the promising region | 360 → 120 → 36 → 9; nine on an ordered orbit | narrowing intervals | count (subtle) |
| 07 | Final three | 190 | between three future architectures | strata tower · nest of portal frames · orbital array; comparison pathways + six fit signals into each | sound narrows, tension | "Direction 01/02/03" |
| 08 | One direction | 150 | settle; held breath | failing signals retract; two futures separate, metal → glass, lights out; 02 becomes the most ordered system in view | near silence → restrained resolution | "One direction worth testing." |
| 09 | Opportunity → path | 170 | orbit to the side, turn, move with it | the winner's frames telescope out as gates; the path extends | unfold air + tone | — |
| 10 | Validate | 150 | inside, low | open corners, bars hanging in glass, violet probes, hairline rails, milestones | glass pings, soft pulse | VALIDATE · "Discover what reality supports." |
| 11 | Build | 150 | outside, tracking alongside | bars slide in and lock (titanium), locks turn gold, deck assembles | mechanical locks, steadier pulse | BUILD · "Turn evidence into execution." |
| 12 | Elevate | 150 | rising to altitude | path climbs; satellite channels branch and interconnect; vast frames far out | wide plucks, wider pad | ELEVATE · "Improve what proves valuable." |
| 13 | Evidence | 130 | descend inside, slows | an evidence tablet docks at the assumption gate | clean disruption bend | quote (illustrative) |
| 14 | Crisis | 130 | above, looking down the path | confidence drains (exposure), gates ahead unlock, bars hang open, rails thin and break, the future retracts | filter closes, tension | "Plans are assumptions until reality responds." |
| 15 | Adaptation | 190 | inside, following the new direction | gates lift and travel to a revised direction, re-lock; rails reconnect | rerouting arpeggio → resolve | "The path changes when the evidence changes." |
| 16 | 3D → interface | 140 | square up, FOV 26° | a graphite slab with titanium bezel; real DOM projected onto it | grounded handoff tone | — |
| 17 | Product | 200 | still | the Founder OS: context rail, learning log, direction, fit, roadmap, current move; tabs (keyboard) | quiet bed | panel content |
| 18 | Connected | 150 | slight pull back | isolated answer dissolves; chain (dial, lens, tablet, gate, capsule) persists on filaments | chain pings | "A chatbot answers. / Solventia carries the journey forward." |
| 19 | Product → cinema | 120 | pull back, darkness | surface leans away; chain recedes | — | — |
| 20 | Finale | 240 | far, then a protected hold | the engine reassembles and resolves into a nested-square emblem | finale chord | SOLVENTIA · VALIDATE · BUILD · ELEVATE → "Find the direction worth building." → promise → CTA |

After the finale the stage scrolls away with the page and the footer arrives below it.

Review frames: `node .e2e-tmp/frames.mjs <base> <out> 1440x810 scene:local …` (deterministic via
`?freeze=1`); the 29 reference frames: `node .e2e-tmp/review29.mjs <base> <out>`.
