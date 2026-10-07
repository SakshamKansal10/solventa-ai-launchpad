# Cinematic homepage — continuity audit

## Method

- **Build audited:** the current V2-in-progress state (commit `660533e`), rendered as a continuous strip: one frame every 1.5 % of the timeline at 1440 × 900, with captions and navigation exactly as a visitor sees them (`.e2e-tmp/art/flow-a.jpg`, `flow-b.jpg`). The 6:21 Version 1 walkthrough (`review/`) was also used.
- **Question asked of every moment:** _can I tell where one webpage section ends and another begins?_

## Global causes (present in almost every frame)

### G1 — The website navigation never leaves

- **Current:** the full site bar (wordmark, three links, sound pill, Sign In, CTA) is drawn over every frame of the film.
- **Why it feels like a website:** a site header is the strongest possible signal that this is a page, not a world. It frames every shot as "a website with a 3D background".
- **Replacement:** during the film the bar recedes to a minimal film chrome: the wordmark and the sound control only. The links and calls to action return when the product appears and in the final hold. Keyboard focus brings the full bar back immediately.

### G2 — Captions are laid out like landing-page sections

- **Current:**
  - A serif statement block sits in the lower-left or upper-left with the subject on the right — the hero layout of a marketing page.
  - Validate, Build and Elevate are a kicker plus a headline in the upper-left — classic section headers.
  - "A chatbot answers. / Solventia carries the journey forward." reads as a comparison block.
- **Why it feels like a website:** heading + paragraph + hero visual, repeated, is what a scrolling page looks like. Each new heading announces a new section.
- **Replacement:** film titles.
  - Short and centred in the lower third, smaller, on screen briefly, never paired with a kicker.
  - Validate, Build and Elevate become single chapter marks that pass while the world itself changes.
  - Fewer captions overall; the world carries the meaning.

### G3 — The scroll behaves like page position

- **Current:**
  - The browser scrollbar is visible.
  - Progress follows the wheel almost directly (smoothing λ = 4.2/s).
  - Long scroll distances pass with nothing changing in some places, e.g. the product.
- **Why it feels like a website:** a scrollbar and "scroll = move down a document" make the visitor read vertical progress, not time.
- **Replacement:**
  - Hide the scrollbar on this route.
  - A hairline film-time indicator replaces it.
  - Heavier time smoothing, so input feels like advancing a film.
  - Shorter static stretches.

### G4 — The camera re-stages at scene starts

- **Current:** new vantage points at most scene starts (overlook → dive to the matrix → board → close-ups from below → side views left, then right, then up → back into the tunnel …).
- **Why it feels like a website:** each re-stage presents "the next visual", like the next block of a page.
- **Replacement:** one carried camera. It stays on one side of the road, moves through transforming structures instead of cutting to new vantage points, and stops only where a stop means something.

## Moments that read as section boundaries

### 1. Void → Engine (flow 02 → 03)

- **Current:** signals cross an empty void; then a large metal channel flies in and the Engine is assembled as a new hero object.
- **Why it feels like a website:** the Engine is loaded, not discovered. Nothing that was on screen becomes it.
- **Replacement:**
  - The signals run through the Engine's own channels from the first frame: the hairlines are the S's blueprint, seen so close they read as abstract curves.
  - The camera starts inside that structure and draws back; the curves resolve into the S, and the metal lands on the lines the signals were already travelling.

### 2. Engine → founder context (05 → 06)

- **Current:** the caption changes to an upper-left heading with a kicker; instruments are presented beside the S.
- **Why it feels like a website:** a new heading starts a new section.
- **Replacement:** no heading. A brief title only; the instruments arrive into the Engine that is already there and dock into its existing ports.

### 3. Universe → computation (16 → 17)

- **Current:** the overlook cuts to a close dive into the capability matrix, and a new heading appears.
- **Why it feels like a website:** a new composition plus a new heading.
- **Replacement:** the same overlook glides; the founder's waves visibly cross the world the visitor is already looking at, with no heading.

### 4. Nine → three (24 → 25 → 26)

- **Current:** the nine lattice, then an extreme close-up of one structure from below, then a separate overview of all three.
- **Why it feels like a website:** three "new visuals" in a row; the finalists appear rather than grow.
- **Replacement:**
  - Each finalist grows out of its own lattice column; its pieces travel from the column's candidates.
  - The camera moves continuously into the space between the growing structures, then pulls back below them for the comparison.

### 5. Unfold → Validate (33 → 34)

- **Current:** the camera leaves the road to a new side view as the upper-left headline "VALIDATE / Discover what reality supports." appears.
- **Why it feels like a website:** a section header and a new vantage point.
- **Replacement:** the camera rises out of the road it was just inside and stays on that side. "Validate" is a passing chapter mark.

