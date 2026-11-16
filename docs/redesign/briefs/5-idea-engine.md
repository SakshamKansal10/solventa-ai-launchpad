# Task: make the business directions real, specific and checkable

You are working in the Solventia codebase (solventia.in). This task is about the backend that turns consultation answers into business directions and roadmaps. Do not change the visual design.

**Branch rule:** work only on the git branch `redesign-v2`. Commit after each step. Never commit to `main`, never force-push.

## The problem to solve

A direction is only useful if this person, in this town, with this money and these hours, could start testing it next week. Today the engine recommends directions while key profile fields are empty (skills and experience show "Not provided yet"), states market numbers with no source, and has no check that the income target is reachable. The goal is ideas that are grounded, honest about what is unknown, and serious enough to act on.

## Step 1: audit and report before changing anything

Read the consultation flow, the prompts, the model calls and how results are stored. Reply with:

- every question asked, how the answer is stored, and which answers the prompts use and which they ignore
- the generation pipeline as it is today: how many model calls, what each one produces, how output is parsed and validated, what happens on a bad response
- three real stored examples (profile in, directions out) with your honest critique: what is generic, what is unsupported, what could not be acted on
- the model, temperature and token settings, and the cost and time per consultation

Wait for my OK on your proposed changes before editing.

## Step 2: better inputs

Collect what a good adviser would ask, in as few questions as possible. Required first, then follow-ups only where the answer matters.

- **Skills and experience:** what they have done, what people ask them for help with.
- **Access:** who they already know (shop owners, farmers, students, a family business), and which customers they can reach this week without advertising.
- **Assets:** phone, laptop, vehicle, space, tools, an existing shop.
- **Money:** how much they can spend, and how much of it they can afford to lose.
- **Time:** hours per week and which days.
- **Place:** city or town, and whether they can travel.
- **Goal:** income target and by when.
- **Limits:** what they will not do, age if under 18, languages.

Rules:

- Validate answers and ask about contradictions instead of silently accepting them.
- Store the profile as structured data with a schema, not as a block of text.
- Any field left empty is passed to the engine as "unknown". The engine must not guess it.

## Step 3: a pipeline with checks, not one big prompt

Build the generation as separate stages, each with a validated JSON output:

1. **Understand.** Turn the profile into a short structured brief: strengths, hard limits, unknowns.
2. **Generate wide.** Produce 20–30 candidate directions across different types (service, trading, local agency, digital, skill-based) so the result is not three variations of one idea.
3. **Filter in code.** Drop candidates that break a hard limit: needs more capital than they can lose, more hours than they have, a licence or age they do not have, travel they cannot do.
4. **Score fit.** For each of the five fit dimensions, the model must quote the profile field it relied on. No quoted field means the dimension is "Not known yet". The label is computed in code from these, never written by the model.
5. **Ground it.** For the top candidates, look up real local facts with a search or grounding tool if the project has one (tell me if it does not, and what adding one would cost). Store each fact with its URL and date. Anything not found is stored as an estimate and labelled as one.
6. **Check the money in code.** From the model's stated price, volume and margin, calculate monthly income and hours needed. Reject or flag a direction whose numbers do not reach the user's income target within their hours.
7. **Attack it.** A separate model call argues why each remaining direction would fail for this person in this place. Directions with a fatal objection are dropped. The strongest surviving objection becomes the first thing the roadmap tests.
8. **Choose three.** Different from each other, each with: customer, problem, offer, how money is made, the fit breakdown with quotes, the main risk, and a first test that takes under a week and costs little or nothing.
9. **Be honest.** If nothing fits well, say so and say what is missing. Never upgrade a weak fit to fill three slots.

## Step 4: roadmaps that can be executed

- Each mission is one concrete action that produces something: a list, logged conversations, a price sheet, a first booking.
- Each mission carries: workspace type, fields, a done rule that code can check, a time estimate, a fallback for when the user is stuck, and which assumption it checks with what threshold (see `4-working-features.md`).
- Week 1 never needs money, registration or a website.
- Total time per week must fit the hours the user gave.
- Later phases stay marked as depending on results, and are regenerated from the proof collected.

## Step 5: reliability

- Validate every model response against a schema. On failure, retry once with the validation error, then fail with a clear message to the user. Never show partial or malformed output.
- Store with every result: prompt version, model, settings, the profile snapshot and the raw response. This makes results reproducible and comparable.
- Handle timeouts and rate limits. The user sees progress and can leave and come back.
- Keep prompts in versioned files, not inline strings.

## Step 6: prove it is better

- Create 10 test profiles that differ in city size, money, hours, skills and age, including two difficult ones (very low capital, under 18).
- Write a scoring sheet with five yes/no checks per direction: specific to the place, startable within a week, numbers add up, every fit claim has a quoted profile field, no unlabelled market facts.
- Run the old pipeline and the new one on all 10 and give me the table of scores, cost and time for both.
- Add a command I can run to repeat this test whenever a prompt changes.

## Done when

- No direction is shown with a fit claim that has no quoted profile field behind it.
- No market or income number is shown without either a source or an estimate label.
- Every direction's income numbers have passed the code check against the user's target and hours.
- The 10-profile comparison shows the new pipeline scoring higher than the old one, and I have the table.

Finish with what changed, the new cost and time per consultation, and anything you recommend but did not build.
