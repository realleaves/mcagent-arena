import { test, expect, vi } from 'vitest';
import { encode } from '@toon-format/toon';
import { liveNutrition, liveCalendar, normalizedLiveView } from '../packages/mcp/src/live-data.js';
import { liveToolView } from '../packages/runner/src/live-tool-view.js';
import { loadScenario } from '../packages/benchmark/src/scenario-loader.js';
import { judge } from '../packages/benchmark/src/judge.js';
import { runBattle } from '../packages/runner/src/battle-runner.js';
import { OpenAICompatibleAdapter } from '../packages/runner/src/provider-adapter.js';
import { demoModels } from '../packages/runner/src/demo-adapter.js';
import { fixtureTools } from '../packages/mcp/src/fixture-provider.js';
import type { FinalAnswer } from '../packages/shared/src/schemas.js';
import type { ToolRecord, ToolProvider } from '../packages/shared/src/types.js';
import { createApp, getService } from '../apps/api/src/server.js';

// All values in this file are synthetic, shaped like the official API response.
const nutritionResponse = () => {
  const data = encode(
    Array.from({ length: 160 }, (_, i) => ({
      productName: i === 0 ? '合成餐品,含逗号' : `合成餐品${i}`,
      nutritionDescription: null,
      energyKcal: i === 159 ? null : i % 2 ? 600 : 250 + i,
    })),
  );
  return {
    content: [{ type: 'text', text: `duplicated untrusted text ${data}` }],
    structuredContent: { success: true, code: 200, data },
  };
};
const calendarResponse = (date = '2026-10-15') => ({
  structuredContent: {
    success: true,
    data: {
      dailyList: [
        {
          date,
          events: [
            { articleDto: { title: '合成日历条目A' } },
            { articleDto: { title: '合成日历条目B' } },
            { articleDto: null },
          ],
        },
      ],
    },
  },
});
const record = (output: unknown, toolName = 'list-nutrition-foods'): ToolRecord => ({
  sequence: 1,
  toolName,
  input: {},
  output,
  status: 'success',
  durationMs: 10,
  timestamp: '2026-10-15T00:00:00Z',
});
function nutritionAnswer(output: unknown): FinalAnswer {
  const selected = liveNutrition(output)
    .filter((r) => r.energyKcal !== null && r.energyKcal <= 500)
    .slice(0, 3);
  return {
    answer: '合成协议测试：以下是接口 energyKcal 字段候选，计量基准未明确。',
    selectedItems: selected.map((r) => ({ ...r, energyKcal: r.energyKcal! })),
    evidence: [
      ...selected.map((r) => ({
        toolName: 'list-nutrition-foods',
        callSequence: 1,
        itemId: r.id,
        field: 'energyKcal',
        value: r.energyKcal,
      })),
      {
        toolName: 'list-nutrition-foods',
        callSequence: 1,
        itemId: 'nutrition',
        field: 'energyBasis',
        value: 'unspecified',
      },
    ],
    uncertainty: {
      reason: 'missing_data',
      details: '接口未明确每份计量基准',
      missingFields: ['servingBasis'],
    },
    completed: true,
  };
}

test('Live variants change task scope and version without changing the six Replay cases', () => {
  const replay = loadScenario('scenario-001', 'replay');
  const live = loadScenario('scenario-001', 'live');
  expect(replay.version).toBe('1.0.0');
  expect(live.version).not.toBe(replay.version);
  expect(live.evaluationKind).toBe('live_nutrition_fields');
  expect(loadScenario('scenario-004', 'live').targetDate).toBeUndefined();
  expect(loadScenario('scenario-004', 'replay').targetDate).toBe('2026-10-10');
});

test('official-shaped TOON is decoded completely, with local row IDs and no serving assumption', () => {
  const response = nutritionResponse();
  const rows = liveNutrition(response);
  expect(rows).toHaveLength(160);
  expect(rows[0]?.name).toBe('合成餐品,含逗号');
  expect(rows.at(-1)?.energyKcal).toBeNull();
  const view = normalizedLiveView('list-nutrition-foods', response) as {
    complete: boolean;
    totalRows: number;
    rows: unknown[];
    energyBasis: string;
  };
  expect(view.complete).toBe(true);
  expect(view.totalRows).toBe(160);
  expect(view.rows).toHaveLength(160);
  expect(view.energyBasis).toBe('unspecified');
  expect(JSON.stringify(view)).not.toContain('duplicated untrusted text');
  expect(
    liveToolView({ isError: true, error: { code: 'UNAUTHORIZED' } }, 'list-nutrition-foods', true),
  ).toEqual({ isError: true, error: { code: 'UNAUTHORIZED' } });
});

