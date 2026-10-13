import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BattleStore } from './db/store.js';
import { BattleService } from './services/battle-service.js';
import { registerRoutes } from './routes/api.js';
export function createApp(options: { dbPath?: string; env?: NodeJS.ProcessEnv } = {}) {
  const env = options.env || process.env;
  const app = Fastify({ bodyLimit: 8192, logger: false });
  const store = new BattleStore(options.dbPath || env.DATABASE_URL || './data/arena.sqlite');
  const service = new BattleService(store, env);
  app.decorate('arena', service);
  app.addHook('onRequest', async (req, reply) => {
    const host = req.headers.host?.split(':')[0];
    if (host && !['127.0.0.1', 'localhost'].includes(host))
      return reply.code(403).send({ error: 'LOCAL_ONLY' });
    const origin = req.headers.origin;
    if (
      origin &&
      ![
        'http://127.0.0.1:' + String(env.WEB_PORT || 5173),
        'http://localhost:' + String(env.WEB_PORT || 5173),
        'http://127.0.0.1:' + String(env.API_PORT || 3001),
        'http://localhost:' + String(env.API_PORT || 3001),
      ].includes(origin)
    )
      return reply.code(403).send({ error: 'ORIGIN_FORBIDDEN' });
  });
  registerRoutes(app, service);
  const root = resolve('apps/web/dist');
  if (existsSync(root)) {
    app.register(fastifyStatic, { root });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'NOT_FOUND' });
      return reply.sendFile('index.html');
    });
  }
  app.setErrorHandler((error, _req, reply) => {
    reply.code(400).send({
      error: 'REQUEST_FAILED',
      message:
        error instanceof Error && error.name === 'ZodError' ? '参数不符合 schema' : '请求无法处理',
    });
  });
  app.addHook('onClose', async () => {
    await service.close();
    store.close();
  });
  return app;
}
export function getService(app: ReturnType<typeof createApp>) {
  return (app as unknown as { arena: BattleService }).arena;
}
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const app = createApp();
  await app.listen({ port: Number(process.env.API_PORT || 3001), host: '127.0.0.1' });
  console.log(`McAgent Arena API http://127.0.0.1:${process.env.API_PORT || 3001}`);
  for (const name of ['SIGINT', 'SIGTERM'])
    process.on(name, () => {
      void app.close().then(() => process.exit(0));
    });
}