### 6. Validate → Build (36 → 37)

- **Current:** the camera swings from the left side high to the right side low, and a new headline appears.
- **Why it feels like a website:** a side-switch reads as a new shot and a new section.
- **Replacement:** the same side and one continuous move; the provisional gates solidify as the camera passes. That change is Build.

### 7. Build → Elevate (39 → 40)

- **Current:** a cut to altitude with a new headline.
- **Why it feels like a website:** a new vantage point plus a header.
- **Replacement:** the camera keeps flying along the same side and climbs while the branches grow out of the gates it just passed.

### 8. Elevate → evidence (42 → 43)

- **Current:** the camera drops back into the tunnel; the quote appears in front of a pane.
- **Why it feels like a website:** the network the visitor was admiring is gone.
- **Replacement:** the descent continues smoothly out of the network.

### 9. Adaptation → handoff (50 → 52)

- **Current:** the slab floats alone against black before the UI appears.
- **Why it feels like a website:** an object on an empty stage looks like a product image.
- **Replacement:** the slab is born from the rebuilt gate (already true). The surrounding architecture stays in view, dimming, until the surface fills the frame.

### 10. Product (53 → 57)

- **Current:** a centred UI card for 200 vh.
- **Why it feels like a website:** a product screenshot section.
- **Replacement:** a shorter hold (the interface stays real and usable).

### 11. Product → connected (57 → 58)

- **Current:** five new tokens pop up in front of the panel under "A chatbot answers."
- **Why it feels like a website:** a marketing comparison block with new objects.
- **Replacement:** the interface's own relationships light up — context → direction → evidence → roadmap, drawn as gold routing across the surface it already is. That routing then leaves the surface.

### 12. Return → S (61 → 62)

- **Current:** the chain dissolves, then a new S flies in.
- **Why it feels like a website:** "back to the 3D logo".
- **Replacement:** the interface routing converges into the S drawn in light at its centre; the metal lands on it. The S is where the routes of the whole journey end.

### 13. Finale

- **Current:** S, lockup, headline and CTA, with the full nav bar above — a hero/CTA section.
- **Why it feels like a website:** website chrome around the ending.
- **Replacement:** the nav returns only in the final hold, after the emblem has resolved.

## What was changed

| Moment                   | Now                                                                                                                                                                                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 site bar              | Full bar on arrival; links, Sign In and CTA fade out completely once the film starts (`DomSync` `--immerse`); the wordmark (≥ 0.55) and sound control (0.65) stay. Bar returns for the product and in the final hold. Hover or keyboard focus restores it at once.                                       |
| G2 captions              | One title slot, centred in the lower third, ~40 % smaller, with spans cut to roughly half. Validate / Build / Elevate are one-line chapter marks (name · hairline · promise). Wave readouts sit under the title, and the count moved to the lower-right corner as film data.                             |
| G3 scroll                | Document scrollbar hidden on `/cinematic` only. A hairline film-time indicator replaces it. Smoothing λ 4.2 → 3. Product hold 200 → 150 vh.                                                                                                                                                              |
| 1 Void → Engine          | The signals run along the S's own edges and draw them (the blueprint) from the first frame. The camera opens close (abstract curves) and draws back until they resolve into the S. The metal descends onto those lines from just in front instead of flying in.                                          |
| 3 Universe → computation | No dive: the overlook glides down and across the same world while the waves cross it.                                                                                                                                                                                                                    |
| 4 Nine → three           | The six rivals are absorbed where they stand. Every piece of each future leaves one of its column's lattice nodes and travels into place (tower bottom-up, ring around, nest front-to-back). The camera pushes along the centre axis between the growing structures, then eases back for the comparison. |
| 5–8 Validate → evidence  | One carried camera on the left of the road throughout. The evidence tablet travels in through the branch frames on that side, leaving a trace, into the assumption gate.                                                                                                                                 |
| 10–12 Product → S        | The connected chain's five floating tokens and the "isolated answer" tile are gone. The interface's own relationships are drawn as gold routing across the surface (context → opportunity → evidence → path → progress). That routing then leaves the surface and converges into the S.                  |
| 13 Finale                | Bar returns only after the emblem has resolved (finale 0.72 → 0.86).                                                                                                                                                                                                                                     |

Not yet changed: moments 2 (instruments still arrive beside the Engine), 9 (the slab is briefly alone before the interface appears).

## Order of work

1. G1, G2, G3: film chrome, film titles, time scroll.
2. Nine → three growth and the carried camera through the three.
3. One carried camera for Validate → Build → Elevate → evidence.
4. Signal → Engine as discovery.
5. Product → S through the interface's own routing; shorter product hold.
6. A new walkthrough, then the continuity test: watched without text, asking "where does a section end?"
