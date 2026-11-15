# Part 4 — working features: data model and plan

The brief's approval gate is overridden by the run instructions (decisions 3). Migrations are
written as files only; the owner applies them (REPORT.md lists the order). Every feature checks
the schema it needs (`schema-capabilities.server.ts`) and degrades to today's behaviour until its
migration is applied, so a deploy before the migration never breaks a page.

## What exists today
- `roadmap_tasks` (missions): what, why, how, steps jsonb, done_when text, time_estimate,
  deadline, status pending | in_progress | done | blocked, blocked_reason, required,
  evidence_required, assumption_category, week_id. RLS: own rows.
- `proof_assumptions`: title, category, why_it_matters, next_test, success_threshold int,
  origin. RLS: own rows.
- `proof_evidence`: assumption_id, evidence_type, source_person, occurred_on, summary, signal
  supports | neutral | contradicts, url, file_path, task_id, week_id. RLS: own rows.
- Assumption status is already derived in code from evidence (`src/lib/proof/links.ts`).
- Email: `src/lib/actions/email.server.ts` (Resend) — used for "ideas ready".

## Proposed migrations (new files, additive only — no destructive SQL)
### 0015_mission_workspaces.sql
- `roadmap_tasks` + `workspace text` (`list | interviews | learn | summary | generic`, null =
  generic), `workspace_spec jsonb` (target, fields, script, first message EN/HI, questions,
  rule, lesson points, quiz), `done_rule jsonb` (`{ "metric": "list.count", "min": 6 }`),
  `fallback text`.
- `mission_entries` (id, user_id, task_id → roadmap_tasks on delete cascade, kind
  `list_row | interview | quiz | note | summary`, data jsonb, created_at, updated_at).
  RLS: `auth.uid() = user_id` for select / insert / update / delete. Index (task_id, kind).
### 0016_proof_rules.sql
- `proof_assumptions` + `check_task_id uuid` (→ roadmap_tasks, set null), `success_rule jsonb`
  (`{ "metric": "interviews.answer", "equals": "yes", "threshold": 3, "outOf": 4 }`).
- `proof_evidence` + `added_by_user boolean default false` ("Add other proof": shown, never
  changes a status).
### 0017_stuck_and_reminders.sql
- `mission_stuck_events` (id, user_id, task_id, reason `cant | time | wrong`, created_at). RLS
  own rows (insert / select).
- `roadmap_weeks` + `shifted_days int default 0` ("No time this week" moves the week 7 days).
- `profiles` + `weekly_reminder boolean default false`, `reminder_weekday smallint` (0–6),
  `reminder_asked_at timestamptz`.
### 0018_admin_flag.sql
- `profiles` + `is_admin boolean default false` (set by hand by the owner) for the drop-off page.

## Derived, never stored
- Mission done-ness gate: `done_rule` evaluated against `mission_entries` in code; Mark as done
  stays disabled with the reason until met. Missions without a rule: generic (notes + "what did
  you produce?"), no gate.
- Assumption status from `success_rule` over the check mission's entries: Not checked yet /
  Checking / Supported (threshold reached) / Not supported (threshold unreachable) / Unclear (all
  logged, mostly "not sure"). The AI never sets a status; the user never picks one.

## Order (one commit each, numbered as the brief)
1 workspaces + done rules · 2 proof that updates itself · 3 Stuck? + failed check · 4 scripts
and templates (generator schema + prompt rule) · 5 ask what is missing · 6 estimates and sources ·
7 Make it official (static, reviewed content; "Being reviewed" until the owner signs off) ·
8 weekly reminder (Resend, already in the project) · 9 plain words · 10 drop-off admin page.
