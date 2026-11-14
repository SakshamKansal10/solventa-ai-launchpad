# Task: redesign the Solventia dashboard (look, layout and navigation)

You are working in the Solventia codebase (solventia.in). Solventia helps first-time founders find a business direction that fits their real situation, test it with real customers, and follow a week-by-week roadmap. Many users are students or small-town founders on phones, and some read it in Hindi.

**Branch rule:** work only on the git branch `redesign-v2`. If you are on any other branch, stop and tell me. Commit after each build step. Never commit to `main`, never force-push.

The current dashboard reads like a research paper: 12–14px text, cards inside cards, the same information repeated on several pages, and no single obvious next step. The goal: each page has one job, the text is large, and the user always knows what to do next.

This task changes presentation and navigation only. The new working features (mission workspaces, automatic proof, the setup guide) are a separate task, `4-working-features.md`. Where a reference screen shows one of those features, build the layout with the data that exists today and leave a clearly marked TODO.

## Reference

`design-reference/solventia-dashboard-reference.html` holds ten screens as static HTML with inline styles. Read the inline styles for exact colours, sizes, radii and spacing. Rebuild each screen with this project's own components, data and translations. Do not paste the reference markup into the app. The text in it is sample data from one user. The round "S" in the header is a stand-in: use the real `Logo` component.

## Ground rules

1. **Plan first.** Read the dashboard routes, layout, components, styling setup, translation system and data hooks. Reply with a file map (existing file → what changes) and anything in this brief that does not match the code. Wait for my OK before editing.
2. No changes to the Supabase schema, queries, API routes, AI prompts or auth in this task.
3. Every number, label and status on screen comes from real state.
4. Every new string goes through the translation system, in English and Hindi. Devanagari headings need line-height of at least 1.3.
5. Use the fonts and the navy the landing page already uses. The reference uses Inter Tight, Inter and `#0F1B3D` as stand-ins.
6. **Phone first.** Build and check every page at 390px before 1440px.

## Design system

### Colour

| Token | Value | Use |
|---|---|---|
| `white` | `#FFFFFF` | Page background |
| `mist` | `#F1F3F9` | Supporting cards, nav pill background |
| `ink` | `#0A0E1A` | Headings, body text, active nav pill, filled tags |
| `body` | `#3A4256` | Secondary text |
| `mute` | `#5A6378` | Meta text and all small uppercase labels |
| `blue` | `#2440F0` | **Only** things you can press and your position: primary buttons, links, the current-step number, fit bars |
| `navy` | landing page navy | One dark block per page at most |
| `amber` | `#A15C00` on light, `#F2B84B` on navy | Warnings only: gaps, estimates, failed checks |
| `line` | `rgba(10,14,26,0.12)` | Dividers and outline buttons |

Rules:

- Roughly 70% white, 20% ink and navy, 10% blue on any page.
- Blue never fills a large block and is never used for labels or decoration.
- The page headline carries the hierarchy through size, not through a coloured box.
- One navy block per page at most: the journey arc (Today, Roadmap), the recommended card (Directions), "Your first test" (Direction detail).
- No card inside a card, no drop shadows, no gradients, no border on mist cards.
- Status never relies on colour alone: fit bars use solid, hatched and dashed patterns.

### Type

| Role | Size | Notes |
|---|---|---|
| Page headline | `clamp(44px, 5.6vw, 80px)` | weight 500, line-height 1, letter-spacing −0.035em |
| Mission headline (Today) | `clamp(44px, 6.2vw, 92px)` | same style |
| Section headline | `clamp(26px, 3.6vw, 52px)` | |
| Card statement | `clamp(22px, 2.3vw, 32px)` | line-height 1.2 |
| Lead paragraph | 22px | line-height 1.45 |
| Body | 18–20px | |
| Meta | 17px | |
| Label | 15px | weight 600, uppercase, letter-spacing 0.08em, `mute` |

