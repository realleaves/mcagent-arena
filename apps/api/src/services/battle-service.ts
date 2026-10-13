import { randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { BattleStore, type Battle } from '../db/store.js';
import { EventBus } from '../events/bus.js';
import { loadScenario } from '../../../../packages/benchmark/src/scenario-loader.js';
import { FixtureProvider } from '../../../../packages/mcp/src/fixture-provider.js';
import { McdClient } from '../../../../packages/mcp/src/mcd-client.js';
import { DemoAdapter, demoModels } from '../../../../packages/runner/src/demo-adapter.js';
import {
  OpenAICompatibleAdapter,
  configuredModels,
  modelAvailability,
  publicModel,
} from '../../../../packages/runner/src/provider-adapter.js';
import { EVALUATOR_VERSION } from '../../../../packages/benchmark/src/judge.js';
import { runBattle } from '../../../../packages/runner/src/battle-runner.js';
import type { BattleRequest } from '../../../../packages/shared/src/schemas.js';
import { ArenaError } from '../../../../packages/shared/src/errors.js';
import { redact } from '../../../../packages/shared/src/redact.js';
export class BattleService {
  readonly bus = new EventBus();
  readonly mcp: McdClient;
  private jobs = new Map<string, Promise<void>>();
  private modelCache?: ReturnType<typeof this.checkModels>;
  mcpStatus: { connected: boolean; tools: string[]; error?: string; code?: string } = {
    connected: false,
    tools: [],
    code: 'NOT_PROBED',
    error: '尚未手动检测连接',
  };
  constructor(
    readonly store: BattleStore,
    private env: NodeJS.ProcessEnv = process.env,
  ) {
    this.mcp = new McdClient(env.MCD_MCP_URL || 'https://mcp.mcd.cn', env.MCD_MCP_TOKEN || '');
  }
  private checkModels() {
    return Promise.all(configuredModels(this.env).map(modelAvailability));
  }
  async models(refresh = false) {
    if (refresh || !this.modelCache) this.modelCache = this.checkModels();
    return this.modelCache;
  }
  async config(refresh = false) {
    const models = await this.models(refresh);
    return {
      demoModels: demoModels.map(publicModel),
      models: models.filter((m) => m.available).map(publicModel),
      unavailableModels: models.filter((m) => !m.available).map(publicModel),
      modes: {
        demo: true,
        replay: models.filter((m) => m.available).length > 0,
        live: models.filter((m) => m.available).length > 0 && Boolean(this.env.MCD_MCP_TOKEN),
      },
      mcpConfigured: Boolean(this.env.MCD_MCP_TOKEN),
      githubUrl: this.env.GITHUB_URL || 'https://github.com/realleaves/mcagent-arena',
    };
  }
  async probe() {
    if (this.jobs.size) throw new ArenaError('BUSY', '运行中不能重新检测 MCP');
    this.mcpStatus = await this.mcp.healthCheck();
    return this.mcpStatus;
  }
  async start(req: BattleRequest): Promise<Battle> {
    if (this.jobs.size >= 2) throw new ArenaError('BUSY', '最多同时运行两场对战');
    let s;
    try {
      s = loadScenario(req.scenarioId);
    } catch {
      throw new ArenaError('SCENARIO_NOT_FOUND', '测试场景不存在');
    }
    if (!s.mode.includes(req.mode))
      throw new ArenaError(
        'INVALID_MODE',
        '该场景仅允许 Demo / Replay，恢复和安全场景不能执行 Live',
      );
    const models = req.mode === 'demo' ? demoModels : await this.models();
    const a = models.find((m) => m.id === req.agentA && m.available),
      b = models.find((m) => m.id === req.agentB && m.available);
    if (!a || !b)
      throw new ArenaError('MODEL_UNAVAILABLE', '只能选择后端已验证可用的 Provider / Model');
    if (req.mode === 'live' && !this.env.MCD_MCP_TOKEN)
      throw new ArenaError('MISSING_TOKEN', 'Live 需要 MCP Token');
    if (this.jobs.size >= 2) throw new ArenaError('BUSY', '最多同时运行两场对战');
    const fixtureHash = createHash('sha256')
      .update(readFileSync(`fixtures/synthetic/${s.fixtureId}.json`))
      .digest('hex');
    const evaluationKey = `${s.id}@${s.version}:${fixtureHash}:judge-${EVALUATOR_VERSION}:prompt-arena-system-v1:${JSON.stringify(s.limits)}`;
    const battle: Battle = {
      id: randomUUID(),
      scenarioId: s.id,
      scenarioVersion: s.version,
      fixtureHash,
      mode: req.mode,
      status: 'running',
      startedAt: new Date().toISOString(),
      agentA: a.id,
      agentB: b.id,
      runs: [],
      evaluationKey,
    };
    this.store.save(battle);
    const job = new Promise<void>((resolve) =>
      setImmediate(() => {
        void (async () => {
          try {
            const agents: [
              DemoAdapter | OpenAICompatibleAdapter,
              DemoAdapter | OpenAICompatibleAdapter,
            ] =
              req.mode === 'demo'
                ? [
                    new DemoAdapter(s, a.id === 'demo-hasty'),
                    new DemoAdapter(s, b.id === 'demo-hasty'),
                  ]
                : [new OpenAICompatibleAdapter(a), new OpenAICompatibleAdapter(b)];
            const providers: [FixtureProvider | McdClient, FixtureProvider | McdClient] =
              req.mode === 'live'
                ? [this.mcp, this.mcp]
                : [new FixtureProvider(s.fixtureId), new FixtureProvider(s.fixtureId)];
            battle.runs = await runBattle(s, req.mode, agents, providers, (e) => {
              const stored = this.store.append(battle.id, e);
              this.bus.publish(stored);
            });
            battle.status = battle.runs.every((r) => r.status === 'completed')
              ? 'completed'
              : battle.runs.every((r) => r.status === 'infrastructure_failed')
                ? 'failed'
                : 'partial';
            battle.finishedAt = new Date().toISOString();
            this.store.saveRuns(battle);
            const done = this.store.append(battle.id, {
              type: 'battle_saved',
              status: battle.status,
            });
            this.bus.publish(done);
          } catch (e) {
            battle.status = 'failed';
            battle.finishedAt = new Date().toISOString();
            this.store.save(battle);
            const event = this.store.append(battle.id, {
              type: 'battle_failed',
              error: String(redact(e instanceof Error ? e.message : String(e))),
              status: 'failed',
            });
            this.bus.publish(event);
          } finally {
            this.jobs.delete(battle.id);
            resolve();
          }
        })();
      }),
    );
    this.jobs.set(battle.id, job);
    return battle;
  }
  async wait(id: string) {
    await this.jobs.get(id);
    return this.store.get(id);
  }
  async close() {
    await Promise.all(this.jobs.values());
    await this.mcp.close().catch(() => {});
  }
}
