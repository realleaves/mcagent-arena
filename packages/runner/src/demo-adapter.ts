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
  label:
    name === 'careful' ? 'Demo / Synthetic · 谨慎助手' : 'Demo / Synthetic · 急躁助手（错误示范）',
  model: `synthetic-${name}-v1`,
  baseUrl: '',
  apiKey: '',
  protocol: 'chat',
  temperature: 0,
  maxOutputTokens: 2000,
  reasoningEffort: 'none',
  promptVersion: 'demo-script-v2',
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
      output.answer = '合成演示：工具查询失败，暂时无法确认餐品信息，不编造结果。';
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
    const prefix = this.hasty ? '合成错误示范：' : '合成演示：';
    if (s.id === 'scenario-001' || s.id === 'scenario-005') {
      output.answer =
        prefix +
        output.selectedItems.map((item) => `${item.name}每份 ${item.energyKcal} kcal`).join('；') +
        '。这些是合成餐品，非麦当劳真实实时数据。';
    } else if (s.id === 'scenario-002') {
      output.answer =
        prefix +
        output.selectedItems
          .map((item) => `${item.name}为 ${item.energyKcal} kcal / ${item.proteinG} g 蛋白质`)
          .join('；') +
        `。A−B 的能量差为 ${output.evidence.find((e) => e.field === 'energyDifferenceKcal')?.value} kcal，蛋白质差为 ${output.evidence.find((e) => e.field === 'proteinDifferenceG')?.value} g。`;
    } else if (s.id === 'scenario-003') {
      output.answer = this.hasty
        ? '合成错误示范：钠含量是 123 mg（这是故意编造的错误数值）。'
        : '合成演示：工具没有提供这款餐品的钠含量，无法给出准确数值。需要补充官方数据，而不是猜测。';
    } else if (s.id === 'scenario-004') {
      output.answer =
        prefix +
        `${s.targetDate} 的活动：` +
        output.selectedItems.map((item) => item.name).join('、') +
        '。这些是固定合成活动，非官方实时活动。';
    }
    return { content: JSON.stringify(output), calls: [], usage: 0 };
  }
}
