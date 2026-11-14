# Task: prepare a safe branch for the redesign

You are working in the Solventia codebase (solventia.in). Do exactly these steps and nothing else.

1. Run `git status`. If there are uncommitted changes, show me the list and ask whether to commit them to the current branch first. Do not discard anything.
2. Confirm the current branch is the main branch (`main` or `master`). Tell me its name and the latest commit.
3. Create a tag on that commit so the current site can always be restored: `git tag before-redesign-v2`.
4. Create and switch to a new branch: `git checkout -b redesign-v2`.
5. Create the folder `design-reference/` at the repo root. I will place `solventia-dashboard-reference.html` in it. If it is already there, leave it.
6. Add or update `CLAUDE.md` at the repo root with these standing rules, keeping anything already in the file:
   - All redesign work happens on `redesign-v2`. Never commit to the main branch, never force-push, never rewrite history, never delete branches or tags.
   - Commit after every completed step with a clear message.
   - Database changes are written as SQL migration files in the project's migrations folder. Never run destructive SQL. Tell me which migrations to apply.
   - Every new user-facing string goes through the existing translation system in English and Hindi.
   - Never invent data, statistics or legal facts.
7. Commit (`chore: start redesign-v2 branch`) and push the branch and the tag: `git push -u origin redesign-v2` and `git push origin before-redesign-v2`.
8. Reply with: the branch name, the tag name, the framework and hosting you detected (for example Next.js on Vercel), the command to run the site locally, and whether pushing this branch creates a preview deployment.