**Nothing below 15px anywhere in the dashboard**, apart from the tagline inside the logo.

### Shape and spacing

- Radius: 40px navy blocks, 32–36px mist cards, 16px form inputs, 999px buttons and pills.
- Card padding `clamp(24px, 2.8vw, 40px)`. Gap between blocks 24–32px. Content max-width 1312px, side padding `clamp(20px, 4.4vw, 64px)`.
- Primary button: 68px tall, 21px text, weight 600, blue with white text, arrow icon on the right. On a navy block it is white with ink text.
- Secondary button: same shape, 1px outline, no fill.
- **Exactly one primary button per page.** Touch targets at least 44px.

## App shell

- Remove the left sidebar. Top bar: `Logo` (with tagline) on the left; centred pill nav **Today · Directions · Roadmap · Proof**; on the right the language toggle, **Ask Sol**, and the avatar.
- Rename labels only: "Command Center" → "Today", "Opportunities" → "Directions", "Evidence" → "Proof". Keep the existing URLs.
- **History** and **Settings** move into the avatar menu, with Sign out. Their routes stay.
- Before a direction is chosen, Roadmap and Proof are visible but disabled.
- Ask Sol in the top bar opens the existing assistant panel. Remove the floating button on desktop.
- **Under 768px** (reference screen 10): top bar keeps the logo, language toggle and avatar; the four nav items become a fixed bottom bar with icon and label; Ask Sol becomes a round floating button above that bar.

## Pages: one job each

### 1. Today (`/dashboard`): "What do I do now?"

The headline area changes with state. Nothing else competes with it.

| State | Headline area | Below it |
|---|---|---|
| No consultation yet | Invitation to start the consultation | Nothing |
| Directions ready, none chosen (screen 2) | Recommended direction, fit summary card, **Explore this direction**, Compare all | Who it's for, their problem, what you do; three "what happens next" steps |
| Direction chosen, roadmap not built | Direction name, **Build my roadmap** | The three steps, step 2 active |
| Roadmap active (screen 1) | Today's mission, time estimate, **Start mission**, large mission number with week progress | Journey arc; "This week succeeds if"; proof count |
| Week's missions all done | "Week N done." and **See what you proved** | Journey arc |

Remove from this page: the five-step strip, the "How this direction fits you" chip row, the three stat tiles, "Roadmap at a glance", and the "Your direction" card.

### 2. Directions (`/dashboard/opportunities`): "Which one?" (screen 3)

- Headline, one line saying what the directions were built from, one card per direction. The recommended card is navy and comes first.
- Each card: number, name, one-sentence description, five-segment fit bar, overall fit label with counts, the single strongest reason, one button: **Open direction**.
- Fit bar: one segment per existing fit dimension, clear fits first. Clear fit = solid blue. Any gap = amber diagonal hatch. Critical mismatch = solid ink. Not known yet = dashed outline. Legend shown once.
- Two quiet rows at the bottom: the "answer 3 questions" nudge (TODO until task 4) and "Find more directions".

Remove: the fit matrix table, the search box, the Filters button, the duplicated card list, and the **Choose** button on cards. Choosing happens on the detail page only.

### 3. Direction detail (`/dashboard/opportunities/[id]`): "Is this right for me?" (screen 4)

- Back link, name as headline, one paragraph, one primary button that follows state: **Choose this direction** → **Build my roadmap** → **Open roadmap**.
- Beside the headline: the fit summary card.
- Four mist cards: Customer, Their problem, Your offer, How you earn.
- Navy block: "Your first test" and "Where it can go", with an amber "Estimate" tag on any projected number.
- Two link rows to sub-pages: **How it fits you** and **Market and sources**. Move the current tab content, the "More detail" expanders and "How it's delivered" onto those sub-pages.

Remove: the tab bar, the numbered 1–7 badges, the expanders.

### 4. Roadmap (`/dashboard/roadmap`): "Where am I, and what's this week?" (screen 5)

