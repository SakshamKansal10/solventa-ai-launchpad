import { generateStructured } from "@/lib/ai/gemini.server";
import { z } from "zod";

async function tryIt(label: string, schema: z.ZodTypeAny) {
  try {
    const t0 = Date.now();
    await generateStructured(schema, {
      systemInstruction: "You produce structured test output.",
      prompt: "Produce a sample 2-phase roadmap (1 task each) for a simple tutoring business.",
    });
    console.log(`OK   ${label} (${Date.now() - t0}ms)`);
  } catch (err) {
    console.log(`FAIL ${label}:`, err instanceof Error ? err.message.slice(0, 200) : err);
  }
}

const BaseTask = z.object({
  what: z.string(),
  why: z.string(),
  how: z.string(),
  resource: z.string().nullable(),
  timeEstimate: z.string(),
  deadlineDaysFromStart: z.number().min(0),
  doneWhen: z.string(),
});

const TaskWithRequired = BaseTask.extend({
  required: z.boolean().describe("False for optional tasks, true otherwise."),
});

const TaskWithDependsOn = BaseTask.extend({
  dependsOn: z
    .string()
    .nullable()
    .describe("The exact 'what' text of a prior task this depends on, or null."),
});

const TaskWithBoth = BaseTask.extend({
  required: z.boolean().describe("False for optional tasks, true otherwise."),
  dependsOn: z
    .string()
    .nullable()
    .describe("The exact 'what' text of a prior task this depends on, or null."),
});

function plan(taskSchema: z.ZodTypeAny) {
  return z.object({
    phases: z
      .array(
        z.object({
          key: z.enum(["understand", "explore", "validate", "build", "launch", "improve"]),
          title: z.string(),
          description: z.string(),
          tasks: z.array(taskSchema).min(1).max(3),
        }),
      )
      .min(1)
      .max(3),
  });
}

async function main() {
  await tryIt("baseline (no required/dependsOn)", plan(BaseTask));
  await tryIt("with `required` only", plan(TaskWithRequired));
  await tryIt("with `dependsOn` only", plan(TaskWithDependsOn));
  await tryIt("with both", plan(TaskWithBoth));
}

main();
