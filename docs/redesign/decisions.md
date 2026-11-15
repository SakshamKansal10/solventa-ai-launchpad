# Decisions

Each entry: what was ambiguous, what I chose, why.

## Part 0
1. **Branch base.** The brief asks to tag "the main branch". The local `main` in this checkout
   holds four old, never-pushed commits (`41da902` and parents) that are not production. The
   production branch is `origin/main` at `49d3ead`. I tagged and branched from `origin/main`
   so `before-redesign-v2` really restores the live site, and left local `main` untouched.
2. **Uncommitted changes.** Only untracked files: `solventia-redesign-kit (1).zip` and its
   unpacked folder. Nothing was discarded. They are not committed (a zip is an artifact). The
   reference HTML was copied to `design-reference/` and the six briefs to
   `docs/redesign/briefs/` so a resumed session has them in the repo.
3. **Approval gates in the briefs.** Overridden by the run instructions: each part's plan is
   written to `docs/redesign/plan-<n>.md` and work continues without waiting.

## Owner corrections (2026-11-14, mid-run)
4. **Type scale.** CLAUDE.md's old heading cap (h1 24–30px, sentence-case labels) is replaced by
   part 3's scale (page headlines `clamp(44px, 5.6vw, 80px)`, uppercase 15px labels). CLAUDE.md
   updated. The marketing homepage keeps its own look.
5. **Colour tokens.** Part 3's hex codes map onto the existing tokens, no new palette:
   | Brief name | Project token |
   |---|---|
   | white / mist | `sol-surface` (white canvas), `sol-ivory` #f2f4f7 (supporting cards, nav pill — the closest token to the brief's #F1F3F9; `sol-pearl` #f7f8fa is too faint on white to read as a card) |
   | ink / body / mute | `sol-ink` (graphite headings and body), `sol-secondary` (secondary, meta, labels) |
   | navy | `sol-navy` — the one dark block per page |
   | blue | `sol-cobalt` / `sol-cobalt-deep` — only pressable things and current position, fit bars |
   | green-free "done" | `sol-champagne` — completed states and milestones |
   | amber (gaps, estimates, failed checks) | `sol-warning` — the existing warning token; champagne reads as "done", not as a caution, so it is not reused for warnings |
   Fit labels still come only from `assessFit`; no percentages.
6. **Part 1 scope.** Fix only the real gaps (dashboard shell PNG mark + hardcoded wordmark, call
   sites dropping the signature, home WebSite JSON-LD, canonical links, og:image, per-page titles
   and descriptions). Not rebuilt: `BrandLockup` system, favicons, manifest, sitemap, robots,
   404. Not done in part 1 (not on the list): Google Identity Services button, `/find-my-business-idea`
   redirect, the Proof rename (done in part 3).
7. **Moved test ids.** Where the redesign moves an element an e2e test targets, the test follows
   the element; no dead layout is kept for a test id.

## Part 2 — cinematic intro
8. **Phones get the still version.** The brief's thresholds (viewport < 768px, fewer than 4 cores,
   under 4 GB memory) send every phone to the static narrative from the start. Before, phones got
   the WebGL film on the medium tier. Tablets (≥ 768px) keep the film. Browsers that hide
   cores/memory (Safari, Firefox) are not penalised for it.
9. **The 4-second rule** is read as: the 3D bundle starts loading the moment the visit is a WebGL
   one; if it has not arrived in 4 s **and the visitor is still at the top** (scrollY ≤ 40), the
   visit is decided as still — before they are inside the film. If they are already scrolling,
   the film keeps running on the overlay and the 3D world joins when it arrives. Nothing ever
   swaps the layout under someone mid-scroll. Forced review tiers (`?tier=`) skip the rule.
10. **Errors and context loss hide the world, not the film.** The old 15 s start timeout is gone.
    A canvas error logs `[cinematic] …` and hides the world; a lost WebGL context hides it and a
    restored context shows it again in place.
11. **Sound toggle is visible and off by default.** The brief says "create the audio context only
    after the visitor clicks the sound toggle" and describes a toggle in the header. The earlier
    design had sound on by default with a hidden keyboard-only mute, which would leave no way to
    turn sound on. The toggle is now a visible icon button in the bar (WebGL visits only). The
    two sound e2e tests were updated to the new behaviour.
12. **will-change** left as is: it sits only on the few overlay layers that move every frame.

## Part 2b — cinematic performance (owner follow-up)
13. **Tier rules.** full = dedicated graphics (or Apple silicon) with ≥ 8 cores and ≥ 8 GB;
    unknown counts are not a demotion. Everything else that passes the still-version gates gets
    lite (integrated graphics, < 8 cores, < 8 GB, touch screens, data saver). `data-mode` reads
    full | lite | fallback; old `?tier=high|medium|low` links map to full/full/lite.
14. **Lite budget.** Pixel ratio ≤ 1, no MSAA, standard materials (glass and smoked included),
    84 universe instances, 420 × 12 filaments, 32 core / 24 gate segments. Same scenes, camera
    and layout.
15. **Adaptive rule kept exactly as specified** (median of ~2 s windows, > 20 ms steps down, at
    most twice). On the Vega 3 it does not step (the opening's median is 16.7 ms); proposal A in
    part2-perf.md asks the owner whether to sample while the story moves instead.
16. **`?perf=1` and `?notch=N`** are measurement aids only (counters without the HUD; a pinned
    notch). They change nothing for visitors.
17. **No scene content was cut.** Cuts are proposed with numbers in part2-perf.md.
18. **Proposal 2 as implemented.** The owner approved "16 sweep segments instead of 32 for the
    gate parts (lite)". Lite gate corners already use 6 curve segments, so that number does not
    exist on lite; the real triangle sources in the path scenes are the rounded bars, locks,
    modules and nodes (300 triangles each, ~100k per scene). Lite gives them one bevel
    subdivision (108 triangles). Same intent: fewer gate-part triangles, same look.

## Part 4 — working features
19. **Workspace fields are flat and optional in the generator schema** (workspace, target,
    firstMessageEn/Hi, questions, lesson, quiz questions/options/answers, prompts, fallback) —
    nested objects raise the provider's structured-output complexity, which is what broke Stage 7.
    The stored `workspace_spec` is assembled in code. Risk recorded in blocked.md: the larger
    week-detail schema must be checked once against the real Gemini API.
20. **A done rule exists only when the generator gives a target** (list rows, interviews), a quiz
    or prompts; otherwise the workspace shows but Mark as done is not gated. Missions written
    before workspaces existed get the generic notes box, ungated.
21. **Interview people come from the founder's own lists** as suggestions (a datalist), not a hard
    lock — a founder may have spoken to someone not yet listed; the honesty prompt (feature 2)
    covers the rest.
22. **Which mission checks an assumption, and its rule.** The first linked mission (same
    assumption category) with an interview workspace and a target; rule = "yes" from 60% of
    the target (rounded up) out of the target — e.g. 3 of 4. Stored once on first read (never
    shifts later); status derived from the logs every read.
23. **"Too neat" prompt** fires at 3+ logs when all answers match with little detail, or the
    logs were saved within 10 minutes. It is a note with an Ask Sol button — never a block.
24. **"Adjust this direction"** goes to the Roadmap: closing the week there writes the next week
    from the proof so far (the week-detail prompt already receives the assumption states). A
    full regeneration of every remaining week is part 5's executable-roadmap work; noted as a
    TODO in REPORT.md. "Switch direction" opens Directions; nothing is deleted either way.
25. **"No time this week"** moves the deadlines of the week's open missions by seven days and
    records `shifted_days`; done missions keep their dates. No penalty, no guilt wording.
