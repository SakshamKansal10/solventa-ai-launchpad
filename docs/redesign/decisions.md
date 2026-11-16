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
