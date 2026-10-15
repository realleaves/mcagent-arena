import { test, expect } from 'vitest';
import { loadScenario } from '../packages/benchmark/src/scenario-loader.js';
import { judge } from '../packages/benchmark/src/judge.js';
import { fixtureTools } from '../packages/mcp/src/fixture-provider.js';
import type { ToolProvider } from '../packages/shared/src/types.js';
import { runAgent } from '../packages/runner/src/agent-runner.js';
import { demoModels } from '../packages/runner/src/demo-adapter.js';
import type { AgentAdapter, Message } from '../packages/runner/src/provider-adapter.js';

test('Live model receives a bounded excerpt while the trace retains the real tool result', async () => {
  const s = loadScenario('scenario-001');
  const rows = Array.from({ length: 160 }, (_, i) => `餐品${i},null,1000,240,12,10,20,400,30`);
  const table = `[160]{productName,nutritionDescription,energyKj,energyKcal,protein,fat,carbohydrate,sodium,calcium}:\n${rows.join('\n')}`;
  const response = {
    content: [{ type: 'text', text: `# API Response Information\n${table}` }],
    structuredContent: { success: true, code: 200, data: table },
  };
  const provider: ToolProvider = {
    source: 'live',
    listTools: async () => fixtureTools,
    callTool: async () => response,
  };
  let toolMessage = '';
  let turns = 0;
  const adapter: AgentAdapter = {
    config: demoModels[0]!,
    complete: async (messages: Message[]) => {
      if (++turns === 1)
        return {
          content: null,
          calls: [{ id: 'call-1', name: 'list-nutrition-foods', arguments: '{}' }],
          usage: 100,
        };
      toolMessage = messages.find((m) => m.role === 'tool')?.content || '';
      return {
        calls: [],
        usage: 100,
        content: JSON.stringify({
          answer: '实时结果缺少明确每份计量依据，且只收到部分列表，无法完整筛选。',
          selectedItems: [],
          evidence: [],
          uncertainty: {
            reason: 'unverifiable',
            details: '每份计量依据和完整列表均不可验证',
            missingFields: ['servingBasis', 'completeRows'],
          },
          completed: false,
        }),
      };
    },
  };
  const run = await runAgent(adapter, provider, s, 'live');
  expect(run.status).toBe('completed');
  expect(JSON.stringify(run.records[0]?.output).length).toBeGreaterThan(9000);
  expect(toolMessage.length).toBeLessThan(2400);
  expect(toolMessage).toContain('"truncated":true');
  expect(toolMessage).not.toContain('API Response Information');
  expect(
    judge(s, run.finalAnswer, run.records, run.totalDurationMs, 'live', run.status).status,
  ).toBe('unverifiable');
});
