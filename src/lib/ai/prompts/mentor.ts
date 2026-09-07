import { generateStructured } from "@/lib/ai/gemini.server";
import { env } from "@/lib/env.server";
import { MentorResponseSchema, type MentorResponse } from "@/lib/ai/schemas";
import { formatProfileForPrompt, PLAIN_LANGUAGE_RULE } from "@/lib/ai/prompts/shared";
import { computeFounderGenome, computeFounderPersona } from "@/lib/profile/founder-genome";
import type { NormalizedProfile } from "@/lib/profile/normalize";

const SYSTEM_INSTRUCTION = `You are Sol — a clear, honest, beginner-friendly business mentor. ${PLAIN_LANGUAGE_RULE} Avoid empty motivational clichés, corporate language, and emoji. Be direct.

You are not blindly encouraging — that would make you useless as a mentor. Actively look for reasons to push back:
- If the evidence for an idea is weak, say so plainly: "I wouldn't spend money on this yet" — not "this could work with more validation."
- If something the founder is excited about conflicts with a real constraint in their profile (their time, capital, risk tolerance, location), name the conflict directly: "This looks exciting, but it doesn't fit your current 5-hour weekly limit. Your second option is more realistic right now."
- If they report a blocker (e.g. no replies to outreach), do not tell them to just try harder or send more of the same. Diagnose what's actually wrong first, then give a specific, different next step.
- If they say they don't understand something, drop all business terminology and re-explain it in the simplest possible concrete terms — actions and numbers, not concepts.
Being right and useful matters more than being nice. Distinguish "I recommend..." (your opinion) from "The evidence shows..." (something actually established) — set isRecommendation accordingly. Never claim to have done something you haven't (you cannot browse for them mid-conversation, complete tasks for them, or guarantee outcomes).`;

interface MentorContext {
  profile: NormalizedProfile;
  opportunityTitle: string | null;
  currentPhase: string | null;
  /** The founder's actual current week — Sol should reason against THIS,
   * not a generic "how's it going". Null before a roadmap exists, or for
   * a legacy roadmap generated before week-level tracking. */
  currentWeek: { title: string; mission: string | null } | null;
  /** The next not-done required task's plain "what" text, if any. */
  nextTaskWhat: string | null;
  recentHistory: { role: "user" | "assistant"; content: string }[];
}

export async function generateMentorReply(
  ctx: MentorContext,
  userMessage: string,
): Promise<MentorResponse> {
  const history = ctx.recentHistory
    .slice(-10)
    .map((m) => `${m.role === "user" ? "Founder" : "Sol"}: ${m.content}`)
    .join("\n");

  const genome = computeFounderGenome(ctx.profile);
  const persona = computeFounderPersona(ctx.profile, genome);

  const prompt = `Founder profile:\n${formatProfileForPrompt(ctx.profile)}

Founder Genome (deterministically scored, not your opinion): ${persona.name} — ${persona.attributes.join("; ")}. Strongest dimensions: ${[
    ...genome.dimensions,
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((d) => d.label)
    .join(", ")}. Weakest: ${[...genome.dimensions].sort((a, b) => a.score - b.score)[0]?.label}.

Current opportunity: ${ctx.opportunityTitle ?? "none selected yet"}
Current roadmap phase: ${ctx.currentPhase ?? "none yet"}
Current week: ${ctx.currentWeek ? `"${ctx.currentWeek.title}"${ctx.currentWeek.mission ? ` — mission: ${ctx.currentWeek.mission}` : ""}` : "no active roadmap week yet"}
Next pending task: ${ctx.nextTaskWhat ?? "none — either done for now or no roadmap yet"}

Recent conversation:
${history || "(this is the first message)"}

Founder just said: "${userMessage}"

Reply as Sol. Be specific to their ACTUAL current week and next task when relevant — if they mention progress or a blocker, reason against what their real current mission/task actually is, never a generic "how's business going". Be specific to their real situation — never generic. If useful, give up to 3 concrete next actions; omit nextActions entirely if a list isn't actually helpful here.`;

  return generateStructured(MentorResponseSchema, {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt,
    callSite: "generateMentorReply",
    purpose: "SOL_MESSAGE",
    route: "mentor/send",
    thinkingLevel: env.MENTOR_AI_THINKING_LEVEL,
  });
}
