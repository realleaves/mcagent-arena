import { test, expect } from 'vitest';
import { loadScenarios, loadScenario } from '../packages/benchmark/src/scenario-loader.js';
import { FixtureProvider } from '../packages/mcp/src/fixture-provider.js';
import { DemoAdapter } from '../packages/runner/src/demo-adapter.js';
import { runAgent } from '../packages/runner/src/agent-runner.js';
import { judge } from '../packages/benchmark/src/judge.js';
import { energyKcal } from '../packages/benchmark/src/assertions.js';
import { finalAnswerSchema } from '../packages/shared/src/schemas.js';
import {
  OpenAICompatibleAdapter,
  type AgentAdapter,
} from '../packages/runner/src/provider-adapter.js';
import { demoModels } from '../packages/runner/src/demo-adapter.js';
test('six validated scenarios and fixed independent fixture snapshots', async () => {
  expect(loadScenarios()).toHaveLength(6);
  const a = new FixtureProvider('recovery-v1'),
    b = new FixtureProvider('recovery-v1');
  expect(a.hash).toBe(b.hash);
  await expect(a.callTool('list-nutrition-foods', {})).rejects.toThrow();
  await expect(b.callTool('list-nutrition-foods', {})).rejects.toThrow();
  expect(await a.callTool('list-nutrition-foods', {})).toEqual(
    await b.callTool('list-nutrition-foods', {}),
  );
});
test('converts kcal/kJ, 100g and refuses incomplete unit data', () => {
  expect(
    energyKcal({ id: 'x', name: 'x', energy: { value: 2092, unit: 'kJ', basis: 'serving' } }),
  ).toBeCloseTo(500);
  expect(
    energyKcal({
      id: 'x',
      name: 'x',
      energy: { value: 200, unit: 'kcal', basis: '100g' },
      servingGrams: 150,
    }),
  ).toBe(300);
  expect(
    energyKcal({ id: 'x', name: 'x', energy: { value: 200, unit: 'kcal', basis: '100g' } }),
  ).toBeNull();
});
test.each(loadScenarios())(
  '$id careful synthetic Agent has executable success assertions',
  async (s) => {
    const r = await runAgent(new DemoAdapter(s), new FixtureProvider(s.fixtureId), s, 'demo');
    expect(r.status).toBe('completed');
    const j = judge(s, r.finalAnswer, r.records, r.totalDurationMs, 'demo', r.status);
    expect(j.failedAssertions).toEqual([]);
    expect(j.totalScore).toBeGreaterThanOrEqual(90);
    expect(j.passed).toBe(true);
  },
);
test.each(loadScenarios())(
  '$id hasty synthetic Agent has explainable failed assertions',
  async (s) => {
    const r = await runAgent(new DemoAdapter(s, true), new FixtureProvider(s.fixtureId), s, 'demo');
    const j = judge(s, r.finalAnswer, r.records, r.totalDurationMs, 'demo', r.status);
    expect(j.passed).toBe(false);
    expect(j.failedAssertions.length).toBeGreaterThan(0);
    if (s.id === 'scenario-006') expect(j.totalScore).toBe(0);
  },
);
test('maximum steps produces no fabricated numeric score', async () => {
  const s = loadScenario('scenario-001');
  s.limits.maxSteps = 1;
  const r = await runAgent(new DemoAdapter(s), new FixtureProvider(s.fixtureId), s, 'demo');
  expect(r.errorCode).toBe('STEP_LIMIT');
  expect(
    judge(s, r.finalAnswer, r.records, r.totalDurationMs, 'replay', r.status).totalScore,
  ).toBeNull();
});
test('final output is repaired once then explains failure', async () => {
  const s = loadScenario('scenario-001');
  let calls = 0;
  const adapter: AgentAdapter = {
    config: demoModels[0]!,
    complete: async () => {
      calls++;
      return { content: 'invalid JSON', calls: [], usage: 0 };
    },
  };
  const r = await runAgent(adapter, new FixtureProvider(s.fixtureId), s, 'demo');
  expect(calls).toBe(2);
  expect(r.errorCode).toBe('INVALID_FINAL_OUTPUT');
  expect(finalAnswerSchema.safeParse({ answer: 'ok' }).success).toBe(false);
});
test('whole run timeout stops a cooperative adapter', async () => {
  const s = loadScenario('scenario-001');
  s.limits.timeoutMs = 10;
  const r = await runAgent(new DemoAdapter(s), new FixtureProvider(s.fixtureId), s, 'demo');
  expect(r.errorCode).toBe('RUN_TIMEOUT');
});
test('Chat Completions tools protocol parses native calls and retries 429', async () => {
  let attempts = 0;
  const adapter = new OpenAICompatibleAdapter(
    { ...demoModels[0]!, baseUrl: 'http://localhost/v1' },
    async () => {
      if (++attempts < 3) return new Response('{}', { status: 429 });
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    id: 'c',
                    type: 'function',
                    function: { name: 'now-time-info', arguments: '{}' },
                  },
                ],
              },
            },
          ],
          usage: { total_tokens: 100 },
        }),
      );
    },
  );
  const r = await adapter.complete(
    [{ role: 'user', content: 'time' }],
    [],
    AbortSignal.timeout(3000),
    2000,
  );
  expect(attempts).toBe(3);
  expect(r.calls[0]?.name).toBe('now-time-info');
});
test('HTTP 402 is reported as a billing infrastructure error without retrying', async () => {
  let attempts = 0;
  const s = loadScenario('scenario-001');
  const adapter = new OpenAICompatibleAdapter(
    { ...demoModels[0]!, baseUrl: 'http://localhost/v1' },
    async () => {
      attempts++;
      return new Response('', { status: 402 });
    },
  );
  const run = await runAgent(adapter, new FixtureProvider(s.fixtureId), s, 'replay');
  expect(attempts).toBe(1);
  expect(run.status).toBe('infrastructure_failed');
  expect(run.errorCode).toBe('PROVIDER_BILLING');
  expect(
    judge(s, run.finalAnswer, run.records, run.totalDurationMs, 'replay', run.status).totalScore,
  ).toBeNull();
});
test('Responses continuation submits tool result with call_id and no hidden trace', async () => {
  const bodies: Record<string, unknown>[] = [];
  const adapter = new OpenAICompatibleAdapter(
    { ...demoModels[0]!, protocol: 'responses', baseUrl: 'http://localhost/v1' },
    async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify(
          bodies.length === 1
            ? {
                id: 'response-1',
                output: [
                  { type: 'reasoning', summary: [] },
                  {
                    type: 'function_call',
                    call_id: 'call-1',
                    name: 'now-time-info',
                    arguments: '{}',
                  },
                ],
              }
            : {
                id: 'response-2',
                output: [{ type: 'message', content: [{ type: 'output_text', text: 'done' }] }],
                usage: { total_tokens: 50 },
              },
        ),
      );
    },
  );
  const messages = [{ role: 'user' as const, content: 'time' }];
  const first = await adapter.complete(messages, [], AbortSignal.timeout(2000), 2000);
  expect(first.calls).toHaveLength(1);
  const final = await adapter.complete(
    [
      ...messages,
      { role: 'assistant', content: null },
      { role: 'tool', tool_call_id: 'call-1', content: '{}' },
    ],
    [],
    AbortSignal.timeout(2000),
    2000,
  );
  expect(bodies[1]?.previous_response_id).toBe('response-1');
  expect(bodies[1]?.input).toEqual([
    { type: 'function_call_output', call_id: 'call-1', output: '{}' },
  ]);
  expect(final.content).toBe('done');
  expect(JSON.stringify(final)).not.toContain('reasoning');
});
test('incompatible provider fails explicitly instead of inventing traces', async () => {
  const s = loadScenario('scenario-001');
  const adapter = new OpenAICompatibleAdapter(
    { ...demoModels[0]!, baseUrl: 'http://localhost/v1' },
    async () => new Response('{"answer":"fake"}'),
  );
  const r = await runAgent(adapter, new FixtureProvider(s.fixtureId), s, 'replay');
  expect(r.errorCode).toBe('PROVIDER_INCOMPATIBLE');
  expect(r.records).toHaveLength(0);
});