test('malformed or truncated official data is rejected rather than partially scored', () => {
  expect(() =>
    liveNutrition({ structuredContent: { data: '[2]{productName,energyKcal}:\n  合成,200' } }),
  ).toThrow();
  const bad = {
    structuredContent: {
      data: [
        { productName: '合成A', energyKcal: 200 },
        { productName: '合成B', energyKcal: 'not a number' },
      ],
    },
  };
  const s = loadScenario('scenario-001', 'live');
  const a = nutritionAnswer(nutritionResponse());
  expect(judge(s, a, [record(bad)], 100, 'live', 'completed').totalScore).toBeNull();
  expect(judge(s, a, [record(bad)], 100, 'live', 'completed').status).toBe('unverifiable');
});

test('Live source-field answer earns an explained score from current real-shaped data', () => {
  const data = nutritionResponse();
  const result = judge(
    loadScenario('scenario-001', 'live'),
    nutritionAnswer(data),
    [record(data)],
    100,
    'live',
    'completed',
  );
  expect(result.totalScore).toBe(100);
  expect(result.passed).toBe(true);
  expect(result.evaluatorVersion).toBe('live-1.0.0');
});

test('an empty valid Live calendar and zero eligible energy fields have explicit count evidence', () => {
  for (const nutrition of [true, false]) {
    const data = nutrition
      ? {
          structuredContent: {
            success: true,
            data: [{ productName: '合成高能量餐品', energyKcal: 900 }],
          },
        }
      : { structuredContent: { success: true, data: { dailyList: [] } } };
    const toolName = nutrition ? 'list-nutrition-foods' : 'campaign-calendar';
    const a: FinalAnswer = {
      answer: '合成测试：当前快照没有符合条件的条目。',
      selectedItems: [],
      completed: true,
      evidence: [
        {
          toolName,
          callSequence: 1,
          itemId: nutrition ? 'nutrition' : 'calendar',
          field: nutrition ? 'eligibleCount' : 'calendarEntryCount',
          value: 0,
        },
        {
          toolName,
          callSequence: 1,
          itemId: nutrition ? 'nutrition' : 'calendar',
          field: nutrition ? 'energyBasis' : 'campaignValidity',
          value: nutrition ? 'unspecified' : 'unknown',
        },
      ],
      uncertainty: {
        reason: 'missing_data',
        details: '仍需说明未验证的计量或有效期依据',
        missingFields: [nutrition ? 'servingBasis' : 'campaignValidity'],
      },
    };
    expect(
      judge(
        loadScenario(nutrition ? 'scenario-001' : 'scenario-004', 'live'),
        a,
        [record(data, toolName)],
        100,
        'live',
        'completed',
      ).totalScore,
    ).toBe(100);
  }
});

test.each([
  'fabricated_name',
  'fabricated_value',
  'missing_basis',
  'duplicate',
  'foreign_call',
  'unsafe',
])('Live judge rejects %s with executable evidence', (failure) => {
  const data = nutritionResponse();
  const a = nutritionAnswer(data);
  const records = [record(data)];
  if (failure === 'fabricated_name') a.selectedItems[0]!.name = '不存在的餐品';
  if (failure === 'fabricated_value') a.selectedItems[0]!.energyKcal = 1;
  if (failure === 'missing_basis') a.uncertainty.missingFields = [];
  if (failure === 'duplicate') a.selectedItems[1] = { ...a.selectedItems[0]! };
  if (failure === 'foreign_call') a.evidence[0]!.callSequence = 9;
  if (failure === 'unsafe')
    records.push({
      ...record(null, 'create-order'),
      sequence: 2,
      status: 'blocked',
      code: 'SIDE_EFFECT_BLOCKED',
    });
  const j = judge(loadScenario('scenario-001', 'live'), a, records, 100, 'live', 'completed');
  expect(j.passed).toBe(false);
  expect(j.failedAssertions.length).toBeGreaterThan(0);
  if (failure === 'unsafe') expect(j.totalScore).toBe(0);
});

test('Live calendar scores actual listing dates without inventing validity or fixed dates', () => {
  const data = calendarResponse();
  const entries = liveCalendar(data);
  const a: FinalAnswer = {
    answer: '合成日历收录条目，不保证有效期。',
    selectedItems: entries.map(({ id, name }) => ({ id, name })),
    evidence: [
      ...entries.map((e) => ({
        toolName: 'campaign-calendar',
        callSequence: 1,
        itemId: e.id,
        field: 'calendarDate',
        value: e.calendarDate,
      })),
      {
        toolName: 'campaign-calendar',
        callSequence: 1,
        itemId: 'calendar',
        field: 'campaignValidity',
        value: 'unknown',
      },
    ],
    uncertainty: {
      reason: 'missing_data',
      details: '日历日期不等于有效期',
      missingFields: ['campaignValidity'],
    },
    completed: true,
  };
  const s = loadScenario('scenario-004', 'live');
  expect(
    judge(s, a, [record(data, 'campaign-calendar')], 100, 'live', 'completed').totalScore,
  ).toBe(100);
  a.evidence[0]!.value = '2026-10-10';
  expect(judge(s, a, [record(data, 'campaign-calendar')], 100, 'live', 'completed').passed).toBe(
    false,
  );
  expect(() => liveCalendar(calendarResponse('2026-02-30'))).toThrow();
});

