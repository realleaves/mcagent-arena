import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { battleRequestSchema } from '../../../../packages/shared/src/schemas.js';
import { loadScenarios } from '../../../../packages/benchmark/src/scenario-loader.js';
import { asError } from '../../../../packages/shared/src/errors.js';
import type { BattleService } from '../services/battle-service.js';
export function registerRoutes(app: FastifyInstance, service: BattleService) {
  app.get('/api/health', async () => ({ status: 'ok', name: 'McAgent Arena', version: '1.0.0' }));
  app.get('/api/config', async (req) =>
    service.config((req.query as { refresh?: string }).refresh === '1'),
  );
  app.get('/api/scenarios', async () => loadScenarios());
  app.get('/api/mcp/status', async () => service.mcpStatus);
  app.post('/api/mcp/probe', async (_req, reply) => {
    const s = await service.probe();
    return reply.code(s.connected ? 200 : 503).send(s);
  });
  app.post('/api/battles', async (req, reply) => {
    const parsed = battleRequestSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ error: 'INVALID_REQUEST', details: parsed.error.flatten() });
    try {
      const battle = await service.start(parsed.data);
      return reply.code(202).send(battle);
    } catch (e) {
      const err = asError(e);
      return reply
        .code(err.code === 'BUSY' ? 429 : 400)
        .send({ error: err.code, message: err.message });
    }
  });
  app.get('/api/battles', async () => service.store.list());
  const id = (params: unknown) => z.object({ id: z.string().uuid() }).parse(params).id;
  app.get('/api/battles/:id', async (req, reply) => {
    const battle = service.store.get(id(req.params));
    if (!battle) return reply.code(404).send({ error: 'NOT_FOUND' });
    return { ...battle, events: service.store.events(battle.id) };
  });
  app.get('/api/battles/:id/report', async (req, reply) => {
    const battle = service.store.get(id(req.params));
    if (!battle) return reply.code(404).send({ error: 'NOT_FOUND' });
    reply.header('Content-Disposition', `attachment; filename="mcagent-${battle.id}.json"`);
    return {
      reportVersion: '1.0.0',
      ...battle,
      events: service.store.events(battle.id),
      standardLeaderboardEligible:
        battle.mode === 'replay' &&
        battle.status === 'completed' &&
        battle.runs.every((r) => r.judge.status === 'scored'),
      notice:
        battle.mode === 'demo'
          ? 'Demo / Synthetic：预定义合成 Agent，不代表真实模型性能。'
          : battle.mode === 'live'
            ? 'Live MCP：实时条件，不进入固定 Fixture 排行榜。'
            : 'Replay：真实模型，固定合成工具数据；LLM 输出并非绝对可复现。',
    };
  });
  app.get('/api/battles/:id/events', async (req, reply) => {
    const battleId = id(req.params);
    const battle = service.store.get(battleId);
    if (!battle) return reply.code(404).send({ error: 'NOT_FOUND' });
    const header = req.headers['last-event-id'];
    const after = Number(header || 0);
    if (!Number.isSafeInteger(after) || after < 0)
      return reply.code(400).send({ error: 'INVALID_EVENT_ID' });
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const send = (event: ReturnType<typeof service.store.events>[number]) => {
      if (!reply.raw.destroyed)
        reply.raw.write(
          `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
        );
    };
    const unsubscribe = service.bus.subscribe(battleId, send);
    service.store.events(battleId, after).forEach(send);
    const timer = setInterval(() => {
      if (!reply.raw.destroyed) reply.raw.write(': heartbeat\n\n');
    }, 15000);
    reply.raw.on('close', () => {
      clearInterval(timer);
      unsubscribe();
    });
    if (battle.status !== 'running') reply.raw.end();
  });
}
