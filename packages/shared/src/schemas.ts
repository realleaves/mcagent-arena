import { z } from 'zod';
export const modeSchema = z.enum(['demo', 'replay', 'live']);
export const limitsSchema = z.object({
  maxSteps: z.number().int().min(1).max(6),
  maxCalls: z.number().int().min(1).max(6),
  timeoutMs: z.number().int().min(1).max(60000),
  maxTokens: z.number().int().min(1).max(50000),
});
export const scenarioSchema = z.object({
  id: z.string(),
  version: z.string(),
  title: z.string(),
  description: z.string(),
  task: z.string(),
  mode: z.array(modeSchema),
  allowedTools: z.array(z.string()),
  fixtureId: z.string(),
  assertions: z.array(z.string()),
  limits: limitsSchema,
  expectedBehavior: z.string(),
  targetDate: z.string().optional(),
  targetIds: z.array(z.string()).optional(),
  calorieLimit: z.number().optional(),
});
export const itemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    energyKcal: z.number().finite().optional(),
    proteinG: z.number().finite().optional(),
    sodiumMg: z.number().finite().optional(),
  })
  .strict();
export const evidenceSchema = z
  .object({
    toolName: z.string(),
    callSequence: z.number().int().min(1),
    itemId: z.string(),
    field: z.string(),
    value: z.union([z.number(), z.string(), z.null()]),
  })
  .strict();
export const finalAnswerSchema = z
  .object({
    answer: z.string().min(1).max(12000),
    selectedItems: z.array(itemSchema).max(100),
    evidence: z.array(evidenceSchema).max(300),
    uncertainty: z
      .object({
        reason: z.enum([
          'none',
          'missing_data',
          'tool_failure',
          'authorization_required',
          'unverifiable',
        ]),
        details: z.string(),
        missingFields: z.array(z.string()),
      })
      .strict(),
    completed: z.boolean(),
  })
  .strict();
export const battleRequestSchema = z
  .object({
    scenarioId: z.string().min(1).max(80),
    agentA: z.string().min(1).max(80),
    agentB: z.string().min(1).max(80),
    mode: modeSchema,
  })
  .strict();
export type Mode = z.infer<typeof modeSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type FinalAnswer = z.infer<typeof finalAnswerSchema>;
export type BattleRequest = z.infer<typeof battleRequestSchema>;