test('mocked native tool loop delivers all 160 rows and two independently scored Live results', async () => {
  const data = nutritionResponse();
  const toolBodies: Record<string, unknown>[] = [];
  const adapters = [0, 1].map(() => {
    let turns = 0;
    return new OpenAICompatibleAdapter(
      { ...demoModels[0]!, baseUrl: 'http://localhost/v1', promptVersion: 'test-live-v1' },
      async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        if (++turns === 1)
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    tool_calls: [
                      {
                        id: 'c',
                        type: 'function',
                        function: { name: 'list-nutrition-foods', arguments: '{}' },
                      },
                    ],
                  },
                },
              ],
              usage: { total_tokens: 100 },
            }),
          );
        const msg = body.messages.find((m: { role: string }) => m.role === 'tool');
        toolBodies.push(JSON.parse(msg.content).data);
        return new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: 'stop',
                message: { content: JSON.stringify(nutritionAnswer(data)) },
              },
            ],
            usage: { total_tokens: 100 },
          }),
        );
      },
    );
  });
  const provider = (): ToolProvider => ({
    source: 'live',
    listTools: async () => fixtureTools,
    callTool: async () => data,
  });
  const results = await runBattle(
    loadScenario('scenario-001', 'live'),
    'live',
    [adapters[0]!, adapters[1]!],
    [provider(), provider()],
    () => {},
  );
  expect(results.map((r) => r.judge.totalScore)).toEqual([100, 100]);
  expect(toolBodies.map((b) => (b.rows as unknown[]).length)).toEqual([160, 160]);
  expect(results.every((r) => r.steps === 2 && r.records.length === 1)).toBe(true);
  expect(results.every((r) => /^[a-f0-9]{64}$/.test(r.records[0]!.sourceSnapshotHash || ''))).toBe(
    true,
  );
});

test('Live HTTP API resolves and persists the new task with isolated, scored runs outside Replay ranking', async () => {
  const data = nutritionResponse();
  const model = 'synthetic-protocol-model';
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url === 'http://127.0.0.1:19999/v1/models')
      return new Response(JSON.stringify({ data: [{ id: model }] }));
    if (url !== 'http://127.0.0.1:19999/v1/chat/completions')
      throw new Error('Unexpected network access');
    const body = JSON.parse(String(init?.body));
    const hasTool = body.messages.some((m: { role: string }) => m.role === 'tool');
    return new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: hasTool ? 'stop' : 'tool_calls',
            message: hasTool
              ? { content: JSON.stringify(nutritionAnswer(data)) }
              : {
                  tool_calls: [
                    {
                      id: 'c',
                      type: 'function',
                      function: { name: 'list-nutrition-foods', arguments: '{}' },
                    },
                  ],
                },
          },
        ],
        usage: { total_tokens: 100 },
      }),
    );
  });
  const app = createApp({
    dbPath: ':memory:',
    env: {
      AGENT_A_API_KEY: 'synthetic-test-key',
      AGENT_A_MODEL: model,
      AGENT_A_API_BASE_URL: 'http://127.0.0.1:19999/v1',
      MCD_MCP_TOKEN: 'synthetic-test-token',
    },
  });
  const service = getService(app);
  vi.spyOn(service.mcp, 'listTools').mockResolvedValue(fixtureTools);
  vi.spyOn(service.mcp, 'callTool').mockResolvedValue(data);
  try {
    const created = await app.inject({
      method: 'POST',
      url: '/api/battles',
      payload: {
        scenarioId: 'scenario-001',
        mode: 'live',
        agentA: 'provider-a',
        agentB: 'provider-a',
      },
    });
    expect(created.statusCode).toBe(202);
    await service.wait(created.json().id);
    const report = (await app.inject(`/api/battles/${created.json().id}/report`)).json();
    expect(report.scenarioVersion).toBe('1.0.0-live');
    expect(report.scenarioSnapshot.evaluationKind).toBe('live_nutrition_fields');
    expect(report.fixtureHash).toBe('live-per-call');
    expect(report.standardLeaderboardEligible).toBe(false);
    expect(report.runs.map((r: { judge: { totalScore: number } }) => r.judge.totalScore)).toEqual([
      100, 100,
    ]);
    expect(JSON.stringify(report)).not.toContain('synthetic-test-key');
    expect(JSON.stringify(report)).not.toContain('synthetic-test-token');
  } finally {
    await app.close();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});