- Direction name, headline, then the navy block with the journey arc and phase cards. The current phase card is white. Later phases keep "Depends on what you learn".
- The current week: label, title, one line, total time, missions as large rows. Only the next mission has a blue number and a blue **Start** button. Completed missions show a check and muted text. Others show **Open**.
- A link row to "Make it official" (TODO until task 4).

Remove: the "This week / Plan / Progress" tabs, the right-hand rail, the week pager arrows, the phase detail card with its 1-2-3 stepper.

### 5. Mission pages (screens 6 and 7)

Replace the inline accordion with a full page per mission: logo, a back link to the week, Ask Sol, no main nav. Mission number and time tags, title as headline, one line of why, the mission's steps, the completion criterion, **Mark as done**, and the "Stuck?" row. The input areas in the reference ("Your list", "Log each interview") are built in task 4: leave a TODO where they go.

### 6. Proof (`/dashboard/proof`): "What have I proved?" (screen 8)

- Headline, one line, a large "N / total" count with one segment per item.
- One mist card per assumption: type label, status pill, statement, "How you check it" linking to the mission.
- Status pill uses a shape as well as text: Not checked yet (dashed ring), Checking (half-filled), Supported (check), Not supported (cross), Unclear (dash).
- The "If a check fails" row.

Remove: the status bar with five counters, "Why this direction fits you" and "Market evidence" (both live on Direction detail).

### 7. Other screens

- **Building your roadmap:** keep the headline and elapsed time. Replace the bullet list and the "one real request" paragraph with the journey arc drawing itself.
- **History and Settings:** same content, restyled with the tokens. Two columns on desktop for Settings.

## Journey arc component

`JourneyArc({ totalWeeks, phases, currentWeek, completedWeeks })`, used on Today, Roadmap and the building screen.

- SVG, `viewBox="-24 40 1248 190"`, width 100%.
- Base curve: quadratic Bézier from (20, 200) through control point (600, −60) to (1180, 200), 2px white at 22% opacity.
- Week `i` of `n` sits at `t = i / (n − 1)`: `x = 20 + 1160t`, `y = 200 − 520t + 520t²`. Use the real roadmap length. Do not hard-code 13.
- Current-phase portion: 5px stroke, light blue, round caps. Small tick at each phase boundary.
- Current week: filled 11px dot with a soft 22px halo. Final week: 9px ring.

## Motion

- Page enter: headline fades in and rises 12px over 400ms, blocks below follow 60ms apart.
- Journey arc draws once on first view (about 900ms), then the current-week halo pulses slowly.
- Buttons: arrow moves 4px on hover, button scales to 0.98 on press.
- Only `transform` and `opacity`. Respect `prefers-reduced-motion`. No smooth-scroll library, no scroll-linked animation and no WebGL in the dashboard.

## Accessibility

- Text contrast at least 4.5:1 (3:1 at 24px and larger). The token pairs above pass.
- Visible focus ring on every control: 2px blue, 2px offset.
- Real `<a>`, `<button>`, `<input>` and `<label>` elements, `aria-current="page"` on the active nav item.
- No horizontal scroll at 390px.

## Build order

1. Tokens and base components (buttons, pills, cards, inputs).
2. App shell: top bar, bottom bar on phones, avatar menu, Ask Sol trigger.
3. `JourneyArc` and the fit bar.
4. Today, all five states.
5. Directions and Direction detail with its two sub-pages.
6. Roadmap and the mission page shell.
7. Proof.
8. Building screen, History, Settings.
9. Hindi pass and 390px pass on every page.

## Done when

- No text under 15px, and exactly one primary button per page.
- Blue appears only on pressable things, position markers and fit bars.
- Everything removed still exists where this brief says it moved.
- A new user on Today can say what to do next within three seconds, in English and Hindi, on a phone.

Finish with a summary of what changed, anything you could not do and why, and screenshots of each page at 390px and 1440px.
