import type { Scenario, Mode } from '../../shared/src/schemas.js';
import type { Emit, ToolProvider } from '../../shared/src/types.js';
import type { AgentAdapter } from './provider-adapter.js';
import { runAgent } from './agent-runner.js';
import { judge } from '../../benchmark/src/judge.js';
export async function runBattle(
  scenario: Scenario,
  mode: Mode,
  agents: [AgentAdapter, AgentAdapter],
  providers: [ToolProvider, ToolProvider],
  emit: Emit,
) {
  emit({ type: 'battle_started', mode, scenarioId: scenario.id });
  const results = await Promise.all(
    agents.map(async (agent, index) => {
      const slot = index === 0 ? 'A' : 'B';
      const localEmit: Emit = (e) => emit({ ...e, agentSlot: slot });
      const result = await runAgent(agent, providers[index]!, scenario, mode, localEmit);
      const score = judge(
        scenario,
        result.finalAnswer,
        result.records,
        result.totalDurationMs,
        mode,
        result.status,
      );
      localEmit({ type: 'judge_completed', score, status: score.status });
      return {
        agentSlot: slot,
        providerId: agent.config.id,
        modelId: agent.config.model,
        ...result,
        judge: score,
      };
    }),
  );
  emit({
    type: results.every((r) => r.status === 'infrastructure_failed')
      ? 'battle_failed'
      : 'battle_completed',
    status: results.some((r) => r.status !== 'completed') ? 'partial' : 'completed',
  });
  return results;
}
export type BattleAgentRun = Awaited<ReturnType<typeof runBattle>>[number];
