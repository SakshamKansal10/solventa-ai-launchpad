-- Redesign v2, part 5 step 5: every consultation's result is reproducible and comparable.
-- Additive only. business_dna already keeps the profile snapshot (onboarding_answers,
-- normalized_signals), the model (ai_model) and the prompt version (prompt_version); this adds
-- how it was produced: engine (v1/v2), prompt version, model and call settings, the number of
-- model calls, the v2 engine's trace (brief, candidates dropped and why, fatal objections, what
-- was missing) and the validated response itself.
alter table public.business_dna add column if not exists generation jsonb;
