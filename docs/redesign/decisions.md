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