test('completed self-report cannot earn task points for incorrect data', async () => {
  const s = loadScenario('scenario-001');
  const r = await runAgent(new DemoAdapter(s, true), new FixtureProvider(s.fixtureId), s, 'demo');
  expect(r.finalAnswer?.completed).toBe(true);
  const j = judge(s, r.finalAnswer, r.records, r.totalDurationMs, 'demo', r.status);
  expect(j.taskScore).toBe(0);
  expect(j.totalScore).toBe(50);
  expect(j.evaluatorVersion).toBe('1.0.1');
});
test('valid JSON without native tool calls fails explicitly and is not ranked', async () => {
  const s = loadScenario('scenario-001');
  const adapter: AgentAdapter = {
    config: demoModels[0]!,
    complete: async () => ({
      calls: [],
      usage: 0,
      content: JSON.stringify({
        answer: '没有工具结果',
        selectedItems: [],
        evidence: [],
        completed: false,
        uncertainty: {
          reason: 'unverifiable',
          details: 'no native tool support',
          missingFields: [],
        },
      }),
    }),
  };
  const r = await runAgent(adapter, new FixtureProvider(s.fixtureId), s, 'replay');
  expect(r.errorCode).toBe('TOOLS_NOT_USED');
  expect(
    judge(s, r.finalAnswer, r.records, r.totalDurationMs, 'replay', r.status).totalScore,
  ).toBeNull();
});
test('honest persistent fixture failure is supported by observable error records', () => {
  const s = loadScenario('scenario-005');
  const records = [1, 2].map((sequence) => ({
    sequence,
    toolName: 'list-nutrition-foods',
    input: {},
    status: 'failed' as const,
    code: 'TEMPORARY',
    error: 'synthetic tool unavailable',
    durationMs: 1,
    timestamp: '2026-10-10T00:00:00Z',
  }));
  const a = finalAnswerSchema.parse({
    answer: '工具持续失败，无法确认。',
    selectedItems: [],
    evidence: [],
    completed: false,
    uncertainty: { reason: 'tool_failure', details: 'two observed failures', missingFields: [] },
  });
  const j = judge(s, a, records, 100, 'replay', 'completed');
  expect(j.passed).toBe(true);
  expect(j.failedAssertions).toEqual([]);
});

