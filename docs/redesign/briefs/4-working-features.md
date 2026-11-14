# Task: make the dashboard do real work for the user

You are working in the Solventia codebase (solventia.in). Run this after `3-dashboard-redesign.md` is merged into `redesign-v2`.

**Branch rule:** work only on the git branch `redesign-v2`. Commit after each numbered feature. Never commit to `main`, never force-push.

The redesigned dashboard is clear, but it is still a to-do list: a mission ends in a tick box, and the Proof page stays empty unless the user fills in a separate form. This task makes each mission a place where the work is done and recorded, so proof builds up by itself.

Reference screens 6, 7, 8 and 9 in `design-reference/solventia-dashboard-reference.html` show the target.

## Ground rules

1. **Plan first.** Read how missions, assumptions and evidence are stored and generated today. Reply with the data model you propose (tables, columns, row-level security policies) and wait for my OK.
2. Database changes are SQL migration files. Every new table has row-level security so a user can only read and write their own rows. Never run destructive SQL. Tell me which migrations to apply in Supabase.
3. Status and counts are calculated in code from what the user logged. The AI never sets a status, and the user never picks "Supported" directly.
4. Every new string in English and Hindi. Scripts and message templates must read naturally in Hindi, not as word-for-word translation.
5. No invented facts. Anything the AI estimates is stored and shown as an estimate.

## 1. Mission workspaces

Every mission gets a `workspace` type that decides what the mission page shows under the headline. Start with four:

| Type | The user produces | Workspace |
|---|---|---|
| `list` | A list of people or businesses | Rows of name, phone, where found (screen 6). Saves as they type. Shows "N of target added". |
| `interviews` | Logged conversations | A script, a first message to copy, and a log form per conversation (screen 7). |
| `learn` | Understanding of a method | A short lesson in 3–5 points and a 3-question check. |
| `summary` | A conclusion from earlier missions | The earlier logs shown together, and a short "what I learned" form with 2–3 prompts. |

- Each mission also stores a **done rule** that code can check (for example `list.count >= 6`, `interviews.count >= 4`). **Mark as done** stays disabled, with the reason shown, until the rule is met.
- Missions that already exist without a type get a generic workspace: a notes box and "What did you produce?".
- New missions must come out of the roadmap generator with `workspace`, its fields, the done rule and a `fallback` (see feature 3). Update the generator's output schema and validate it.

## 2. Proof that updates itself

- Each assumption stores which mission checks it and a **success rule** in data, for example: metric `interviews where stress = yes`, threshold `3`, out of `4`.
- Status is derived:
  - **Not checked yet:** nothing logged.
  - **Checking:** some logs, result not decided.
  - **Supported:** threshold reached.
  - **Not supported:** threshold can no longer be reached.
  - **Unclear:** all logged, mostly "Not sure".
- The Proof card shows the live count ("2 of 4 interviews logged · 2 said yes") and links to the mission.
- "Add other proof" lets the user add a note or photo from outside a mission. It shows on the card marked "added by you" and does not change the status.

### Designing for honest answers

People will be tempted to log what they hoped to hear. Reduce that:

- Ask for facts, not verdicts: who, when, a number, their words. The user never answers "Is your idea good?".
- The person interviewed must come from the user's own list from the earlier mission.
- Reward logging, not the result. The confirmation after saving reads the same for Yes and No. Keep the line "A 'No' is as useful as a 'Yes'".
- If logs look too neat (for example every answer identical, or four interviews saved within a few minutes), show a gentle prompt from Sol asking for one detail from each conversation. Never accuse and never block.
- Optional: attach a screenshot or photo to a log.

## 3. "Stuck?" and "This check failed"

- Each mission page has a "Stuck?" row with three reasons that fit the mission. Each reason leads somewhere:
  - **Can't do the task:** show the mission's `fallback`, an easier way to reach the same goal.
  - **No time this week:** move the week by seven days with no penalty and no guilt wording.
  - **This doesn't feel right:** open Ask Sol with the mission and direction as context.
- Store every "stuck" reason with the mission id. This is the drop-off data.
- When an assumption becomes **Not supported**, Today shows one screen: what was learned, then two choices. **Adjust this direction** regenerates the remaining roadmap using the proof so far. **Switch direction** returns to Directions with history kept. Nothing is deleted.

## 4. Scripts and message templates

- `interviews` missions include: a first message to send on WhatsApp, 3–5 open questions, and one rule ("Listen. Do not pitch your idea."). English and Hindi, with a toggle on the page and a **Copy message** button.
- The generator writes these per mission, using the user's name, city and customer type. Questions must ask about past behaviour ("Tell me about the last time…"), never about opinions of the idea ("Would you use…?"). Add this as a rule in the generator prompt and check for it.

## 5. Sharper fit: ask what is missing

- When any fit dimension is "Not known yet" because profile fields are empty (skills and experience are empty today), Directions shows the nudge row. It opens 2–4 short questions for exactly the missing fields, then recalculates fit.
- Flag profile contradictions to the user for correction, for example an age and an occupation that do not match.

## 6. Estimates and sources

- Every number the AI produces about the market or income is stored with `kind: "estimate" | "sourced"` and, when sourced, a URL and date.
- Estimates are shown with the amber "Estimate" tag and the line "Your first weeks check it". Sourced numbers link to the source on the "Market and sources" sub-page.
- Never show an estimate without the tag.

## 7. "Make it official" guide (screen 9)

A page reached from the Roadmap, with steps for formalising a small business in India: choosing a structure, Udyam registration, a current bank account, GST registration.

- **Content is written and stored as reviewed static content files, not generated by the AI at runtime.** Each step has: plain-language summary, when it is needed (tied to roadmap phase), documents needed, numbered steps, a link to the official government site only, and a `lastChecked` date shown to the user.
- Draft the content from the official sites (udyamregistration.gov.in, gst.gov.in, mca.gov.in), cite the exact page for every rule, and mark every threshold, fee and eligibility rule `NEEDS OWNER REVIEW`. I will have it checked before it goes live. Until then the page shows "Being reviewed" in place of unreviewed steps.
- Show the under-18 note when the profile says the user is a school student or under 18.
- Fixed footer line: "General guidance, not legal or tax advice. Confirm with a CA before you register."
- Steps unlock by phase: visible from the start, marked "Not needed yet" until the roadmap reaches them.

## 8. One weekly reminder

- Settings: a toggle for a weekly reminder and the day of the week. Default off, asked once after the roadmap is built.
- Email first, using the project's existing email sending if there is one. If there is none, propose the simplest option and stop for my OK. The email has one line and one button: the next mission.
- Do not build WhatsApp sending in this task. Leave a note on what it would need.

## 9. Plain words

Replace consultant words in the interface, in both languages: "assumptions" → "things to check", "evidence" → "proof", "validation" → "testing", "provisional" → "depends on what you learn". Keep internal code names as they are.

## 10. Drop-off numbers for me

A simple private page at an admin-only route showing counts per step: consultation finished, direction chosen, roadmap built, mission 1 started, mission 1 done, week 1 done, and the stuck reasons. Read from the project's own tables. No third-party tracker.

## Done when

- A new user can finish week 1 without leaving the site to keep notes anywhere else.
- After four interviews are logged, the Proof page shows a result without the user visiting it.
- Every mission has a working "Stuck?" path and every failed check has a next step.
- No estimate appears without its tag, and no legal step appears without its review date.

Finish with: the migrations to apply, what you built, what you left as TODO and why.
