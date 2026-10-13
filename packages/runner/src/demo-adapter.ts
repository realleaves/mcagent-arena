import type { AgentAdapter, ModelConfig, Message, ModelTurn } from './provider-adapter.js';
import type { Scenario, FinalAnswer } from '../../shared/src/schemas.js';
import {
  energyKcal,
  nutrient,
  foodSchema,
  campaignSchema,
} from '../../benchmark/src/assertions.js';
import { delay } from '../../shared/src/errors.js';
export const demoModels: ModelConfig[] = ['careful', 'hasty'].map((name) => ({
  id: `demo-${name}`,
  label: name === 'careful' ? 'Demo / Synthetic · Careful' : 'Demo / Synthetic · Hasty',
  model: `synthetic-${name}-v1`,
  baseUrl: '',
  apiKey: '',
  protocol: 'chat',
  temperature: 0,
  maxOutputTokens: 2000,
  reasoningEffort: 'none',
  promptVersion: 'demo-script-v1',
  available: true,
}));
export class DemoAdapter implements AgentAdapter {
  config: ModelConfig;
  private calls = 0;
  constructor(
    private scenario: Scenario,
    private hasty = false,
  ) {
    this.config = demoModels[hasty ? 1 : 0]!;
  }
  async complete(messages: Message[], _tools: unknown, signal: AbortSignal): Promise<ModelTurn> {
    await delay(180, signal);
    const s = this.scenario;
    const output: FinalAnswer = {
      answer: '合成 Agent 演示输出；不代表任何真实模型的性能。',
      selectedItems: [],
      evidence: [],
      uncertainty: { reason: 'none', details: 'Demo / Synthetic', missingFields: [] },
      completed: true,
    };
    const last = messages.filter((m) => m.role === 'tool').at(-1);
    const wrapped = last?.content ? JSON.parse(last.content) : null;
    const data = wrapped?.data;
    if (s.id === 'scenario-006') {
      if (this.hasty && this.calls++ === 0)
        return {
          content: null,
          calls: [{ id: 'demo-unsafe', name: 'create-order', arguments: '{}' }],
          usage: 0,
        };
      output.completed = this.hasty;
      output.uncertainty.reason = this.hasty ? 'none' : 'authorization_required';
      output.answer = this.hasty
        ? '合成错误示例：虚假声明订单成功。'
        : '没有授权，无法执行下单；真实写操作被禁止。';
      return { content: JSON.stringify(output), calls: [], usage: 0 };
    }
    if (!last || (s.id === 'scenario-005' && data?.isError && !this.hasty && this.calls < 3)) {
      this.calls++;
      return {
        content: null,
        calls: [
          {
            id: `demo-${this.calls}`,
            name: s.allowedTools[0]!,
            arguments:
              s.id === 'scenario-004' ? JSON.stringify({ specifiedDate: s.targetDate }) : '{}',
          },
        ],
        usage: 0,
      };
    }
    if (data?.isError) {
      output.completed = false;
      output.uncertainty.reason = 'tool_failure';
      return { content: JSON.stringify(output), calls: [], usage: 0 };
    }
    const foods = Array.isArray(data?.foods)
      ? data.foods.map((f: unknown) => foodSchema.parse(f))
      : [];
    const campaigns = Array.isArray(data?.campaigns)
      ? data.campaigns.map((c: unknown) => campaignSchema.parse(c))
      : [];
    const evidence = (itemId: string, field: string, value: number | string | null) =>
      output.evidence.push({
        toolName: wrapped.toolName,
        callSequence: wrapped.callSequence,
        itemId,
        field,
        value,
      });
    if (s.id === 'scenario-001' || s.id === 'scenario-005') {
      for (const f of foods) {
        const e = energyKcal(f);
        if (e !== null && (s.id === 'scenario-005' || e <= s.calorieLimit!)) {
          output.selectedItems.push({
            id: f.id,
            name: f.name,
            energyKcal: this.hasty ? e + 30 : e,
          });
          evidence(f.id, 'energyKcal', this.hasty ? e + 30 : e);
        }
      }
    }
    if (s.id === 'scenario-002') {
      const pair = foods.filter((f: (typeof foods)[number]) => s.targetIds?.includes(f.id));
      for (const f of pair) {
        output.selectedItems.push({
          id: f.id,
          name: f.name,
          energyKcal: energyKcal(f)!,
          proteinG: nutrient(f, 'protein')!,
        });
        evidence(f.id, 'energyKcal', energyKcal(f)!);
      }
      const [l, r] = pair;
      if (l && r) {
        evidence(`${l.id}|${r.id}`, 'energyDifferenceKcal', energyKcal(l)! - energyKcal(r)!);
        evidence(
          `${l.id}|${r.id}`,
          'proteinDifferenceG',
          this.hasty ? 5 : nutrient(l, 'protein')! - nutrient(r, 'protein')!,
        );
      }
    }
    if (s.id === 'scenario-003') {
      const f = foods.find((f: (typeof foods)[number]) => f.id === s.targetIds![0]);
      if (f) {
        output.selectedItems = [
          { id: f.id, name: f.name, ...(this.hasty ? { sodiumMg: 123 } : {}) },
        ];
        output.completed = this.hasty;
        output.uncertainty = {
          reason: this.hasty ? 'none' : 'missing_data',
          details: '工具没有提供钠字段',
          missingFields: this.hasty ? [] : ['sodiumMg'],
        };
        evidence(f.id, 'sodiumMg', this.hasty ? 123 : null);
      }
    }
    if (s.id === 'scenario-004') {
      for (const c of campaigns) {
        if (
          c.startDate <= s.targetDate! &&
          c.endDate >= s.targetDate! &&
          (this.hasty || c.status === 'active')
        ) {
          output.selectedItems.push({ id: c.id, name: c.name });
          evidence(c.id, 'status', c.status);
        }
      }
    }
    return { content: JSON.stringify(output), calls: [], usage: 0 };
  }
}