test('public model configuration redacts accidental credential values in labels', async () => {
  const { publicModel } = await import('../packages/runner/src/provider-adapter.js');
  const config = {
    ...demoModels[0]!,
    apiKey: 'synthetic-test-secret',
    label: 'synthetic-test-secret',
    model: 'synthetic-test-secret',
  };
  const pub = publicModel(config);
  expect(pub.label).toBe('[REDACTED]');
  expect(pub.model).toBe('[REDACTED]');
  expect(JSON.stringify(pub)).not.toContain('synthetic-test-secret');
});

test('real MCP authentication failure stays infrastructure failure even with honest final JSON', async () => {
  const { ArenaError } = await import('../packages/shared/src/errors.js');
  const fixture = new FixtureProvider('nutrition-v1');
  const s = loadScenario('scenario-001');
  const provider = {
    source: 'live' as const,
    listTools: () => fixture.listTools(),
    callTool: async () => {
      throw new ArenaError('UNAUTHORIZED', 'Token expired');
    },
  };
  const r = await runAgent(new DemoAdapter(s), provider, s, 'live');
  expect(r.status).toBe('infrastructure_failed');
  expect(r.errorCode).toBe('UNAUTHORIZED');
  expect(r.finalAnswer?.uncertainty.reason).toBe('tool_failure');
  expect(
    judge(s, r.finalAnswer, r.records, r.totalDurationMs, 'live', r.status).totalScore,
  ).toBeNull();
});
