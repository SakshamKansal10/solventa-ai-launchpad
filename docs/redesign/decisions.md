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
   | white / mist | `sol-surface` (white canvas), `sol-pearl` (cool pearl supporting cards, nav pill) |
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
