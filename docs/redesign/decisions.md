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
26. **Interview scripts (feature 4)** were mostly built with feature 1 (first message in two
    languages with a toggle, Copy message, the "Listen. Do not pitch your idea." rule, the
    generator's behaviour-question rule and the opinion-question check). Feature 4 adds the
    founder's first name (from `profiles.full_name`) to the week prompt and tops an interview
    mission up to three behaviour questions, in the founder's language, when the check leaves
    fewer. The Hindi defaults are written as they would be said, not translated word for word.
27. **Ask what is missing (feature 5).** The questions are exactly the empty answers that make a
    fit factor "Not known yet" (access, money, skills, hours, scale; skills counts as two: a pick
    and a level), heaviest factor first, never more than four. The skill choices are the skills
    this consultation's directions ask for, plus a free "something else". Answers are merged into
    the latest consultation with the existing `updateFounderProfileAnswers` (no new row, no AI
    call); fit is derived on every read, so it recalculates at once. On an older consultation the
    nudge keeps linking to Settings. Contradictions flagged: age vs occupation (school student
    21+, college student under 15, working professional under 16), age vs education (degree under
    18, postgraduate under 20), and below-10th education with "college student". They are shown
    to correct, never fixed silently.
28. **Estimates and sources (feature 6).** The direction generator has no sources, so every
    number in a direction is an estimate by construction: stored as `candidate.numberKind =
    "estimate"` on new directions (older ones read as estimates), and any direction text that
    states a number shows the amber Estimate tag with "Your first weeks check it." (direction
    "How you earn", "Where it goes", Market's longer earn line, and fit reasons that quote the
    direction's estimated starting cost or hours). Cited-search claims are `sourced` only with a
    URL (`opportunity_evidence.kind`, migration 0018) and show the link and the date checked
    (`retrieved_at`); one without a URL is an estimate and tagged. Admin flag renumbered 0019.
29. **Commit 6fd2e75** ("docs(redesign): tick part 4 feature 6") contains all of feature 6's
    code (estimates and sources, migration 0018): the feature commit aborted on an empty message
    and the tick commit picked up the staged files. History is not rewritten (pushed); REPORT.md
    lists 6fd2e75 as feature 6's commit.
30. **Make it official (feature 7).** Content lives in `src/content/make-official.ts` (static,
    typed, en + hi). A step's content shows only when `reviewed: true` and `lastChecked` is set;
    every step ships unreviewed, so the page shows each title, its phase tag and "Being
    reviewed". Thresholds and fees are kept out of the user text and listed in `sources` (each
    `needsOwnerReview`, with the official page) for the owner's reviewer. Phases unlock by the
    roadmap's fixed phase keys: structure, Udyam and the current account from `build`, GST from
    `launch`. The under-18 note shows advice only ("do these steps with a parent or guardian,
    confirm with a CA") until its legal wording is reviewed. "Fixed footer line" is read as a
    line that is always present at the foot of the page, not a position: fixed bar.
    The current-account step links to rbi.org.in (the KYC rules banks follow): banks are not
    government sites, and the brief allows official government links only.
31. **One weekly reminder (feature 8).** Email through the existing Resend sender (no new
    provider, so no stop for approval). Sending needs a scheduler and a way to read every
    founder's choice: a daily Vercel Cron (`vercel.json`, 03:30 UTC = 09:00 India) calls
    `/api/cron/weekly-reminders`, which checks `Authorization: Bearer $CRON_SECRET` and reads with
    a service-role client (`SUPABASE_SERVICE_ROLE_KEY`, used only there). Without both env vars
    the route answers 503 and sends nothing. Days are India time; one send per founder per day
    (`reminder_last_sent_at`). The email is one line and one button (the next open mission of the
    current week, by earliest deadline) in the founder's saved language. The one-time question
    sits on the Roadmap page until answered (yes with a day, or no thanks); Settings changes it
    any time. Crons only run on production deployments, so nothing is sent from previews.
32. **Plain words (feature 9).** Every user-facing message value (not keys, not code names) in
    en and hi: assumption(s) → thing(s) to check, evidence → proof, validation/validate → testing/
    test, provisional → depends on what you learn; a few phrases rewritten by hand where the swap
    read badly. Hindi: धारणा/मान्यता → जाँचने वाली बात(ें), साक्ष्य/प्रमाण → सबूत, अस्थायी → "आप जो
    सीखेंगे उस पर निर्भर"; अनुमान is changed only where it meant "assumption" (it also means
    "estimate", the Estimate tag). Kept as they are: the brand triad "Validate • Build • Elevate"
    (a brand name), the OTP "सत्यापन कोड" (verification), "प्रमाणित स्रोत" (verified sources), and
    the economics tab's strings (that component is not rendered anywhere). The film's hard-coded
    English (still version, product preview, chain labels) and two SEO descriptions follow the
    same words. The fake Gemini now keeps the `workspace` enum untranslated, as real structured
    output does (it made week 1 fail in the Hindi e2e).
33. **The opening (owner follow-up step 1).** A server-rendered DOM/CSS layer over the film's
    first frame; an inline <head> script (`INTRO_GATE_SCRIPT`) decides before the first paint
    whether it shows, so returning visitors never see it flash. Skipped for: seen before
    (localStorage `sol-intro-seen`), #hash or ?next deep links, reload and back/forward
    navigations, a page already scrolled, review URLs (?tier, ?freeze, ?debug, ?perf, ?notch) and
    automated browsers — `?intro=1` forces it, `?intro=auto` applies the real rules in tests.
    Timing: choices up to 3 s (or a tap) → answer line 1.1 s → "Here is Solventia." 0.9 s →
    collapse 0.56 s into the lockup that is already beneath (same pearl ground), so a tap at ~1.5 s
    gives a ~4 s opening. The 3D bundle starts downloading as the homepage module evaluates
    (Vite's preload helper adds its modulepreload links), not after hydration; phones and reduced
    motion skip it (they get the still version). At the lockup: ready → the film starts; else
    the lockup holds (scroll locked, aria-busy, a quiet progress line instead of "Scroll to
    explore", Skip intro still there); 8 s after the lockup without ready → the still version
    for this visit. This replaces the 4 s bundle rule on intro visits only. The choice is kept
    in sessionStorage and adds ONE line under "Your reality. Made actionable." (the film's
    awakening caption; shown only when there is a choice). No consultation field matches
    "stage" (status is occupation, not where they are with an idea), so nothing is pre-filled.
    The capital-question idea is dropped. The film's own copy is English-only, as before.
34. **3D ready faster (owner step 2).** Shader batches of 6 (not 1 per frame), a stand-in
    environment so world programs compile while PMREM builds, geometry warm-up 3 groups per
    frame, and a <head> preload of the 3D bundle (server-only `ReactDOM.preload` with a media
    query matching who gets the film; the chunk name comes from a Vite plugin). Measured on
    fresh browsers (cold GPU cache) because same-browser runs flatter first visits by seconds.
    Cold broadband is 6.9 s: inside the 8 s lockup rule, not inside the opening; the remaining
    levers are listed in part2-perf.md 2d and left to the owner.
35. **The film's dashboard scene (owner step 3)** is the redesigned Today screen as a static DOM
    overlay (the scene was already one: `ProductPreview`, mapped onto the 3D slab and released
    as real DOM), not an image: it stays crisp at any scale and is the same component in the
    still version. Drawn with the dashboard's own tokens (white canvas, pill navigation, the
    large mission headline, cobalt action and numeral, navy journey block) at the panel's real
    size via container units; sample founder data, labelled illustrative. Its nav is a real
    tablist (Today / Roadmap / Proof); the cinematic e2e follows the new tab names.
36. **Drop-off page (feature 10).** `/dashboard/admin`, not linked anywhere. Counts come from one
    `SECURITY DEFINER` SQL function (`admin_dropoff_counts`, migration 0019) that refuses anyone
    whose own profile is not `is_admin` (set by hand by the owner) and returns counts only — no
    names, ids or content; no service key in the app, no third-party tracker. Steps: consultation
    finished, direction chosen, roadmap built (active/completed), mission 1 started / done (the
    first mission of the week numbered 1), week 1 done, and the stuck reasons. The e2e harness's
    fake PostgREST gained a minimal `rpc` route for it.
37. **Better inputs (part 5 step 2).** Four adviser questions added to existing screens (no new
    screen, no migration — new answer ids in the same jsonb): how much of the money they could
    afford to lose (capital screen; required once there is money, because it is the engine's
    hard limit on a first test), who they could reach this week without advertising (access),
    which days (time), what people already ask them for help with (execution, optional free text
    ≤160 chars, quoted to the model as data). The rest of the brief's list was already asked
    (skills, access, assets, money, hours, place, travel, goal, limits, age, languages). Every
    new answer is normalised and passed to the engine; empty is written as UNKNOWN. Answers that
    contradict each other are named on the consultation's last step with a jump back to fix them.
38. **Idea engine v2 (part 5 step 3).** Staged, behind `IDEA_ENGINE=v2` (default v1 until the
    owner reads the comparison): understand (code) → 24 candidates across five types + the
    founder synthesis (1 call) → hard-limit filter in code (affordable loss, hours ×1.25, age,
    licence under 18, travel) → fit from `assessFit` with the profile answer behind each
    dimension (none = "Not known yet") → money in code (price × volume × margin vs the income
    target; hours from volume × hours per unit) → attack the best 7 (1 call; fatal ones drop, the
    strongest surviving objection becomes the first assumption and test) → choose up to three,
    one per type first, never a weak fit or over-hours numbers → expand with the existing
    direction writer told exactly which directions to write (1 call). 3 calls instead of 1.
    Fewer than three is returned as is; none is an error naming what is unknown. Each direction
    stores its engine notes (money check, evidence, objection) in `candidate.engine`. Per-
    consultation grounding (Search) was not added: it stays on demand from Market (cost per
    consultation would triple again); measured cost/time in engine-compare.md.
39. **Reliability (part 5 step 5).** Already in place before this step: every model response is
    validated against its zod schema (and the provider schema); a bad response is retried once
    with the validation error quoted back; transient provider errors try the fallback model;
    then the founder sees a clear retry screen with their answers kept — never partial output.
    Every call logs tokens and duration (`GEMINI_CALL`). Added: `business_dna.generation`
    (migration 0020) — engine, prompt version, model, settings (thinking level; temperature and
    max tokens are the model defaults, recorded as such), call count, duration, the v2 trace and
    the validated response. "Raw response" is stored as the validated JSON, not the byte-for-byte
    text. Prompts live in versioned files (`ENGINE_PROMPT_VERSION`). Leave-and-return: roadmaps
    build in the background (part 3); a consultation's generation still runs within the
    request — moving it to a background job is a TODO in REPORT.md.
40. **Flaky e2e:** `cinematic.spec.ts` "live sound…" measures real audio output; it failed once
    in a full cinematic run while the engine comparison loaded the machine and passed alone
    (2026-11-16). Not caused by the opening (the spec's URLs skip it). Left as is, noted.
41. **Search (owner step 5).** New public pages /ideas (five real engine outputs for sample
    founders, labelled as examples), /for-founders (the opening's three situations), /faq (nine
    answers about what the product actually does, with FAQPage data); /how-it-works and /about
    reused (How it works gains the new Today screenshot). Titles "<Page> — Solventia", one H1,
    canonical, breadcrumb JSON-LD. Footer link row on every public page (plain <a>), How it works
    + Questions in the header, a server-rendered "Solventia, in brief" with links under the film.
    sameAs is an empty array with a TODO: placeholder URLs in structured data would point Google
    at pages that do not exist. No hreflang: Hindi is served at the same URLs (cookie), not at
    separate ones. robots blocks /dashboard (incl. /dashboard/admin), /admin, /review, /api/,
    /consultation.

42. **The reveal and the world's ready time (go-live step 1).** The reveal itself adds no long
    task: in the still version (no 3D) there are none at all while it plays; in the film, the long
    tasks inside the reveal window are the world's shader compile (they end at `cine:shaders`).
    The blur on the lead-out and the soft-light blend on the glint were removed anyway (the glint
    is now masked to the emblem's shape), and Skip moved to the bottom-right (it covered "Find My
    Business Idea" once the bar showed through the reveal). Ready time on this machine is noisy
    (±0.8 s for the same build). Medians of 4–8 runs, lite, broadband: Skip at once 4.5 s, the
    opening with the reveal 5.6 s (bimodal: 3 of 8 runs 4.2–4.5 s). Turning off any one effect
    did not recover it, and hiding the canvas or keeping the layer opaque did not either: the
    compile is GPU-bound and slows whenever anything moves on screen (no opening at all — the
    film straight away — measured 5.4–6.6 s). So the "≤ 200 ms worse" check is NOT met. What a
    visitor sees: at broadband the lockup still arrives after the world is ready (no hold); at
    4× CPU the hold grows from about 0.9 s to 1.4 s. Kept, because the opening is the owner's
    requirement and the time is spent on screen, not on a spinner. A follow-up that would pay
    for it: create the canvas sooner (it starts ~0.7 s after the bundle has loaded).

43. **Roadmap: "Week 01 couldn't be prepared" and the minute-long wait (go-live step 3).** The
    one allowed real run (scripts/engine/roadmap-probe.test.ts, docs/redesign/perf/
    roadmap-probe-before.json) SUCCEEDED: skeleton 13.8 s + week 1 18.1 s, one attempt each,
    1.9k and 2.5k thinking tokens at the model's default thinking. So the slowness is structural
    (two dependent calls, both thinking at full depth) and "failed" can only be stored when the
    week call throws — which it does when the model's answer fails JSON or the strict schema
    twice (a 5th step bullet, 25 list rows, a quiz answer of 3, "true" as a string). Each miss
    doubles the week's time, which is the "over a minute". Production's own error text is in
    `roadmap_weeks.generation_error`; I could not read it (anon key only). Fix: both calls at
    thinking "low" with output caps; the week's answer is REPAIRED before validation
    (src/lib/roadmap/repair.ts, unit-tested: clamps and trims, never invents); then the existing
    retry that quotes the error back; then a much simpler prompt (minimal thinking, one try).
    "Try again" (retryWeek) already regenerates only that week. Vercel maxDuration is now set
    explicitly to 300 s (it was unset). Week 1 ≤ 25 s is an ESTIMATE from the measured token
    rate (~200 tokens/s; low thinking removes most of the 4.3k thinking tokens): not measured
    again, to stay within the one allowed real run. Skeleton and week 1 stay sequential (week 1
    needs the skeleton's title and objective). The wait: real steps from the database, the
    plan's phases the moment they are saved, week 1's missions the moment they exist, and
    "write down 5 people you could ask" — kept in this browser and offered in Week 1's first
    list mission ("Add the N names you wrote down").

44. **Cost and speed of idea generation (go-live step 4).** Measured on the real model, profile
    P01, one run each (docs/redesign/engine-compare-after.json vs engine-compare.json):
    v1 35.5 s / 12.4k tokens (3.7k thinking) → 20.4 s / 8.6k (no thinking at "low");
    v2 76.2 s / 23.4k → 57.3 s / 19.9k (12 candidates, the best 5 attacked, low thinking).
    The bar for making v2 the default was ≤ 45 s AND no more tokens than today's v1 (12.4k):
    v2 misses both, so **IDEA_ENGINE stays v1** — v2 still writes 12 candidates, attacks them and
    then writes three full directions, which costs more than v1 writing three in one call.
    One run per engine is a small sample; the quality figure (v2 1/3 directions passing all
    five checks vs v1 0/3 here, 23% vs 3% over ten profiles before) is why v2 is kept behind the
    switch. Every GEMINI_CALL line now carries `estCostInr` from GEMINI_PRICE_IN/OUT (₹ per 1M
    tokens; thinking billed as output) — null until the owner sets the prices, because the
    price of this model is not something to guess. The wide stage keeps its prompt contract
    beside the provider schema on purpose: it is the fallback when Gemini rejects the schema.
    GEMINI_LITE_MODEL (unset = the main model) is used for Ask Sol and translation. Daily
    limits count rows that already exist (business_dna, roadmaps, the founder's
    mentor_messages) since midnight India time; a counting error never blocks anyone. The wait
    screen now quotes the measured time ("20 to 30 seconds") and shows its three real steps.

45. **Hindi and plain words (go-live step 5).** One style rule per language in
    src/lib/ai/prompts/style.ts, used by every generator (PLAIN_LANGUAGE_RULE, buildLanguageRule)
    and by the translator: spoken Haryana/Punjab Hindi in Devanagari with everyday English words
    written in Devanagari, and English a 14-year-old reads, titles ≤ 6 plain words. The
    translator now keeps only brand, app and tax names in Latin script (AI, GST, UPI, WhatsApp,
    Instagram, LinkedIn, Excel, Google). style.test.ts checks a jargon list (English and
    Sanskrit-heavy Hindi) and a 25-word sentence limit over the examples AND the whole UI
    catalogue; 38 strings were rewritten to pass. "उद्यम" is not on the list: Udyam
    Registration is the scheme's official name. AI content already stored in English is
    translated once on demand (content_translations, now on GEMINI_LITE_MODEL) and reused — that
    path existed; the local fake translator had stopped recognising the new prompt and was
    updated. The Hindi pass of `npm run scan` (42 pages: 3 founder states × 390/1440 × 7 routes)
    finds no untranslated text; the logo tagline is the brand's own and is marked translate="no".

46. **Dashboard (go-live step 6).** Width: the frame is up to 1520 px with side padding
    clamp(20px, 4vw, 64px) (was 1312 px), lead and body paragraphs stop at 68ch; the pages'
    existing two-column layouts (headline + figure, card pairs) now get the room — checked at
    1366, 1536, 1920 and 390 (docs/redesign/perf/width-*). Tab flash, reproduced frame by frame
    (.e2e-tmp/tools/flash.mjs, 50 ms): the shell was NOT remounting and the data was cached; the
    flash was the page entrance (dash-rise: every section from opacity 0, staggered to 700 ms)
    replaying inside the persistent shell on each tab switch. It now plays once per visit;
    after a switch the new page is fully there from the first frame. Links also preload on
    intent (hover/touch). The active pill already followed the target path at navigation start.
    `npm run scan` (scripts/scan.mjs): every dashboard route × 390/1440 × en/hi × three seeded
    founder states, plus the top bar at 360 — 90 pages, 0 findings after fixing the two it
    found: the phone top bar's logo link and the Settings switches were under 44 px (the shared
    Switch is now a 44×44 target with the same visible track).

47. **Small items (go-live step 7).** "How it works" appeared twice in the desktop header (a
    scroll-nav button and the public-pages link) and twice in the footer (its list and the
    public-pages row). Now one per menu: the header keeps the real <a href> (search engines
    follow it; the button copy is hidden on desktop), the phone menu keeps its one entry, the
    footer keeps its list entry, the homepage summary keeps its own. A test checks header and
    footer. The silver S on lite (pre-baked matcap ≤ 150 KB, only if ≤ 0.3 s) was SKIPPED, as
    the owner allowed when usage runs low: it changes the live 3D scene on launch day and needs
    its own before/after measurement; the lite S keeps the 2026-11-16 hemisphere ×1.3 tune.

48. **The cut S, and the new transition (owner, 2026-11-16, urgent).** The S after the reveal
    was two clipped halves of the logo; at fractional sizes and zooms their clip edges left a
    seam. Now the mark at rest is ONE whole copy of the original logo; the halves (and the
    glint) exist only while the reveal runs, in exactly the same box, and are hidden when it
    ends, with reduced motion and on skip. Checked by pixels: after the full sequence the S is
    identical to a fresh copy of the original drawn in the same box — 0 differing pixels at
    1920×1080, 1366×768 and 390×844 (3×), max channel difference 3/255 at 125 % zoom
    (docs/redesign/perf/s-compare-*.png). The original's gold is itself a soft glow; the
    favicon is the same drawing on a white rounded tile. No visible buttons on any opening:
    "Go to my dashboard" and the visible Skip are gone; Esc skips silently, a screen-reader-only
    Skip remains (not visible, not in the tab order) so assistive technology is never held, and
    every opening ends by itself (3 s default answer; 8 s still-version rule on the hold). The
    exit (CSS only): the text holds 1.5 s, then over 0.6 s it tightens (scaleX .94) and is wiped
    (clip-path) by a 2 px gold scan line sweeping left to right with a faint navy hairline grid
    drawing behind it; in 0.3 s the line shrinks into the screen's centre point — measured at
    exactly the hairline's centre at 1920, 1366 and 390 — and the hairline grows from it;
    a 0.4 s still beat; then the reveal. Text to finished logo ≈ 4.95 s. verify-intro: ready
    5.2 s broadband (was 5.7 s), 9.3 s at 4× (was 9.0 s, within the ±0.8 s noise); hold at 4×
    0.3 s (was 1.4 s). Long tasks inside the 4.3 s window come from the world's shader compile:
    with no 3D (still version) the transition and reveal produce none (two runs), and the one
    broadband long task starts as the shaders finish (5,010 → 5,044 ms).

49. **The logo jump and the late name (owner, 2026-11-16, urgent).**
    - Jump: the logo crops its canvas with negative margins; they collapsed through the whole
      logo's plain wrappers but not through the absolutely placed halves, so during the reveal
      the halves sat 59 px higher (1920) than the whole logo they hand over to — the same cause
      as the earlier "cut S". All three boxes are now `flow-root`: measured identical (to 0.1 px),
      and an e2e test records the S every frame from 1 s before the reveal ends to 1 s into the
      film (≤ 1 px, never invisible). The hairline draws at the centre, then drops below the
      lockup during the still beat (y 636 at 1920: under the S base 616 and the tagline 622),
      before any letter shows; it never crosses the letters. All reveal animations fill.
    - Name: the head gate reads the first name from the Supabase session cookie in this browser
      (else the dashboard's cache, sol-first-name) before the first paint; an inline script by the
      text writes it; React's first render reads the same, so it never changes. getWelcomeInfo
      only refreshes the cache (no refetch on focus). All opening words are also frozen in the
      language of their first render: the founder's saved language arriving after load had
      switched "Welcome back" to Hindi mid-opening. The text is wiped to opacity 0 (fill) and
      unmounted after the wipe.
    - The freeze behind both: frame-by-frame capture showed the screen painting NO frames for
      0.65–1.15 s as the exit began (no main-thread long task): the 3D canvas and the logo SVGs
      were drawn for the first time the instant the reveal uncovered them. Now the opening's
      ground is the sky at 99.6 % (same colour; the canvas keeps being drawn beneath), the
      lockup is pre-painted under it once the world is ready, and the exit starts only when the
      text has held ≥ 1.5 s AND the world is ready AND frames have run smoothly for 300 ms
      (cap 6 s). Result: no frame gap during the exit or the reveal in 3 of 3 runs;
      verify-intro 0 long tasks at broadband and 4×, ready 4.3 s / 7.9 s. Cost: on slow
      machines the text holds longer (≈ 5 s here) — still and readable — instead of freezing
      mid-motion. Frames: docs/redesign/perf/sequence/ (every 100 ms, 1920 and 390, new and
      signed in).

50. **A 4 s cap on the opening, and the reveal without the world (owner, 2026-11-16).**
    - The text holds ≥ 1.5 s (signed in: counted from the second line, which fades in 1.2 s
      after "Welcome back, <name>." by CSS from the first paint) and never longer than 4.0 s
      after it first appears — counted from the first contentful paint for the server-rendered
      returning openings, not from hydration. The exit is aimed at 3.7 s and fired from both a
      timer and a per-frame check (a due timer was held back 1.8 s while shaders compiled).
    - World ready and calm before the cap → the reveal runs over the world ("world" path, as
      before). Cap reached first → the "flat" path: the same reveal of the film's REAL lockup
      (not a copy: 0 px movement by construction) over the pearl sky, with the world's drawing
      AND its shader preparation held (`worldHeld`) until the reveal has finished; the lockup
      then holds until the world is ready and calm (≤ 1.2 s wait for calm, never a downgrade).
      The world is invisible at the film's opening anyway (`--world-in` 0 until the first
      scroll), so there is nothing to crossfade: the finished frames of the two paths are
      pixel-identical except the scroll cue's own moving line
      (docs/redesign/perf/finished-frame-flat-vs-3d-*.png). Cost: on the flat path the world is
      ready later (verify-intro: 5.8 s broadband, 12.4 s at 4× CPU), hidden behind the lockup.
    - The exit is now compositor-only (transform/opacity; the wipe and grid are sliding windows,
      the scan line shrinks with scaleY), every animated piece is its own layer from when the
      text has faded in, the reveal's selectors no longer use `:is(main[…])` (that restyled the
      whole page), the exit starts on the DOM directly, the film's prop-less layers are memoised,
      the hand-off waits for the reveal's CSS animations to finish, and the openings' styles come
      first in the HTML (streamed late, a slow device showed the lockup for ~2 s before the
      question).
    - **Known issue (accepted by the owner, 2026-11-16):** on this PC (Vega 3 GPU) the compositor
      still occasionally draws no frame for up to ~0.5 s early in the exit — V8 GC safepoints and
      GPU work outside our code. Gaps up to ~600 ms are accepted for now. Also: signed in at
      1920 with 4× CPU throttling the text held 4.3 s once (the browser drew no frame for
      ~0.6 s at the cap); on the live site the same case held 5.1 s (the page's scripts were
      ready only 3.1 s after the text appeared, and the main thread stayed busy — an exit run by
      React cannot start sooner). Every other measured case, local and live, ≤ 3.9 s
      (docs/redesign/perf/cap-live).

51. **Honest wait text (owner, 2026-11-16).** The idea screen says "This can take up to a
    minute." and, after 60 s, "Still working. Your answers are saved, so you can leave and come
    back." (en + hi). The roadmap screens state an upper limit ("up to a minute or two"). The
    roadmap screen's client-side ceiling moved from 120 s to 310 s — just past the server's own
    limit (maxDuration 300 s) — so it no longer reports a failure while the request can still
    succeed.

52. **Tab switch showed the old page for 6–7 s (owner, 2026-11-16).** Cause: the navigation
    highlight follows the router's location (it changes at the click), but the page area renders
    the old route until the new one has resolved — and a tab's code (Proof: 7 chunks) downloads on
    its first click; there was no pending UI, so on a slow connection the old page stayed. Proof's
    data was a second wait: the page fetched the founder state, THEN the proof overview (a client
    waterfall), and the overview was six serial database round trips. No dashboard route blocks on
    data (no awaited loaders; the auth guard reads the cached user), and Proof makes no AI call to
    open (it writes a direction's assumptions once, the first time). Fix: the dashboard layout
    shows the new page's frame (its name and skeletons) whenever the URL has moved to a page that
    has not rendered yet (after a 50 ms grace, so a ready page never flashes); every page's
    skeleton names the page; all dashboard pages' code loads in the background once the dashboard
    is idle; Proof's route preload (hover/touch) starts its data without awaiting it; and the
    overview's independent reads run together (6 round trips → 4). e2e/tab-switch.spec.ts: every
    tab shows its page within 300 ms with the server 3 s slow (46–195 ms measured), and a tab whose
    code is still downloading shows its frame in 84 ms (the old code fails this test: the Roadmap
    page stayed on screen). Production timings per tab could not be measured here — it needs a
    signed-in founder account on solventia.in.

53. **Google sign-in through Google Identity Services (owner, 2026-11-16).** Google's consent
    named the Supabase project's domain because the redirect flow passes through it; a paid
    Supabase custom domain was ruled out. Google's own button (pill, large, outline/white —
    Google's rules allow no other colours or type) plus One Tap now run on our origin, with the
    same client ID; the ID token goes to our server (signInWithGoogleIdToken →
    supabase.auth.signInWithIdToken with the raw nonce; Google got its SHA-256). Where the founder
    lands is shared with /auth/callback (lib/auth/after-sign-in.ts): a finished consultation →
    /consultation?submit=1, else the saved `next`, else the dashboard. Until Google's script has
    loaded — or if it never does (blocked, offline, over 5 s) — the old redirect button shows
    and works unchanged. In e2e, accounts.google.com is blocked by default (the fallback), and
    e2e/google-gis.spec.ts serves a fake Google script whose token the fake GoTrue checks for the
    hashed nonce.
